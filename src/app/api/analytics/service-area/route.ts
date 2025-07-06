import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || !payload.id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if user is admin@admin.com
    if (payload.email !== 'admin@admin.com') {
      return NextResponse.json({ error: 'Access denied. This feature is in beta testing.' }, { status: 403 })
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate') || new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString()
    const endDate = searchParams.get('endDate') || new Date().toISOString()
    const jobType = searchParams.get('jobType') || 'all'

    // Build the query - without latitude/longitude for now
    let sqlQuery = `
      SELECT 
        c.id,
        c."firstName" as first_name,
        c."lastName" as last_name,
        c."companyName" as company_name,
        c.address,
        c.city,
        c.state,
        c.zip,
        COUNT(j.id) as job_count,
        COALESCE(SUM(j."totalAmount"), 0) as total_revenue,
        COALESCE(AVG(j."totalAmount"), 0) as avg_job_value,
        COALESCE(SUM(j."estimatedHours"), 0) as total_hours,
        STRING_AGG(DISTINCT j."jobType", ', ') as job_types,
        MAX(j."scheduledStart") as last_service_date,
        MIN(j."scheduledStart") as first_service_date
      FROM "Customer" c
      LEFT JOIN "Job" j ON c.id = j."customerId"
      WHERE j."scheduledStart" >= $1 AND j."scheduledStart" <= $2
    `

    const params: any[] = [startDate, endDate]

    if (jobType !== 'all') {
      sqlQuery += ` AND j."jobType" = $3`
      params.push(jobType)
    }

    sqlQuery += `
      GROUP BY c.id, c."firstName", c."lastName", c."companyName", c.address, c.city, c.state, c.zip
      HAVING COUNT(j.id) > 0
      ORDER BY job_count DESC
    `

    const jobsResult = await query(sqlQuery, params)

    // Get job type statistics
    const jobTypesQuery = `
      SELECT 
        "jobType" as job_type,
        COUNT(*) as count,
        COALESCE(SUM("totalAmount"), 0) as revenue
      FROM "Job"
      WHERE "scheduledStart" >= $1 AND "scheduledStart" <= $2
        AND "jobType" IS NOT NULL
      GROUP BY "jobType"
      ORDER BY count DESC
    `

    const jobTypesResult = await query(jobTypesQuery, [startDate, endDate])

    // Get city-level aggregation for better heat map visualization
    let cityQuery = `
      SELECT 
        c.city,
        c.state,
        c.zip,
        COUNT(DISTINCT c.id) as customer_count,
        COUNT(j.id) as job_count,
        COALESCE(SUM(j."totalAmount"), 0) as total_revenue,
        COALESCE(AVG(j."totalAmount"), 0) as avg_job_value,
        NULL as avg_latitude,
        NULL as avg_longitude
      FROM "Customer" c
      LEFT JOIN "Job" j ON c.id = j."customerId"
      WHERE j."scheduledStart" >= $1 AND j."scheduledStart" <= $2
        AND c.city IS NOT NULL
    `

    const cityParams = [startDate, endDate]

    if (jobType !== 'all') {
      cityQuery += ` AND j."jobType" = $3`
      cityParams.push(jobType)
    }

    cityQuery += `
      GROUP BY c.city, c.state, c.zip
      HAVING COUNT(j.id) > 0
      ORDER BY job_count DESC
    `

    const cityResult = await query(cityQuery, cityParams)

    // Calculate service area summary (without bounds since we don't have coordinates)
    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT c.city) as unique_cities,
        COUNT(DISTINCT c.state) as unique_states
      FROM "Customer" c
      WHERE c.city IS NOT NULL
    `

    const summaryResult = await query(summaryQuery)

    // Get time-based patterns (day of week analysis)
    const dayPatternQuery = `
      SELECT 
        EXTRACT(DOW FROM "scheduledStart") as day_of_week,
        COUNT(*) as job_count,
        COALESCE(AVG("totalAmount"), 0) as avg_revenue
      FROM "Job"
      WHERE "scheduledStart" >= $1 AND "scheduledStart" <= $2
      GROUP BY EXTRACT(DOW FROM "scheduledStart")
      ORDER BY day_of_week
    `

    const dayPatternResult = await query(dayPatternQuery, [startDate, endDate])

    // Format day names
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayPatterns = dayPatternResult.rows.map(row => ({
      day: dayNames[row.day_of_week],
      job_count: parseInt(row.job_count),
      avg_revenue: parseFloat(row.avg_revenue)
    }))

    // Transform customer data to add placeholder coordinates based on city
    // In a real implementation, you'd use a geocoding service
    const customersWithPlaceholderCoords = jobsResult.rows.map((customer, index) => ({
      ...customer,
      // Generate placeholder coordinates for visualization
      // These would be replaced with real geocoding in production
      latitude: null,
      longitude: null
    }))

    return NextResponse.json({
      success: true,
      data: {
        customers: customersWithPlaceholderCoords,
        cities: cityResult.rows,
        jobTypes: jobTypesResult.rows,
        bounds: {
          min_lat: null,
          max_lat: null,
          min_lng: null,
          max_lng: null
        },
        dayPatterns,
        summary: {
          totalCustomers: jobsResult.rows.length,
          totalJobs: jobsResult.rows.reduce((sum, row) => sum + parseInt(row.job_count), 0),
          totalRevenue: jobsResult.rows.reduce((sum, row) => sum + parseFloat(row.total_revenue), 0),
          uniqueCities: summaryResult.rows[0]?.unique_cities || 0,
          uniqueStates: summaryResult.rows[0]?.unique_states || 0,
          dateRange: {
            start: startDate,
            end: endDate
          }
        }
      }
    })
  } catch (error) {
    console.error('Service area analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch service area data' },
      { status: 500 }
    )
  }
}