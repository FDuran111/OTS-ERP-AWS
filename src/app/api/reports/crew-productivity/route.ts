import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'
import { withRBAC } from '@/lib/rbac-middleware'

export const GET = withRBAC({ requiredRoles: ['OWNER_ADMIN', 'FOREMAN'] })(
async function GET(request) {
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

    // Get crew productivity metrics
    const crewProductivityResult = await query(`
      SELECT 
        u.id,
        u.name,
        u.role,
        COUNT(DISTINCT ja."jobId") as total_jobs,
        COUNT(DISTINCT CASE WHEN j.status = 'COMPLETED' THEN ja."jobId" END) as completed_jobs,
        COUNT(DISTINCT CASE WHEN j.status = 'IN_PROGRESS' THEN ja."jobId" END) as in_progress_jobs,
        COUNT(DISTINCT CASE WHEN j.status = 'SCHEDULED' THEN ja."jobId" END) as scheduled_jobs,
        SUM(CASE WHEN j.status = 'COMPLETED' THEN COALESCE(j."billedAmount", j."estimatedCost", 0) ELSE 0 END) as total_revenue,
        SUM(ja."hoursWorked") as total_hours,
        AVG(ja."hoursWorked") as avg_hours_per_job,
        COUNT(DISTINCT DATE(ja."assignedAt")) as days_worked
      FROM "User" u
      LEFT JOIN "JobAssignment" ja ON u.id = ja."userId"
      LEFT JOIN "Job" j ON ja."jobId" = j.id
      WHERE ja."assignedAt" >= $1 AND ja."assignedAt" <= $2
        AND u.role IN ('ADMIN', 'SUPERVISOR', 'TECH')
      GROUP BY u.id, u.name, u.role
      ORDER BY total_revenue DESC
    `, [dateStart, dateEnd])

    // Get crew efficiency by job type
    const crewByJobTypeResult = await query(`
      SELECT 
        u.id,
        u.name,
        j.type,
        COUNT(DISTINCT ja."jobId") as job_count,
        AVG(ja."hoursWorked") as avg_hours,
        SUM(CASE WHEN j.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_count
      FROM "User" u
      INNER JOIN "JobAssignment" ja ON u.id = ja."userId"
      INNER JOIN "Job" j ON ja."jobId" = j.id
      WHERE ja."assignedAt" >= $1 AND ja."assignedAt" <= $2
        AND u.role IN ('ADMIN', 'SUPERVISOR', 'TECH')
      GROUP BY u.id, u.name, j.type
      ORDER BY u.id, job_count DESC
    `, [dateStart, dateEnd])

    // Get daily productivity trend
    const dailyProductivityResult = await query(`
      SELECT 
        DATE(ja."assignedAt") as work_date,
        COUNT(DISTINCT ja."userId") as crew_count,
        COUNT(DISTINCT ja."jobId") as jobs_worked,
        SUM(ja."hoursWorked") as total_hours,
        AVG(ja."hoursWorked") as avg_hours_per_assignment
      FROM "JobAssignment" ja
      INNER JOIN "User" u ON ja."userId" = u.id
      WHERE ja."assignedAt" >= $1 AND ja."assignedAt" <= $2
        AND u.role IN ('ADMIN', 'SUPERVISOR', 'TECH')
      GROUP BY DATE(ja."assignedAt")
      ORDER BY work_date DESC
      LIMIT 30
    `, [dateStart, dateEnd])

    // Get team performance summary
    const teamSummaryResult = await query(`
      SELECT 
        COUNT(DISTINCT u.id) as total_crew,
        COUNT(DISTINCT ja."jobId") as total_jobs_worked,
        SUM(ja."hoursWorked") as total_hours_worked,
        AVG(ja."hoursWorked") as avg_hours_per_assignment,
        COUNT(DISTINCT CASE WHEN j.status = 'COMPLETED' THEN ja."jobId" END) as completed_jobs,
        SUM(CASE WHEN j.status = 'COMPLETED' THEN COALESCE(j."billedAmount", j."estimatedCost", 0) ELSE 0 END) as total_revenue
      FROM "User" u
      INNER JOIN "JobAssignment" ja ON u.id = ja."userId"
      INNER JOIN "Job" j ON ja."jobId" = j.id
      WHERE ja."assignedAt" >= $1 AND ja."assignedAt" <= $2
        AND u.role IN ('ADMIN', 'SUPERVISOR', 'TECH')
    `, [dateStart, dateEnd])

    // Get crew utilization (hours worked vs available hours)
    const crewUtilizationResult = await query(`
      SELECT 
        u.id,
        u.name,
        SUM(ja."hoursWorked") as hours_worked,
        COUNT(DISTINCT DATE(ja."assignedAt")) as days_worked,
        SUM(ja."hoursWorked") / NULLIF(COUNT(DISTINCT DATE(ja."assignedAt")) * 8.0, 0) * 100 as utilization_rate
      FROM "User" u
      LEFT JOIN "JobAssignment" ja ON u.id = ja."userId"
      WHERE ja."assignedAt" >= $1 AND ja."assignedAt" <= $2
        AND u.role IN ('ADMIN', 'SUPERVISOR', 'TECH')
      GROUP BY u.id, u.name
      HAVING SUM(ja."hoursWorked") > 0
      ORDER BY utilization_rate DESC
    `, [dateStart, dateEnd])

    const teamSummary = teamSummaryResult.rows[0] || {
      total_crew: 0,
      total_jobs_worked: 0,
      total_hours_worked: 0,
      avg_hours_per_assignment: 0,
      completed_jobs: 0,
      total_revenue: 0
    }

    // Calculate average revenue per hour
    const revenuePerHour = teamSummary.total_hours_worked > 0 
      ? parseFloat(teamSummary.total_revenue) / parseFloat(teamSummary.total_hours_worked)
      : 0

    // Group crew by job type data
    const crewJobTypeMap = new Map()
    crewByJobTypeResult.rows.forEach(row => {
      const crewId = row.id
      if (!crewJobTypeMap.has(crewId)) {
        crewJobTypeMap.set(crewId, {
          id: row.id,
          name: row.name,
          jobTypes: []
        })
      }
      crewJobTypeMap.get(crewId).jobTypes.push({
        type: row.type,
        jobCount: parseInt(row.job_count),
        avgHours: parseFloat(row.avg_hours) || 0,
        completedCount: parseInt(row.completed_count)
      })
    })

    return NextResponse.json({
      period: {
        start: dateStart,
        end: dateEnd,
        label: period
      },
      summary: {
        totalCrew: parseInt(teamSummary.total_crew),
        totalJobsWorked: parseInt(teamSummary.total_jobs_worked),
        totalHoursWorked: parseFloat(teamSummary.total_hours_worked) || 0,
        avgHoursPerAssignment: parseFloat(teamSummary.avg_hours_per_assignment) || 0,
        completedJobs: parseInt(teamSummary.completed_jobs),
        totalRevenue: parseFloat(teamSummary.total_revenue) || 0,
        revenuePerHour: revenuePerHour
      },
      crewProductivity: crewProductivityResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        role: row.role,
        totalJobs: parseInt(row.total_jobs),
        completedJobs: parseInt(row.completed_jobs),
        inProgressJobs: parseInt(row.in_progress_jobs),
        scheduledJobs: parseInt(row.scheduled_jobs),
        totalRevenue: parseFloat(row.total_revenue) || 0,
        totalHours: parseFloat(row.total_hours) || 0,
        avgHoursPerJob: parseFloat(row.avg_hours_per_job) || 0,
        daysWorked: parseInt(row.days_worked),
        revenuePerHour: row.total_hours > 0 
          ? (parseFloat(row.total_revenue) / parseFloat(row.total_hours))
          : 0
      })),
      crewUtilization: crewUtilizationResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        hoursWorked: parseFloat(row.hours_worked) || 0,
        daysWorked: parseInt(row.days_worked),
        utilizationRate: parseFloat(row.utilization_rate) || 0
      })),
      crewByJobType: Array.from(crewJobTypeMap.values()),
      dailyProductivity: dailyProductivityResult.rows.reverse().map(row => ({
        date: row.work_date,
        crewCount: parseInt(row.crew_count),
        jobsWorked: parseInt(row.jobs_worked),
        totalHours: parseFloat(row.total_hours) || 0,
        avgHoursPerAssignment: parseFloat(row.avg_hours_per_assignment) || 0
      }))
    })
  } catch (error) {
    console.error('Error generating crew productivity report:', error)
    return NextResponse.json(
      { error: 'Failed to generate crew productivity report' },
      { status: 500 }
    )
  }
})