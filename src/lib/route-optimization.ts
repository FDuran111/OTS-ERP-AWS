import { query } from '@/lib/db'

export interface JobLocation {
  jobId: string
  address: string
  latitude: number
  longitude: number
  estimatedDuration: number // minutes
  priority: number // 1-5, 5 being highest
  timeWindow?: {
    earliest: string // HH:MM
    latest: string // HH:MM
  }
  jobType: string
  complexity: string
  requiredSkills?: string[]
}

export interface Vehicle {
  id: string
  vehicleNumber: string
  vehicleName: string
  capacity: number
  homeBaseLat: number
  homeBaseLng: number
  hourlyOperatingCost: number
  mileageRate: number
}

export interface RouteOptimizationSettings {
  maxStopsPerRoute: number
  maxRouteHours: number // minutes
  maxRouteDistance: number // miles
  breakDuration: number // minutes
  lunchBreakDuration: number // minutes
  travelBufferPercent: number
  trafficMultiplier: number
  priorityWeighting: number
  distanceWeight: number
  timeWeight: number
  costWeight: number
  allowOvertimeRoutes: boolean
}

export interface OptimizedRoute {
  vehicleId: string
  stops: OptimizedStop[]
  totalDistance: number
  totalDuration: number
  totalCost: number
  optimizationScore: number
  startTime: string
  endTime: string
}

export interface OptimizedStop {
  jobId: string
  stopOrder: number
  address: string
  latitude: number
  longitude: number
  estimatedArrival: string
  estimatedDeparture: string
  estimatedDuration: number
  travelTimeFromPrevious: number
  distanceFromPrevious: number
}

export class RouteOptimizer {
  private settings: RouteOptimizationSettings

  constructor(settings?: Partial<RouteOptimizationSettings>) {
    this.settings = {
      maxStopsPerRoute: 8,
      maxRouteHours: 480, // 8 hours
      maxRouteDistance: 100,
      breakDuration: 30,
      lunchBreakDuration: 60,
      travelBufferPercent: 15,
      trafficMultiplier: 1.3,
      priorityWeighting: 2.0,
      distanceWeight: 0.4,
      timeWeight: 0.4,
      costWeight: 0.2,
      allowOvertimeRoutes: false,
      ...settings
    }
  }

  /**
   * Main optimization function - creates optimized routes for given jobs and vehicles
   */
  async optimizeRoutes(
    jobs: JobLocation[],
    vehicles: Vehicle[],
    routeDate: string,
    startTime: string = '08:00'
  ): Promise<OptimizedRoute[]> {
    // Sort jobs by priority and time constraints
    const sortedJobs = this.prioritizeJobs(jobs)
    
    // Group jobs by service area to reduce travel time
    const jobClusters = await this.clusterJobsByArea(sortedJobs)
    
    const optimizedRoutes: OptimizedRoute[] = []
    const assignedJobs = new Set<string>()

    for (const vehicle of vehicles) {
      for (const cluster of jobClusters) {
        const availableJobs = cluster.filter(job => !assignedJobs.has(job.jobId))
        
        if (availableJobs.length === 0) continue

        const route = await this.createOptimalRoute(
          vehicle,
          availableJobs,
          routeDate,
          startTime
        )

        if (route && route.stops.length > 0) {
          optimizedRoutes.push(route)
          
          // Mark jobs as assigned
          route.stops.forEach(stop => assignedJobs.add(stop.jobId))
        }
      }
    }

    return optimizedRoutes
  }

  /**
   * Create an optimal route for a specific vehicle and job set
   */
  private async createOptimalRoute(
    vehicle: Vehicle,
    jobs: JobLocation[],
    routeDate: string,
    startTime: string
  ): Promise<OptimizedRoute | null> {
    if (jobs.length === 0) return null

    // Apply capacity constraints
    const feasibleJobs = jobs.slice(0, Math.min(jobs.length, this.settings.maxStopsPerRoute))
    
    // Start from vehicle's home base
    const homeBase = {
      latitude: vehicle.homeBaseLat,
      longitude: vehicle.homeBaseLng,
      address: 'Home Base'
    }

    // Find optimal sequence using nearest neighbor with improvements
    let bestRoute = await this.nearestNeighborTSP(homeBase, feasibleJobs, vehicle)
    
    // Try to improve with 2-opt optimization
    bestRoute = await this.twoOptImprovement(bestRoute, vehicle)
    
    // Validate route constraints
    if (!this.validateRouteConstraints(bestRoute)) {
      // Try with fewer jobs if constraints are violated
      const reducedJobs = feasibleJobs.slice(0, Math.floor(feasibleJobs.length * 0.75))
      if (reducedJobs.length > 0) {
        return this.createOptimalRoute(vehicle, reducedJobs, routeDate, startTime)
      }
      return null
    }

    // Calculate times and build final route
    return this.buildTimedRoute(vehicle, bestRoute, routeDate, startTime)
  }

  /**
   * Nearest Neighbor algorithm with distance and priority weighting
   */
  private async nearestNeighborTSP(
    start: { latitude: number; longitude: number; address: string },
    jobs: JobLocation[],
    vehicle: Vehicle
  ): Promise<JobLocation[]> {
    const unvisited = [...jobs]
    const route: JobLocation[] = []
    let currentLocation = start

    while (unvisited.length > 0) {
      let bestJob: JobLocation | null = null
      let bestScore = Infinity

      for (const job of unvisited) {
        const distance = this.calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          job.latitude,
          job.longitude
        )

        // Calculate composite score (lower is better)
        const priorityFactor = (6 - job.priority) * this.settings.priorityWeighting
        const distanceFactor = distance * this.settings.distanceWeight
        const score = distanceFactor + priorityFactor

        if (score < bestScore) {
          bestScore = score
          bestJob = job
        }
      }

      if (bestJob) {
        route.push(bestJob)
        unvisited.splice(unvisited.indexOf(bestJob), 1)
        currentLocation = bestJob
      }
    }

    return route
  }

  /**
   * 2-opt improvement algorithm to optimize route order
   */
  private async twoOptImprovement(
    route: JobLocation[],
    vehicle: Vehicle
  ): Promise<JobLocation[]> {
    if (route.length < 4) return route

    let improved = true
    let currentRoute = [...route]

    while (improved) {
      improved = false

      for (let i = 1; i < currentRoute.length - 2; i++) {
        for (let j = i + 1; j < currentRoute.length; j++) {
          if (j - i === 1) continue // Skip adjacent swaps

          const newRoute = [...currentRoute]
          // Reverse the segment between i and j
          const segment = newRoute.slice(i, j + 1).reverse()
          newRoute.splice(i, j - i + 1, ...segment)

          const currentDistance = await this.calculateRouteDistance(currentRoute, vehicle)
          const newDistance = await this.calculateRouteDistance(newRoute, vehicle)

          if (newDistance < currentDistance) {
            currentRoute = newRoute
            improved = true
          }
        }
      }
    }

    return currentRoute
  }

  /**
   * Calculate total distance for a route
   */
  private async calculateRouteDistance(
    route: JobLocation[],
    vehicle: Vehicle
  ): Promise<number> {
    if (route.length === 0) return 0

    let totalDistance = 0
    let prevLat = vehicle.homeBaseLat
    let prevLng = vehicle.homeBaseLng

    for (const job of route) {
      const distance = this.calculateDistance(prevLat, prevLng, job.latitude, job.longitude)
      totalDistance += distance
      prevLat = job.latitude
      prevLng = job.longitude
    }

    // Add return to base
    totalDistance += this.calculateDistance(
      prevLat,
      prevLng,
      vehicle.homeBaseLat,
      vehicle.homeBaseLng
    )

    return totalDistance
  }

  /**
   * Build timed route with arrival/departure times
   */
  private async buildTimedRoute(
    vehicle: Vehicle,
    jobs: JobLocation[],
    routeDate: string,
    startTime: string
  ): Promise<OptimizedRoute> {
    const stops: OptimizedStop[] = []
    let currentTime = this.parseTime(startTime)
    let currentLat = vehicle.homeBaseLat
    let currentLng = vehicle.homeBaseLng
    let totalDistance = 0
    let totalCost = 0

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i]
      
      // Get travel time to this job
      const travelInfo = await this.getTravelTime(
        currentLat,
        currentLng,
        job.latitude,
        job.longitude
      )

      const travelTimeWithBuffer = Math.round(
        travelInfo.duration * this.settings.trafficMultiplier * (1 + this.settings.travelBufferPercent / 100)
      )

      // Calculate arrival time
      currentTime += travelTimeWithBuffer
      const arrivalTime = this.formatTime(currentTime)

      // Add lunch break if it's around noon and route is long enough
      if (currentTime >= 720 && currentTime <= 780 && i > jobs.length / 2) { // 12:00-13:00
        currentTime += this.settings.lunchBreakDuration
      }

      // Calculate departure time
      const departureTime = this.formatTime(currentTime + job.estimatedDuration)

      stops.push({
        jobId: job.jobId,
        stopOrder: i + 1,
        address: job.address,
        latitude: job.latitude,
        longitude: job.longitude,
        estimatedArrival: arrivalTime,
        estimatedDeparture: departureTime,
        estimatedDuration: job.estimatedDuration,
        travelTimeFromPrevious: travelTimeWithBuffer,
        distanceFromPrevious: travelInfo.distance
      })

      // Update for next iteration
      currentTime += job.estimatedDuration
      currentLat = job.latitude
      currentLng = job.longitude
      totalDistance += travelInfo.distance
      totalCost += (travelInfo.distance * vehicle.mileageRate) + 
                   ((travelTimeWithBuffer + job.estimatedDuration) / 60 * vehicle.hourlyOperatingCost)
    }

    // Add return trip to base
    const returnInfo = await this.getTravelTime(
      currentLat,
      currentLng,
      vehicle.homeBaseLat,
      vehicle.homeBaseLng
    )
    totalDistance += returnInfo.distance
    currentTime += Math.round(returnInfo.duration * this.settings.trafficMultiplier)

    return {
      vehicleId: vehicle.id,
      stops,
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalDuration: currentTime - this.parseTime(startTime),
      totalCost: Math.round(totalCost * 100) / 100,
      optimizationScore: this.calculateOptimizationScore(stops, totalDistance, currentTime - this.parseTime(startTime)),
      startTime,
      endTime: this.formatTime(currentTime)
    }
  }

  /**
   * Validate route against constraints
   */
  private validateRouteConstraints(route: JobLocation[]): boolean {
    if (route.length > this.settings.maxStopsPerRoute) return false
    
    // Calculate total estimated time
    const totalJobTime = route.reduce((sum, job) => sum + job.estimatedDuration, 0)
    const estimatedTravelTime = route.length * 30 // Rough estimate
    const totalTime = totalJobTime + estimatedTravelTime

    if (totalTime > this.settings.maxRouteHours && !this.settings.allowOvertimeRoutes) {
      return false
    }

    return true
  }

  /**
   * Calculate optimization score (0-100, higher is better)
   */
  private calculateOptimizationScore(
    stops: OptimizedStop[],
    totalDistance: number,
    totalDuration: number
  ): number {
    if (stops.length === 0) return 100

    // Calculate efficiency metrics
    const avgDistancePerStop = totalDistance / stops.length
    const avgTimePerStop = totalDuration / stops.length

    // Score based on efficiency (lower distance/time per stop is better)
    const distanceScore = Math.max(0, 100 - (avgDistancePerStop - 5) * 10) // Penalty after 5 miles avg
    const timeScore = Math.max(0, 100 - (avgTimePerStop - 60) * 2) // Penalty after 60 min avg

    // Combined score with weighting
    const score = (distanceScore * this.settings.distanceWeight) + 
                  (timeScore * this.settings.timeWeight) + 
                  (80 * this.settings.costWeight) // Base cost score

    return Math.round(Math.min(100, Math.max(0, score)))
  }

  /**
   * Prioritize jobs based on priority, time windows, and constraints
   */
  private prioritizeJobs(jobs: JobLocation[]): JobLocation[] {
    return jobs.sort((a, b) => {
      // Primary sort: priority (higher first)
      if (a.priority !== b.priority) {
        return b.priority - a.priority
      }

      // Secondary sort: time window constraints
      if (a.timeWindow && !b.timeWindow) return -1
      if (!a.timeWindow && b.timeWindow) return 1

      // Tertiary sort: complexity (simpler jobs first for efficiency)
      const complexityOrder = { 'SIMPLE': 1, 'STANDARD': 2, 'COMPLEX': 3, 'CRITICAL': 4 }
      const aComplexity = complexityOrder[a.complexity as keyof typeof complexityOrder] || 2
      const bComplexity = complexityOrder[b.complexity as keyof typeof complexityOrder] || 2
      
      return aComplexity - bComplexity
    })
  }

  /**
   * Cluster jobs by geographic area to optimize routing
   */
  private async clusterJobsByArea(jobs: JobLocation[]): Promise<JobLocation[][]> {
    // Simple clustering based on geographic proximity
    const clusters: JobLocation[][] = []
    const processed = new Set<string>()

    for (const job of jobs) {
      if (processed.has(job.jobId)) continue

      const cluster = [job]
      processed.add(job.jobId)

      // Find nearby jobs within reasonable distance
      for (const otherJob of jobs) {
        if (processed.has(otherJob.jobId)) continue

        const distance = this.calculateDistance(
          job.latitude,
          job.longitude,
          otherJob.latitude,
          otherJob.longitude
        )

        // Group jobs within 10 miles
        if (distance <= 10) {
          cluster.push(otherJob)
          processed.add(otherJob.jobId)
        }
      }

      clusters.push(cluster)
    }

    // Sort clusters by total priority
    return clusters.sort((a, b) => {
      const aPriority = a.reduce((sum, job) => sum + job.priority, 0)
      const bPriority = b.reduce((sum, job) => sum + job.priority, 0)
      return bPriority - aPriority
    })
  }

  /**
   * Get travel time between two points (uses database cache)
   */
  private async getTravelTime(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number
  ): Promise<{ distance: number; duration: number }> {
    try {
      const result = await query(`
        SELECT distance, duration 
        FROM get_travel_time($1, $2, $3, $4, 'TRUCK')
      `, [fromLat, fromLng, toLat, toLng])

      return result.rows[0]
    } catch (error) {
      console.error('Error getting travel time:', error)
      // Fallback to simple calculation
      const distance = this.calculateDistance(fromLat, fromLng, toLat, toLng)
      return {
        distance,
        duration: Math.round(distance / 25 * 60) // 25 mph average
      }
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 3959 // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1)
    const dLng = this.toRadians(lng2 - lng1)
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number)
    return hours * 60 + minutes
  }

  private formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }
}

/**
 * Utility functions for route optimization
 */
export class RouteUtils {
  /**
   * Get optimization settings from database
   */
  static async getOptimizationSettings(settingName = 'default'): Promise<RouteOptimizationSettings> {
    try {
      const result = await query(`
        SELECT * FROM "RouteOptimizationSettings" 
        WHERE "settingName" = $1
      `, [settingName])

      if (result.rows.length === 0) {
        throw new Error('Optimization settings not found')
      }

      const settings = result.rows[0]
      return {
        maxStopsPerRoute: settings.maxStopsPerRoute,
        maxRouteHours: settings.maxRouteHours,
        maxRouteDistance: parseFloat(settings.maxRouteDistance),
        breakDuration: settings.breakDuration,
        lunchBreakDuration: settings.lunchBreakDuration,
        travelBufferPercent: parseFloat(settings.travelBufferPercent),
        trafficMultiplier: parseFloat(settings.trafficMultiplier),
        priorityWeighting: parseFloat(settings.priorityWeighting),
        distanceWeight: parseFloat(settings.distanceWeight),
        timeWeight: parseFloat(settings.timeWeight),
        costWeight: parseFloat(settings.costWeight),
        allowOvertimeRoutes: settings.allowOvertimeRoutes
      }
    } catch (error) {
      console.error('Error fetching optimization settings:', error)
      // Return defaults if database fails
      return {
        maxStopsPerRoute: 8,
        maxRouteHours: 480,
        maxRouteDistance: 100,
        breakDuration: 30,
        lunchBreakDuration: 60,
        travelBufferPercent: 15,
        trafficMultiplier: 1.3,
        priorityWeighting: 2.0,
        distanceWeight: 0.4,
        timeWeight: 0.4,
        costWeight: 0.2,
        allowOvertimeRoutes: false
      }
    }
  }

  /**
   * Validate job address and geocode if needed
   */
  static async validateAndGeocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
    // In a real implementation, this would call a geocoding service like Google Maps
    // For now, return mock coordinates for Minneapolis area
    const mockCoordinates = [
      { lat: 44.9778, lng: -93.2650 }, // Minneapolis
      { lat: 44.9537, lng: -93.0900 }, // St. Paul
      { lat: 45.0041, lng: -93.2668 }, // Roseville
      { lat: 44.8831, lng: -93.2289 }, // Burnsville
      { lat: 44.9537, lng: -93.4677 }, // Hopkins
    ]

    const randomCoords = mockCoordinates[Math.floor(Math.random() * mockCoordinates.length)]
    return { latitude: randomCoords.lat, longitude: randomCoords.lng }
  }

  /**
   * Calculate estimated job duration based on type and complexity
   */
  static estimateJobDuration(jobType: string, complexity: string): number {
    const baseMinutes = {
      'SERVICE_CALL': 60,
      'INSTALLATION': 180,
      'MAINTENANCE': 90,
      'REPAIR': 120,
      'INSPECTION': 45,
      'EMERGENCY': 90
    }

    const complexityMultiplier = {
      'SIMPLE': 0.8,
      'STANDARD': 1.0,
      'COMPLEX': 1.5,
      'CRITICAL': 2.0
    }

    const base = baseMinutes[jobType as keyof typeof baseMinutes] || 90
    const multiplier = complexityMultiplier[complexity as keyof typeof complexityMultiplier] || 1.0

    return Math.round(base * multiplier)
  }
}

// Export singleton instance
export const routeOptimizer = new RouteOptimizer()