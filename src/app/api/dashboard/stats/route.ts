import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, format } from 'date-fns'
import { permissions, stripPricingData } from '@/lib/permissions'
import { verifyToken } from '@/lib/auth'
import { cache, TTL } from '@/lib/cache'

export async function GET(request: NextRequest) {
  try {
    // STEP 1: Verify token and check cache FIRST (before any database work)
    const token = request.cookies.get('auth-token')?.value
    if (token) {
      try {
        const userPayload = verifyToken(token)
        const userRole = userPayload.role
        const userId = (userPayload as any).userId || userPayload.id
        
        // Check cache immediately for authenticated users
        const today = new Date().toISOString().split('T')[0]
        const cacheKey = `dashboard:stats:${userRole}:${userId}:${today}`
        const cached = cache.get(cacheKey)
        
        if (cached) {
          // Cache hit! Return immediately without any database queries
          return NextResponse.json(cached)
        }
        
        // Cache miss - continue to fetch data
      } catch (error) {
        // Token invalid - continue without cache but will return limited data
      }
    }

    // STEP 2: No cache hit - fetch fresh data from database
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
      pendingPurchaseOrdersResult,
      pendingReviewJobsResult
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

      // Pending Purchase Orders (awaiting approval)
      query(
        `SELECT COUNT(*) as count FROM "PurchaseOrder"
         WHERE status = 'PENDING_APPROVAL' OR status = 'DRAFT'`
      ),

      // Jobs pending admin review
      query(
        `SELECT j.*,
                COALESCE(c."companyName", c."firstName" || ' ' || c."lastName") as customer_name
         FROM "Job" j
         LEFT JOIN "Customer" c ON j."customerId" = c.id
         WHERE j.status = 'PENDING_REVIEW'
         ORDER BY j."updatedAt" DESC`
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
    const pendingReviewJobs = pendingReviewJobsResult.rows || []

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
        clickable: true,
        link: '/purchase-orders'
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

    // Get user role to determine what stats to show (reuse token from cache check)
    let filteredStats = stats
    let jobsToReturn: any[] = []

    if (token) {
      try {
        const userPayload = verifyToken(token)
        const userRole = userPayload.role
        const userId = (userPayload as any).userId || userPayload.id

        // Add pending review jobs count for admins
        if (permissions.canViewRevenueReports(userRole)) {
          // Always show the stat card, even if 0
          const pendingReviewStat = {
            title: 'Jobs Marked Done',
            value: pendingReviewJobs.length.toString(),
            change: pendingReviewJobs.length > 0 ? 'Awaiting closure' : 'All jobs closed',
            icon: 'pending_actions',
            color: 'warning' as const,
            clickable: true,
            link: '/jobs/pending-review'
          }
          // Insert after active jobs
          filteredStats.splice(1, 0, pendingReviewStat)
        }

        // Filter stats based on role
        if (!permissions.canViewRevenueReports(userRole)) {
          // Remove revenue and purchase order stats for employees
          filteredStats = stats.filter(stat =>
            stat.title !== 'Revenue This Month' &&
            stat.title !== 'Pending Purchase Orders'
          )

          // For employees, get upcoming scheduled jobs (today and future only)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
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
              COALESCE(c."companyName", c."firstName" || ' ' || c."lastName") as customer_name,
              EXISTS (
                SELECT 1 FROM "TimeEntry" te
                WHERE te."jobId" = j.id
                AND te."userId" = $3
                AND DATE(te.date) = DATE(js."startDate")
              ) as has_time_entry
            FROM "JobSchedule" js
            INNER JOIN "Job" j ON js."jobId" = j.id
            LEFT JOIN "Customer" c ON j."customerId" = c.id
            WHERE js."startDate" >= $1
              AND js."startDate" <= $2
              AND j.status NOT IN ('COMPLETED', 'CANCELLED')
              AND EXISTS (
                SELECT 1 FROM "CrewAssignment" ca
                WHERE ca."scheduleId" = js.id
                AND ca."userId" = $3
                AND ca.status = 'ASSIGNED'
              )
              AND NOT EXISTS (
                SELECT 1 FROM "TimeEntry" te
                WHERE te."jobId" = j.id
                AND te."userId" = $3
                AND DATE(te.date) = DATE(js."startDate")
              )
            ORDER BY js."startDate" ASC
            LIMIT 7`,
            [today, weekEnd, userId]
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

    // Check if user can see pending review jobs and prepare cache key for authenticated users
    let userCanSeeReviews = false
    let shouldCache = false
    let cacheKey = ''
    
    if (token) {
      try {
        const userPayload = verifyToken(token)
        userCanSeeReviews = permissions.canViewRevenueReports(userPayload.role)
        
        // Only cache for authenticated users with valid tokens
        const userId = (userPayload as any).userId || userPayload.id
        const today = new Date().toISOString().split('T')[0]
        cacheKey = `dashboard:stats:${userPayload.role}:${userId}:${today}`
        shouldCache = true
      } catch {
        userCanSeeReviews = false
        shouldCache = false
      }
    }

    // Prepare response
    const responseData = {
      stats: filteredStats,
      recentJobs: jobsToReturn,
      pendingReviewJobs: userCanSeeReviews ? pendingReviewJobs : [],
    }

    // Cache the response for 5 minutes (ONLY for authenticated users)
    if (shouldCache) {
      cache.set(cacheKey, responseData, TTL.FIVE_MINUTES)
    }

    return NextResponse.json(responseData)
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