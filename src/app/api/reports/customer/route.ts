import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { withRBAC } from '@/lib/rbac-middleware'

export const GET = withRBAC({ requiredRoles: ['OWNER_ADMIN', 'FOREMAN'] })(
async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month' // month, quarter, year
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    // Calculate date range based on period
    let dateStart: Date
    let dateEnd: Date
    
    if (startDate && endDate) {
      dateStart = new Date(startDate)
      dateEnd = new Date(endDate)
    } else {
      const now = new Date()
      switch (period) {
        case 'year':
          dateStart = new Date(now.getFullYear(), 0, 1)
          dateEnd = new Date(now.getFullYear(), 11, 31)
          break
        case 'quarter':
          const currentQuarter = Math.floor(now.getMonth() / 3)
          dateStart = new Date(now.getFullYear(), currentQuarter * 3, 1)
          dateEnd = endOfMonth(new Date(now.getFullYear(), currentQuarter * 3 + 2, 1))
          break
        case 'month':
        default:
          dateStart = startOfMonth(now)
          dateEnd = endOfMonth(now)
      }
    }

    // Get customer summary
    const customerSummaryResult = await query(`
      SELECT 
        COUNT(DISTINCT c.id) as total_customers,
        COUNT(DISTINCT CASE WHEN j.id IS NOT NULL THEN c.id END) as active_customers,
        COUNT(DISTINCT j.id) as total_jobs,
        SUM(COALESCE(j."billedAmount", j."estimatedCost", 0)) as total_revenue,
        AVG(COALESCE(j."billedAmount", j."estimatedCost", 0)) as avg_job_value
      FROM "Customer" c
      LEFT JOIN "Job" j ON c.id = j."customerId" 
        AND j."createdAt" >= $1 AND j."createdAt" <= $2
    `, [dateStart, dateEnd])

    // Get top customers by revenue
    const topCustomersResult = await query(`
      SELECT 
        c.id,
        COALESCE(c."companyName", CONCAT(c."firstName", ' ', c."lastName")) as name,
        c.email,
        c.phone,
        COUNT(j.id) as job_count,
        SUM(COALESCE(j."billedAmount", j."estimatedCost", 0)) as total_revenue,
        AVG(COALESCE(j."billedAmount", j."estimatedCost", 0)) as avg_job_value,
        MAX(j."createdAt") as last_job_date
      FROM "Customer" c
      INNER JOIN "Job" j ON c.id = j."customerId"
      WHERE j."createdAt" >= $1 AND j."createdAt" <= $2
      GROUP BY c.id, c."companyName", c."firstName", c."lastName", c.email, c.phone
      ORDER BY total_revenue DESC
      LIMIT 10
    `, [dateStart, dateEnd])

    // Get customer job status breakdown
    const customerJobStatusResult = await query(`
      SELECT 
        c.id,
        COALESCE(c."companyName", CONCAT(c."firstName", ' ', c."lastName")) as name,
        j.status,
        COUNT(*) as job_count
      FROM "Customer" c
      INNER JOIN "Job" j ON c.id = j."customerId"
      WHERE j."createdAt" >= $1 AND j."createdAt" <= $2
      GROUP BY c.id, c."companyName", c."firstName", c."lastName", j.status
      ORDER BY c.id, j.status
    `, [dateStart, dateEnd])

    // Get new vs returning customers
    const customerTypeResult = await query(`
      WITH customer_first_job AS (
        SELECT 
          c.id as customer_id,
          MIN(j."createdAt") as first_job_date
        FROM "Customer" c
        INNER JOIN "Job" j ON c.id = j."customerId"
        GROUP BY c.id
      )
      SELECT 
        CASE 
          WHEN cfj.first_job_date >= $1 THEN 'new'
          ELSE 'returning'
        END as customer_type,
        COUNT(DISTINCT c.id) as customer_count,
        SUM(CASE WHEN j."createdAt" >= $1 AND j."createdAt" <= $2 THEN 1 ELSE 0 END) as job_count,
        SUM(CASE WHEN j."createdAt" >= $1 AND j."createdAt" <= $2 THEN COALESCE(j."billedAmount", j."estimatedCost", 0) ELSE 0 END) as total_revenue
      FROM "Customer" c
      INNER JOIN "Job" j ON c.id = j."customerId"
      INNER JOIN customer_first_job cfj ON c.id = cfj.customer_id
      GROUP BY CASE 
        WHEN cfj.first_job_date >= $1 THEN 'new'
        ELSE 'returning'
      END
    `, [dateStart, dateEnd])

    // Get monthly customer trends
    const monthlyTrendResult = await query(`
      SELECT 
        TO_CHAR(j."createdAt", 'YYYY-MM') as month,
        COUNT(DISTINCT j."customerId") as active_customers,
        COUNT(j.id) as job_count,
        SUM(COALESCE(j."billedAmount", j."estimatedCost", 0)) as revenue,
        AVG(COALESCE(j."billedAmount", j."estimatedCost", 0)) as avg_job_value
      FROM "Job" j
      WHERE j."createdAt" >= $1
      GROUP BY TO_CHAR(j."createdAt", 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 12
    `, [subMonths(new Date(), 11)])

    // Get customer geographic distribution
    const geographicResult = await query(`
      SELECT 
        c.city,
        c.state,
        COUNT(DISTINCT c.id) as customer_count,
        COUNT(j.id) as job_count,
        SUM(COALESCE(j."billedAmount", j."estimatedCost", 0)) as total_revenue
      FROM "Customer" c
      LEFT JOIN "Job" j ON c.id = j."customerId" 
        AND j."createdAt" >= $1 AND j."createdAt" <= $2
      WHERE c.city IS NOT NULL AND c.state IS NOT NULL
      GROUP BY c.city, c.state
      ORDER BY total_revenue DESC
      LIMIT 20
    `, [dateStart, dateEnd])

    // Process customer job status data
    const customerJobStatusMap = new Map()
    customerJobStatusResult.rows.forEach(row => {
      const customerId = row.id
      if (!customerJobStatusMap.has(customerId)) {
        customerJobStatusMap.set(customerId, {
          id: row.id,
          name: row.name,
          jobStatuses: {}
        })
      }
      customerJobStatusMap.get(customerId).jobStatuses[row.status] = parseInt(row.job_count)
    })

    const summary = customerSummaryResult.rows[0] || {
      total_customers: 0,
      active_customers: 0,
      total_jobs: 0,
      total_revenue: 0,
      avg_job_value: 0
    }

    return NextResponse.json({
      period: {
        start: dateStart,
        end: dateEnd,
        label: period
      },
      summary: {
        totalCustomers: parseInt(summary.total_customers),
        activeCustomers: parseInt(summary.active_customers),
        totalJobs: parseInt(summary.total_jobs),
        totalRevenue: parseFloat(summary.total_revenue) || 0,
        avgJobValue: parseFloat(summary.avg_job_value) || 0,
        customerRetentionRate: summary.total_customers > 0 
          ? ((parseInt(summary.active_customers) / parseInt(summary.total_customers)) * 100).toFixed(2)
          : '0'
      },
      topCustomers: topCustomersResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        jobCount: parseInt(row.job_count),
        totalRevenue: parseFloat(row.total_revenue) || 0,
        avgJobValue: parseFloat(row.avg_job_value) || 0,
        lastJobDate: row.last_job_date
      })),
      customerTypes: customerTypeResult.rows.map(row => ({
        type: row.customer_type,
        customerCount: parseInt(row.customer_count),
        jobCount: parseInt(row.job_count),
        totalRevenue: parseFloat(row.total_revenue) || 0
      })),
      monthlyTrend: monthlyTrendResult.rows.reverse().map(row => ({
        month: row.month,
        activeCustomers: parseInt(row.active_customers),
        jobCount: parseInt(row.job_count),
        revenue: parseFloat(row.revenue) || 0,
        avgJobValue: parseFloat(row.avg_job_value) || 0
      })),
      geographic: geographicResult.rows.map(row => ({
        city: row.city,
        state: row.state,
        customerCount: parseInt(row.customer_count),
        jobCount: parseInt(row.job_count),
        totalRevenue: parseFloat(row.total_revenue) || 0
      })),
      customerJobStatuses: Array.from(customerJobStatusMap.values())
    })
  } catch (error) {
    console.error('Error generating customer report:', error)
    return NextResponse.json(
      { error: 'Failed to generate customer report' },
      { status: 500 }
    )
  }
})