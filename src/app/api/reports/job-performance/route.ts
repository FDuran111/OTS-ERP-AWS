import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'
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

    // Get job performance by status
    const jobsByStatusResult = await query(`
      SELECT 
        j.status,
        COUNT(*) as job_count,
        AVG(EXTRACT(EPOCH FROM (j."completedAt" - j."scheduledDate"))/86400) as avg_completion_days,
        SUM(CASE WHEN j."completedAt" > j."scheduledDate" THEN 1 ELSE 0 END) as delayed_jobs,
        SUM(CASE WHEN j."completedAt" <= j."scheduledDate" THEN 1 ELSE 0 END) as on_time_jobs
      FROM "Job" j
      WHERE j."createdAt" >= $1 AND j."createdAt" <= $2
      GROUP BY j.status
      ORDER BY job_count DESC
    `, [dateStart, dateEnd])

    // Get job performance by type
    const jobsByTypeResult = await query(`
      SELECT 
        j.type,
        COUNT(*) as job_count,
        AVG(COALESCE(j."billedAmount", j."estimatedCost", 0)) as avg_revenue,
        AVG(COALESCE(j."actualCost", 0)) as avg_cost,
        AVG(EXTRACT(EPOCH FROM (j."completedAt" - j."scheduledDate"))/86400) as avg_completion_days
      FROM "Job" j
      WHERE j."createdAt" >= $1 AND j."createdAt" <= $2
      GROUP BY j.type
      ORDER BY job_count DESC
    `, [dateStart, dateEnd])

    // Get efficiency metrics
    const efficiencyResult = await query(`
      SELECT 
        COUNT(*) as total_jobs,
        COUNT(CASE WHEN j.status = 'COMPLETED' THEN 1 END) as completed_jobs,
        COUNT(CASE WHEN j.status = 'CANCELLED' THEN 1 END) as cancelled_jobs,
        COUNT(CASE WHEN j.status = 'IN_PROGRESS' THEN 1 END) as in_progress_jobs,
        COUNT(CASE WHEN j.status = 'SCHEDULED' THEN 1 END) as scheduled_jobs,
        AVG(CASE 
          WHEN j."billedAmount" > 0 AND j."estimatedCost" > 0 
          THEN ((j."billedAmount" - j."estimatedCost") / j."estimatedCost" * 100)
          ELSE NULL 
        END) as avg_profit_margin,
        AVG(CASE 
          WHEN j."actualCost" > 0 AND j."estimatedCost" > 0 
          THEN ((j."actualCost" - j."estimatedCost") / j."estimatedCost" * 100)
          ELSE NULL 
        END) as avg_cost_variance
      FROM "Job" j
      WHERE j."createdAt" >= $1 AND j."createdAt" <= $2
    `, [dateStart, dateEnd])

    // Get weekly performance trend
    const weeklyTrendResult = await query(`
      SELECT 
        TO_CHAR(j."createdAt", 'YYYY-IW') as week,
        COUNT(*) as job_count,
        COUNT(CASE WHEN j.status = 'COMPLETED' THEN 1 END) as completed_count,
        AVG(COALESCE(j."billedAmount", j."estimatedCost", 0)) as avg_revenue
      FROM "Job" j
      WHERE j."createdAt" >= $1
      GROUP BY TO_CHAR(j."createdAt", 'YYYY-IW')
      ORDER BY week DESC
      LIMIT 12
    `, [subMonths(new Date(), 3)])

    // Get crew performance
    const crewPerformanceResult = await query(`
      SELECT 
        u.id,
        u.name,
        COUNT(DISTINCT ja."jobId") as jobs_assigned,
        COUNT(DISTINCT CASE WHEN j.status = 'COMPLETED' THEN ja."jobId" END) as jobs_completed,
        AVG(CASE 
          WHEN j.status = 'COMPLETED' AND j."billedAmount" > 0 
          THEN j."billedAmount" 
          ELSE NULL 
        END) as avg_job_revenue
      FROM "User" u
      INNER JOIN "JobAssignment" ja ON u.id = ja."userId"
      INNER JOIN "Job" j ON ja."jobId" = j.id
      WHERE j."createdAt" >= $1 AND j."createdAt" <= $2
      GROUP BY u.id, u.name
      ORDER BY jobs_completed DESC
      LIMIT 10
    `, [dateStart, dateEnd])

    const efficiency = efficiencyResult.rows[0] || {
      total_jobs: 0,
      completed_jobs: 0,
      cancelled_jobs: 0,
      in_progress_jobs: 0,
      scheduled_jobs: 0,
      avg_profit_margin: 0,
      avg_cost_variance: 0
    }

    const completionRate = efficiency.total_jobs > 0 
      ? (parseInt(efficiency.completed_jobs) / parseInt(efficiency.total_jobs)) * 100 
      : 0

    return NextResponse.json({
      period: {
        start: dateStart,
        end: dateEnd,
        label: period
      },
      summary: {
        totalJobs: parseInt(efficiency.total_jobs),
        completedJobs: parseInt(efficiency.completed_jobs),
        cancelledJobs: parseInt(efficiency.cancelled_jobs),
        inProgressJobs: parseInt(efficiency.in_progress_jobs),
        scheduledJobs: parseInt(efficiency.scheduled_jobs),
        completionRate: completionRate.toFixed(2),
        avgProfitMargin: parseFloat(efficiency.avg_profit_margin) || 0,
        avgCostVariance: parseFloat(efficiency.avg_cost_variance) || 0
      },
      jobsByStatus: jobsByStatusResult.rows.map(row => ({
        status: row.status,
        jobCount: parseInt(row.job_count),
        avgCompletionDays: parseFloat(row.avg_completion_days) || 0,
        delayedJobs: parseInt(row.delayed_jobs) || 0,
        onTimeJobs: parseInt(row.on_time_jobs) || 0
      })),
      jobsByType: jobsByTypeResult.rows.map(row => ({
        type: row.type,
        jobCount: parseInt(row.job_count),
        avgRevenue: parseFloat(row.avg_revenue) || 0,
        avgCost: parseFloat(row.avg_cost) || 0,
        avgCompletionDays: parseFloat(row.avg_completion_days) || 0
      })),
      weeklyTrend: weeklyTrendResult.rows.reverse().map(row => ({
        week: row.week,
        jobCount: parseInt(row.job_count),
        completedCount: parseInt(row.completed_count),
        completionRate: row.job_count > 0 ? (row.completed_count / row.job_count * 100).toFixed(2) : '0',
        avgRevenue: parseFloat(row.avg_revenue) || 0
      })),
      topPerformers: crewPerformanceResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        jobsAssigned: parseInt(row.jobs_assigned),
        jobsCompleted: parseInt(row.jobs_completed),
        completionRate: row.jobs_assigned > 0 
          ? (row.jobs_completed / row.jobs_assigned * 100).toFixed(2) 
          : '0',
        avgJobRevenue: parseFloat(row.avg_job_revenue) || 0
      }))
    })
  } catch (error) {
    console.error('Error generating job performance report:', error)
    return NextResponse.json(
      { error: 'Failed to generate job performance report' },
      { status: 500 }
    )
  }
})