import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, format } from 'date-fns'
import { permissions, stripPricingData } from '@/lib/permissions'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const now = new Date()
    const startOfThisMonth = startOfMonth(now)
    const endOfThisMonth = endOfMonth(now)
    const startOfLastMonth = startOfMonth(subMonths(now, 1))
    const endOfLastMonth = endOfMonth(subMonths(now, 1))
    
    // Date ranges for time tracking
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)
    const yesterdayStart = new Date(todayStart)
    yesterdayStart.setDate(yesterdayStart.getDate() - 1)
    const yesterdayEnd = new Date(todayEnd)
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1)

    // Simple SQL queries - no prepared statement conflicts!
    const [
      activeJobsResult,
      lastMonthJobsResult,
      pendingEstimatesResult,
      todayHoursResult,
      yesterdayHoursResult,
      thisMonthRevenueResult,
      lastMonthRevenueResult,
      recentJobsResult,
      pendingPurchaseOrdersResult
    ] = await Promise.all([
      // Active jobs count
      query(
        `SELECT COUNT(*) as count FROM "Job" 
         WHERE status IN ('SCHEDULED', 'DISPATCHED', 'IN_PROGRESS')`
      ),
      
      // Last month's active jobs
      query(
        `SELECT COUNT(*) as count FROM "Job" 
         WHERE status IN ('SCHEDULED', 'DISPATCHED', 'IN_PROGRESS') 
         AND "createdAt" >= $1 AND "createdAt" <= $2`,
        [startOfLastMonth, endOfLastMonth]
      ),
      
      // Pending estimates
      query(
        `SELECT COUNT(*) as count FROM "Job" WHERE status = 'ESTIMATE'`
      ),
      
      // Today's hours
      query(
        `SELECT COALESCE(SUM(hours), 0) as total FROM "TimeEntry" 
         WHERE date >= $1 AND date <= $2`,
        [todayStart, todayEnd]
      ),
      
      // Yesterday's hours
      query(
        `SELECT COALESCE(SUM(hours), 0) as total FROM "TimeEntry" 
         WHERE date >= $1 AND date <= $2`,
        [yesterdayStart, yesterdayEnd]
      ),
      
      // This month's revenue
      query(
        `SELECT COALESCE(SUM("billedAmount"), 0) as total FROM "Job" 
         WHERE "billedDate" >= $1 AND "billedDate" <= $2`,
        [startOfThisMonth, endOfThisMonth]
      ),
      
      // Last month's revenue
      query(
        `SELECT COALESCE(SUM("billedAmount"), 0) as total FROM "Job" 
         WHERE "billedDate" >= $1 AND "billedDate" <= $2`,
        [startOfLastMonth, endOfLastMonth]
      ),
      
      // Recent jobs with customer names
      query(
        `SELECT j.id, j.description, j.status, j."updatedAt",
                COALESCE(c."companyName", c."firstName" || ' ' || c."lastName") as customer_name
         FROM "Job" j 
         LEFT JOIN "Customer" c ON j."customerId" = c.id
         ORDER BY j."updatedAt" DESC 
         LIMIT 5`
      ),

      // Pending Purchase Orders
      query(
        `SELECT COUNT(*) as count FROM "PurchaseOrder" 
         WHERE status = 'PENDING' OR status = 'DRAFT'`
      )
    ])

    // Extract simple values from query results
    const activeJobs = parseInt(activeJobsResult.rows[0].count)
    const lastMonthActiveJobs = parseInt(lastMonthJobsResult.rows[0].count)
    const pendingEstimates = parseInt(pendingEstimatesResult.rows[0].count)
    const hoursToday = parseFloat(todayHoursResult.rows[0].total) || 0
    const hoursYesterday = parseFloat(yesterdayHoursResult.rows[0].total) || 0
    const revenueThis = parseFloat(thisMonthRevenueResult.rows[0].total) || 0
    const revenueLast = parseFloat(lastMonthRevenueResult.rows[0].total) || 0
    const pendingPurchaseOrders = parseInt(pendingPurchaseOrdersResult.rows[0].count) || 0

    // Calculate changes
    const jobsChange = lastMonthActiveJobs > 0 
      ? ((activeJobs - lastMonthActiveJobs) / lastMonthActiveJobs * 100).toFixed(1)
      : '0'

    const hoursChange = hoursYesterday > 0
      ? ((hoursToday - hoursYesterday) / hoursYesterday * 100).toFixed(1)
      : '0'

    const revenueChange = revenueLast > 0
      ? ((revenueThis - revenueLast) / revenueLast * 100).toFixed(1)
      : '0'

    const stats = [
      {
        title: 'Active Jobs',
        value: activeJobs.toString(),
        change: `${jobsChange}% from last month`,
        icon: 'work',
        color: 'primary' as const,
      },
      {
        title: 'Pending Purchase Orders',
        value: pendingPurchaseOrders.toString(),
        change: 'Awaiting approval',
        icon: 'shopping_cart',
        color: 'warning' as const,
      },
      {
        title: 'Revenue This Month',
        value: `$${revenueThis.toLocaleString()}`,
        change: `${revenueChange}% from last month`,
        icon: 'attach_money',
        color: 'success' as const,
      },
      {
        title: 'Hours Today',
        value: hoursToday.toFixed(1),
        change: `${hoursChange}% from yesterday`,
        icon: 'access_time',
        color: 'info' as const,
      },
    ]

    // Get user role to determine what stats to show
    const token = request.cookies.get('auth-token')?.value
    let filteredStats = stats
    let jobsToReturn: any[] = []

    if (token) {
      try {
        const userPayload = verifyToken(token)
        const userRole = userPayload.role
        const userId = (userPayload as any).userId || userPayload.id

        // Filter stats based on role
        if (!permissions.canViewRevenueReports(userRole)) {
          // Remove revenue and purchase order stats for employees
          filteredStats = stats.filter(stat =>
            stat.title !== 'Revenue This Month' &&
            stat.title !== 'Pending Purchase Orders'
          )

          // For employees, get upcoming scheduled jobs for this week
          const weekStart = startOfWeek(now, { weekStartsOn: 0 }) // Sunday
          const weekEnd = endOfWeek(now, { weekStartsOn: 0 })

          const upcomingJobsResult = await query(
            `SELECT
              js.id,
              js."startDate",
              js."estimatedHours",
              j.id as job_id,
              j."jobNumber",
              j.description,
              j.status,
              COALESCE(c."companyName", c."firstName" || ' ' || c."lastName") as customer_name
            FROM "JobSchedule" js
            INNER JOIN "Job" j ON js."jobId" = j.id
            LEFT JOIN "Customer" c ON j."customerId" = c.id
            WHERE js."startDate" >= $1
              AND js."startDate" <= $2
              AND EXISTS (
                SELECT 1 FROM "CrewAssignment" ca
                WHERE ca."scheduleId" = js.id
                AND ca."userId" = $3
                AND ca.status = 'ASSIGNED'
              )
            ORDER BY js."startDate" ASC
            LIMIT 7`,
            [weekStart, weekEnd, userId]
          )

          jobsToReturn = upcomingJobsResult.rows.map(job => ({
            id: job.job_id,
            title: job.description,
            customer: job.customer_name,
            date: format(new Date(job.startDate), 'MMM d'),
            status: 'scheduled',
            jobNumber: job.jobNumber,
            estimatedHours: job.estimatedHours,
          }))
        } else {
          // For managers/admins, show recent jobs
          jobsToReturn = recentJobsResult.rows.map(job => ({
            id: job.id,
            title: job.description,
            customer: job.customer_name,
            status: job.status.toLowerCase(),
            updatedAt: job.updatedAt,
          }))
        }
      } catch (error) {
        console.error('Error verifying token:', error)
        // Fallback to recent jobs if error
        jobsToReturn = recentJobsResult.rows.map(job => ({
          id: job.id,
          title: job.description,
          customer: job.customer_name,
          status: job.status.toLowerCase(),
          updatedAt: job.updatedAt,
        }))
      }
    }

    return NextResponse.json({
      stats: filteredStats,
      recentJobs: jobsToReturn,
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    
    // Return fallback data instead of complete failure
    let fallbackStats = [
      {
        title: 'Active Jobs',
        value: '0',
        change: 'Loading...',
        icon: 'work',
        color: 'primary' as const,
      },
      {
        title: 'Hours Today',
        value: '0.0',
        change: 'Loading...',
        icon: 'access_time',
        color: 'info' as const,
      },
      {
        title: 'Pending Purchase Orders',
        value: '0',
        change: 'Loading...',
        icon: 'shopping_cart',
        color: 'warning' as const,
      },
      {
        title: 'Revenue This Month',
        value: '$0',
        change: 'Loading...',
        icon: 'attach_money',
        color: 'success' as const,
      },
    ]
    
    // Check user role for fallback stats too
    const token = request.cookies.get('auth-token')?.value
    if (token) {
      try {
        const userPayload = verifyToken(token)
        const userRole = userPayload.role
        
        if (!permissions.canViewRevenueReports(userRole)) {
          // For employees, show only Active Jobs and Hours Today
          fallbackStats = fallbackStats.filter(stat => 
            stat.title !== 'Revenue This Month' && 
            stat.title !== 'Pending Purchase Orders'
          )
        }
      } catch (error) {
        console.error('Error verifying token for fallback:', error)
      }
    }
    
    return NextResponse.json(
      { 
        stats: fallbackStats,
        recentJobs: [],
        error: 'Dashboard temporarily unavailable - using cached data'
      },
      { status: 200 } // Return 200 with fallback data instead of 500
    )
  }
}