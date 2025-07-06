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

    // Build the query
    let sqlQuery = `
      SELECT 
        c.id,
        c."firstName" as first_name,
        c."lastName" as last_name,
        c.address,
        c.city,
        c.state,
        c.zip,
        c.latitude,
        c.longitude,
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
      GROUP BY c.id, c."firstName", c."lastName", c.address, c.city, c.state, c.zip, c.latitude, c.longitude
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
    const cityQuery = `
      SELECT 
        c.city,
        c.state,
        c.zip,
        COUNT(DISTINCT c.id) as customer_count,
        COUNT(j.id) as job_count,
        COALESCE(SUM(j."totalAmount"), 0) as total_revenue,
        COALESCE(AVG(j."totalAmount"), 0) as avg_job_value,
        AVG(c.latitude) as avg_latitude,
        AVG(c.longitude) as avg_longitude
      FROM "Customer" c
      LEFT JOIN "Job" j ON c.id = j."customerId"
      WHERE j."scheduledStart" >= $1 AND j."scheduledStart" <= $2
        AND c.city IS NOT NULL
        AND c.latitude IS NOT NULL
        AND c.longitude IS NOT NULL
    `

    const cityParams = [startDate, endDate]

    if (jobType !== 'all') {
      cityQuery + ` AND j."jobType" = $3`
      cityParams.push(jobType)
    }

    const cityQueryFinal = cityQuery + `
      GROUP BY c.city, c.state, c.zip
      HAVING COUNT(j.id) > 0
      ORDER BY job_count DESC
    `

    const cityResult = await query(cityQueryFinal, cityParams)

    // Calculate service area bounds
    const boundsQuery = `
      SELECT 
        MIN(latitude) as min_lat,
        MAX(latitude) as max_lat,
        MIN(longitude) as min_lng,
        MAX(longitude) as max_lng
      FROM "Customer"
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    `

    const boundsResult = await query(boundsQuery)
    const bounds = boundsResult.rows[0]

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

    return NextResponse.json({
      success: true,
      data: {
        customers: jobsResult.rows,
        cities: cityResult.rows,
        jobTypes: jobTypesResult.rows,
        bounds,
        dayPatterns,
        summary: {
          totalCustomers: jobsResult.rows.length,
          totalJobs: jobsResult.rows.reduce((sum, row) => sum + parseInt(row.job_count), 0),
          totalRevenue: jobsResult.rows.reduce((sum, row) => sum + parseFloat(row.total_revenue), 0),
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