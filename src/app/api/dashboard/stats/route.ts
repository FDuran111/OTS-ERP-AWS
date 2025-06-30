import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'
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
    
    if (token) {
      try {
        const userPayload = verifyToken(token)
        const userRole = userPayload.role
        
        // Filter stats based on role
        if (!permissions.canViewRevenueReports(userRole)) {
          // Remove revenue stat for employees
          filteredStats = stats.filter(stat => stat.title !== 'Revenue This Month')
          
          // Replace with a different stat for employees
          filteredStats.push({
            title: 'Pending Estimates',
            value: pendingEstimates.toString(),
            change: 'Awaiting review',
            icon: 'pending_actions',
            color: 'warning' as const,
          })
        }
      } catch (error) {
        console.error('Error verifying token:', error)
      }
    }

    return NextResponse.json({
      stats: filteredStats,
      recentJobs: recentJobsResult.rows.map(job => ({
        id: job.id,
        title: job.description,
        customer: job.customer_name,
        status: job.status.toLowerCase(),
        updatedAt: job.updatedAt,
      }))
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    
    // Return fallback data instead of complete failure
    const fallbackStats = [
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
        color: 'success' as const,
      },
      {
        title: 'Revenue This Month',
        value: '$0',
        change: 'Loading...',
        icon: 'attach_money',
        color: 'warning' as const,
      },
      {
        title: 'Pending Estimates',
        value: '0',
        change: 'Loading...',
        icon: 'pending_actions',
        color: 'info' as const,
      },
    ]
    
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