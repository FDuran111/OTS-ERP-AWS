import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'
import { withRBAC } from '@/lib/rbac-middleware'

export const GET = withRBAC({
  requiredRoles: ['OWNER_ADMIN', 'FOREMAN']
})(async (request: NextRequest) => {
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

    // Get revenue by status
    const revenueByStatusResult = await query(`
      SELECT 
        j.status,
        COUNT(*) as job_count,
        SUM(COALESCE(j."billedAmount", j."estimatedCost", 0)) as total_revenue
      FROM "Job" j
      WHERE j."createdAt" >= $1 AND j."createdAt" <= $2
      GROUP BY j.status
      ORDER BY total_revenue DESC
    `, [dateStart, dateEnd])

    // Get revenue by job type
    const revenueByTypeResult = await query(`
      SELECT 
        j.type,
        COUNT(*) as job_count,
        SUM(COALESCE(j."billedAmount", j."estimatedCost", 0)) as total_revenue
      FROM "Job" j
      WHERE j."createdAt" >= $1 AND j."createdAt" <= $2
      GROUP BY j.type
      ORDER BY total_revenue DESC
    `, [dateStart, dateEnd])

    // Get monthly revenue trend (last 12 months)
    const monthlyTrendResult = await query(`
      SELECT 
        TO_CHAR(j."createdAt", 'YYYY-MM') as month,
        COUNT(*) as job_count,
        SUM(COALESCE(j."billedAmount", j."estimatedCost", 0)) as revenue
      FROM "Job" j
      WHERE j."createdAt" >= $1
      GROUP BY TO_CHAR(j."createdAt", 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 12
    `, [subMonths(new Date(), 11)])

    // Get top customers by revenue
    const topCustomersResult = await query(`
      SELECT 
        c.id,
        COALESCE(c."companyName", CONCAT(c."firstName", ' ', c."lastName")) as customer_name,
        COUNT(j.id) as job_count,
        SUM(COALESCE(j."billedAmount", j."estimatedCost", 0)) as total_revenue
      FROM "Customer" c
      INNER JOIN "Job" j ON c.id = j."customerId"
      WHERE j."createdAt" >= $1 AND j."createdAt" <= $2
      GROUP BY c.id, customer_name
      ORDER BY total_revenue DESC
      LIMIT 10
    `, [dateStart, dateEnd])

    // Get invoice statistics
    const invoiceStatsResult = await query(`
      SELECT 
        i.status,
        COUNT(*) as count,
        SUM(i."totalAmount") as total_amount
      FROM "Invoice" i
      WHERE i."createdAt" >= $1 AND i."createdAt" <= $2
      GROUP BY i.status
    `, [dateStart, dateEnd])

    // Get overall statistics
    const overallStatsResult = await query(`
      SELECT 
        COUNT(DISTINCT j.id) as total_jobs,
        COUNT(DISTINCT j."customerId") as total_customers,
        SUM(COALESCE(j."billedAmount", 0)) as total_billed,
        SUM(COALESCE(j."estimatedCost", 0)) as total_estimated,
        SUM(COALESCE(j."actualCost", 0)) as total_cost,
        AVG(COALESCE(j."billedAmount", j."estimatedCost", 0)) as avg_job_value
      FROM "Job" j
      WHERE j."createdAt" >= $1 AND j."createdAt" <= $2
    `, [dateStart, dateEnd])

    const overallStats = overallStatsResult.rows[0] || {
      total_jobs: 0,
      total_customers: 0,
      total_billed: 0,
      total_estimated: 0,
      total_cost: 0,
      avg_job_value: 0
    }

    // Calculate profit margin
    const totalRevenue = parseFloat(overallStats.total_billed) || parseFloat(overallStats.total_estimated) || 0
    const totalCost = parseFloat(overallStats.total_cost) || 0
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0

    return NextResponse.json({
      period: {
        start: dateStart,
        end: dateEnd,
        label: period
      },
      summary: {
        totalJobs: parseInt(overallStats.total_jobs),
        totalCustomers: parseInt(overallStats.total_customers),
        totalRevenue,
        totalCost,
        netProfit: totalRevenue - totalCost,
        profitMargin: profitMargin.toFixed(2),
        avgJobValue: parseFloat(overallStats.avg_job_value) || 0
      },
      revenueByStatus: revenueByStatusResult.rows.map(row => ({
        status: row.status,
        jobCount: parseInt(row.job_count),
        revenue: parseFloat(row.total_revenue) || 0
      })),
      revenueByType: revenueByTypeResult.rows.map(row => ({
        type: row.type,
        jobCount: parseInt(row.job_count),
        revenue: parseFloat(row.total_revenue) || 0
      })),
      monthlyTrend: monthlyTrendResult.rows.reverse().map(row => ({
        month: row.month,
        jobCount: parseInt(row.job_count),
        revenue: parseFloat(row.revenue) || 0
      })),
      topCustomers: topCustomersResult.rows.map(row => ({
        id: row.id,
        name: row.customer_name,
        jobCount: parseInt(row.job_count),
        revenue: parseFloat(row.total_revenue) || 0
      })),
      invoiceStats: invoiceStatsResult.rows.reduce((acc, row) => {
        acc[row.status.toLowerCase()] = {
          count: parseInt(row.count),
          amount: parseFloat(row.total_amount) || 0
        }
        return acc
      }, {} as Record<string, { count: number; amount: number }>)
    })
  } catch (error) {
    console.error('Error generating revenue report:', error)
    return NextResponse.json(
      { error: 'Failed to generate revenue report' },
      { status: 500 }
    )
  }
})