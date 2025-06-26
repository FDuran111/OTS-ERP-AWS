import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { routeOptimizer, RouteUtils, type JobLocation, type Vehicle } from '@/lib/route-optimization'
import { z } from 'zod'

const optimizationRequestSchema = z.object({
  routeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  vehicleIds: z.array(z.string().uuid()).optional(),
  jobIds: z.array(z.string()).optional(),
  serviceAreaIds: z.array(z.string().uuid()).optional(),
  maxRoutesPerVehicle: z.number().min(1).max(5).optional(),
  optimizationSettings: z.string().optional(),
})

// POST optimize routes for given date and constraints
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = optimizationRequestSchema.parse(body)

    // Get optimization settings
    const settings = await RouteUtils.getOptimizationSettings(data.optimizationSettings)

    // Get available vehicles
    const vehicles = await getAvailableVehicles(data.vehicleIds)
    if (vehicles.length === 0) {
      return NextResponse.json(
        { error: 'No available vehicles found' },
        { status: 400 }
      )
    }

    // Get scheduled jobs for the date
    const jobs = await getScheduledJobs(data.routeDate, data.jobIds, data.serviceAreaIds)
    if (jobs.length === 0) {
      return NextResponse.json(
        { error: 'No jobs scheduled for optimization' },
        { status: 400 }
      )
    }

    // Validate job locations (geocode if needed)
    const validatedJobs = await validateJobLocations(jobs)

    // Initialize route optimizer with custom settings
    const optimizer = new (routeOptimizer.constructor as any)(settings)

    // Optimize routes
    const optimizedRoutes = await optimizer.optimizeRoutes(
      validatedJobs,
      vehicles,
      data.routeDate,
      data.startTime || '08:00'
    )

    // Save optimized routes to database
    const savedRoutes = []
    for (const route of optimizedRoutes) {
      const savedRoute = await saveOptimizedRoute(route, data.routeDate)
      savedRoutes.push(savedRoute)
    }

    // Calculate optimization summary
    const summary = calculateOptimizationSummary(optimizedRoutes, validatedJobs)

    return NextResponse.json({
      success: true,
      routeDate: data.routeDate,
      summary,
      routes: savedRoutes,
      unassignedJobs: getUnassignedJobs(validatedJobs, optimizedRoutes)
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Route optimization error:', error)
    return NextResponse.json(
      { error: 'Failed to optimize routes' },
      { status: 500 }
    )
  }
}

// GET optimization results for a specific date
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const routeDate = searchParams.get('routeDate')
    const vehicleId = searchParams.get('vehicleId')
    const status = searchParams.get('status')

    if (!routeDate) {
      return NextResponse.json(
        { error: 'Route date is required' },
        { status: 400 }
      )
    }

    let whereClause = 'WHERE r."routeDate" = $1'
    const params = [routeDate]
    let paramIndex = 2

    if (vehicleId) {
      whereClause += ` AND r."vehicleId" = $${paramIndex}`
      params.push(vehicleId)
      paramIndex++
    }

    if (status) {
      whereClause += ` AND r.status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    const result = await query(`
      SELECT * FROM "RouteSummaryView" 
      ${whereClause}
      ORDER BY "startTime", "vehicleNumber"
    `, params)

    const routes = result.rows.map(row => ({
      routeId: row.routeId,
      routeName: row.routeName,
      routeDate: row.routeDate,
      vehicleId: row.vehicleId,
      vehicleNumber: row.vehicleNumber,
      vehicleName: row.vehicleName,
      driverId: row.driverId,
      status: row.status,
      startTime: row.startTime,
      endTime: row.endTime,
      estimatedDuration: row.estimatedDuration,
      actualDuration: row.actualDuration,
      estimatedDistance: parseFloat(row.estimatedDistance || 0),
      actualDistance: parseFloat(row.actualDistance || 0),
      estimatedCost: parseFloat(row.estimatedCost || 0),
      actualCost: parseFloat(row.actualCost || 0),
      optimizationScore: parseFloat(row.optimizationScore || 0),
      totalStops: parseInt(row.totalStops || 0),
      jobStops: parseInt(row.jobStops || 0),
      completedStops: parseInt(row.completedStops || 0),
      inProgressStops: parseInt(row.inProgressStops || 0),
      firstStopTime: row.firstStopTime,
      lastStopTime: row.lastStopTime,
      totalJobTime: parseInt(row.totalJobTime || 0),
      totalTravelTime: parseInt(row.totalTravelTime || 0),
      totalRouteDistance: parseFloat(row.totalRouteDistance || 0)
    }))

    return NextResponse.json(routes)

  } catch (error) {
    console.error('Error fetching optimized routes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch optimized routes' },
      { status: 500 }
    )
  }
}

// Helper function to get available vehicles
async function getAvailableVehicles(vehicleIds?: string[]): Promise<Vehicle[]> {
  let whereClause = 'WHERE active = true'
  const params: any[] = []

  if (vehicleIds && vehicleIds.length > 0) {
    whereClause += ` AND id = ANY($1)`
    params.push(vehicleIds)
  }

  const result = await query(`
    SELECT * FROM "Vehicle"
    ${whereClause}
    ORDER BY "vehicleNumber"
  `, params)

  return result.rows.map(row => ({
    id: row.id,
    vehicleNumber: row.vehicleNumber,
    vehicleName: row.vehicleName,
    capacity: row.capacity,
    homeBaseLat: parseFloat(row.homeBaseLat || 44.9778),
    homeBaseLng: parseFloat(row.homeBaseLng || -93.2650),
    hourlyOperatingCost: parseFloat(row.hourlyOperatingCost || 25),
    mileageRate: parseFloat(row.mileageRate || 0.65)
  }))
}

// Helper function to get scheduled jobs
async function getScheduledJobs(
  routeDate: string,
  jobIds?: string[],
  serviceAreaIds?: string[]
): Promise<JobLocation[]> {
  let whereClause = `WHERE j."scheduledDate"::date = $1 AND j.status IN ('SCHEDULED', 'CONFIRMED')`
  const params = [routeDate]
  let paramIndex = 2

  if (jobIds && jobIds.length > 0) {
    whereClause += ` AND j.id = ANY($${paramIndex})`
    params.push(jobIds)
    paramIndex++
  }

  // Basic query - in a real system you'd join with service areas
  const result = await query(`
    SELECT 
      j.id as "jobId",
      j.address,
      j.city,
      j.state,
      j.zip,
      j."estimatedHours",
      j.priority,
      j."jobType",
      j.complexity,
      j.description
    FROM "Job" j
    ${whereClause}
    ORDER BY j.priority DESC, j."scheduledDate"
  `, params)

  const jobs: JobLocation[] = []

  for (const row of result.rows) {
    // Geocode address (in real implementation, this would be cached)
    const fullAddress = `${row.address}, ${row.city}, ${row.state} ${row.zip}`
    const coordinates = await RouteUtils.validateAndGeocodeAddress(fullAddress)

    if (coordinates) {
      jobs.push({
        jobId: row.jobId,
        address: fullAddress,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        estimatedDuration: RouteUtils.estimateJobDuration(row.jobType, row.complexity),
        priority: parseInt(row.priority) || 3,
        jobType: row.jobType,
        complexity: row.complexity
      })
    }
  }

  return jobs
}

// Helper function to validate and geocode job locations
async function validateJobLocations(jobs: JobLocation[]): Promise<JobLocation[]> {
  const validatedJobs: JobLocation[] = []

  for (const job of jobs) {
    // Validate coordinates
    if (job.latitude && job.longitude && 
        job.latitude >= -90 && job.latitude <= 90 && 
        job.longitude >= -180 && job.longitude <= 180) {
      validatedJobs.push(job)
    } else {
      // Try to geocode
      const coordinates = await RouteUtils.validateAndGeocodeAddress(job.address)
      if (coordinates) {
        validatedJobs.push({
          ...job,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude
        })
      } else {
        console.warn(`Failed to geocode job ${job.jobId}: ${job.address}`)
      }
    }
  }

  return validatedJobs
}

// Helper function to save optimized route
async function saveOptimizedRoute(route: any, routeDate: string): Promise<any> {
  try {
    // Insert route
    const routeResult = await query(`
      INSERT INTO "Route" (
        "routeName", "routeDate", "vehicleId", "status", "startTime", "endTime",
        "estimatedDuration", "estimatedDistance", "estimatedCost", "optimizationScore"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      `Route ${route.vehicleId.slice(-4)} - ${routeDate}`,
      routeDate,
      route.vehicleId,
      'PLANNED',
      route.startTime,
      route.endTime,
      route.totalDuration,
      route.totalDistance,
      route.totalCost,
      route.optimizationScore
    ])

    const savedRoute = routeResult.rows[0]

    // Insert route stops
    for (const stop of route.stops) {
      await query(`
        INSERT INTO "RouteStop" (
          "routeId", "jobId", "stopOrder", "address", "latitude", "longitude",
          "estimatedArrival", "estimatedDeparture", "estimatedDuration",
          "travelTimeFromPrevious", "distanceFromPrevious", "stopType"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        savedRoute.id,
        stop.jobId,
        stop.stopOrder,
        stop.address,
        stop.latitude,
        stop.longitude,
        `${routeDate} ${stop.estimatedArrival}`,
        `${routeDate} ${stop.estimatedDeparture}`,
        stop.estimatedDuration,
        stop.travelTimeFromPrevious,
        stop.distanceFromPrevious,
        'JOB_SITE'
      ])
    }

    return {
      routeId: savedRoute.id,
      routeName: savedRoute.routeName,
      vehicleId: savedRoute.vehicleId,
      status: savedRoute.status,
      startTime: savedRoute.startTime,
      endTime: savedRoute.endTime,
      estimatedDuration: savedRoute.estimatedDuration,
      estimatedDistance: parseFloat(savedRoute.estimatedDistance),
      estimatedCost: parseFloat(savedRoute.estimatedCost),
      optimizationScore: parseFloat(savedRoute.optimizationScore),
      stops: route.stops
    }
  } catch (error) {
    console.error('Error saving route:', error)
    throw error
  }
}

// Helper function to calculate optimization summary
function calculateOptimizationSummary(routes: any[], jobs: JobLocation[]) {
  const totalRoutes = routes.length
  const totalJobs = jobs.length
  const assignedJobs = routes.reduce((sum, route) => sum + route.stops.length, 0)
  const totalDistance = routes.reduce((sum, route) => sum + route.totalDistance, 0)
  const totalDuration = routes.reduce((sum, route) => sum + route.totalDuration, 0)
  const totalCost = routes.reduce((sum, route) => sum + route.totalCost, 0)
  const avgOptimizationScore = routes.length > 0 ? 
    routes.reduce((sum, route) => sum + route.optimizationScore, 0) / routes.length : 0

  return {
    totalRoutes,
    totalJobs,
    assignedJobs,
    unassignedJobs: totalJobs - assignedJobs,
    assignmentRate: totalJobs > 0 ? (assignedJobs / totalJobs * 100) : 0,
    totalDistance: Math.round(totalDistance * 100) / 100,
    totalDuration,
    totalCost: Math.round(totalCost * 100) / 100,
    avgOptimizationScore: Math.round(avgOptimizationScore * 100) / 100,
    avgJobsPerRoute: totalRoutes > 0 ? assignedJobs / totalRoutes : 0,
    avgDistancePerRoute: totalRoutes > 0 ? totalDistance / totalRoutes : 0
  }
}

// Helper function to get unassigned jobs
function getUnassignedJobs(allJobs: JobLocation[], routes: any[]): JobLocation[] {
  const assignedJobIds = new Set()
  routes.forEach(route => {
    route.stops.forEach((stop: any) => {
      assignedJobIds.add(stop.jobId)
    })
  })

  return allJobs.filter(job => !assignedJobIds.has(job.jobId))
}