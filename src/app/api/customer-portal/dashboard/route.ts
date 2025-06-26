import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyCustomerToken } from '@/lib/customer-auth'

export async function GET(request: NextRequest) {
  try {
    // Verify customer authentication
    const auth = await verifyCustomerToken(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get customer dashboard data
    const dashboardResult = await query(`
      SELECT 
        c.id as "customerId",
        c."companyName",
        COALESCE(c."firstName" || ' ' || c."lastName", c."companyName") as "contactName",
        c.email,
        c.phone,
        c.address,
        c.city,
        c.state,
        c.zip,
        -- Job statistics
        COUNT(DISTINCT j.id) as "totalJobs",
        COUNT(DISTINCT CASE WHEN j.status = 'SCHEDULED' THEN j.id END) as "scheduledJobs",
        COUNT(DISTINCT CASE WHEN j.status = 'IN_PROGRESS' THEN j.id END) as "inProgressJobs",
        COUNT(DISTINCT CASE WHEN j.status = 'COMPLETED' THEN j.id END) as "completedJobs",
        -- Financial summary (using available columns)
        COALESCE(SUM(CASE WHEN j.status = 'COMPLETED' THEN j."billedAmount" END), 0) as "totalBilled",
        COALESCE(SUM(CASE WHEN j.status = 'COMPLETED' AND j."billedDate" IS NOT NULL THEN j."billedAmount" END), 0) as "totalPaid",
        COALESCE(SUM(CASE WHEN j.status = 'COMPLETED' AND j."billedDate" IS NULL THEN j."billedAmount" END), 0) as "outstandingBalance",
        -- Recent activity
        MAX(j."scheduledDate") as "lastJobDate",
        COUNT(DISTINCT CASE WHEN cn."isRead" = false THEN cn.id END) as "unreadNotifications",
        COUNT(DISTINCT CASE WHEN cm."isRead" = false AND cm."recipientType" = 'CUSTOMER' THEN cm.id END) as "unreadMessages"
      FROM "Customer" c
      LEFT JOIN "Job" j ON c.id = j."customerId"
      LEFT JOIN "CustomerNotification" cn ON c.id = cn."customerId"
      LEFT JOIN "CustomerMessage" cm ON c.id = cm."customerId"
      WHERE c.id = $1
      GROUP BY c.id, c."companyName", c."firstName", c."lastName", c.email, c.phone, c.address, c.city, c.state, c.zip
    `, [auth.customerId])

    if (dashboardResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    const dashboard = dashboardResult.rows[0]

    // Get recent jobs
    const recentJobsResult = await query(`
      SELECT 
        j.id as "jobId",
        j."jobNumber",
        j.description,
        j.status,
        j.priority,
        j."jobType",
        j."scheduledDate",
        j."startDate",
        j."completedDate",
        j.address,
        j.city,
        j.state,
        j.zip,
        j."estimatedHours",
        j."actualHours",
        j."estimatedCost",
        j."actualCost",
        j."billedAmount",
        -- Progress tracking
        CASE 
          WHEN j.status = 'SCHEDULED' THEN 25
          WHEN j.status = 'IN_PROGRESS' THEN 50
          WHEN j.status = 'COMPLETED' THEN 100
          ELSE 0
        END as "progressPercentage"
      FROM "Job" j
      WHERE j."customerId" = $1
      ORDER BY j."scheduledDate" DESC, j."createdAt" DESC
      LIMIT 10
    `, [auth.customerId])

    // Get recent notifications
    const notificationsResult = await query(`
      SELECT 
        cn.id,
        cn.type,
        cn.title,
        cn.message,
        cn."isRead",
        cn."sentAt",
        cn."jobId",
        j."jobNumber"
      FROM "CustomerNotification" cn
      LEFT JOIN "Job" j ON cn."jobId" = j.id
      WHERE cn."customerId" = $1
      ORDER BY cn."sentAt" DESC
      LIMIT 5
    `, [auth.customerId])

    // Log dashboard access
    await query(`
      INSERT INTO "CustomerActivity" (
        "customerId", "activityType", description
      ) VALUES ($1, $2, $3)
    `, [auth.customerId, 'DASHBOARD_VIEW', 'Customer accessed dashboard'])

    return NextResponse.json({
      success: true,
      data: {
        dashboard: {
          ...dashboard,
          totalJobs: parseInt(dashboard.totalJobs),
          scheduledJobs: parseInt(dashboard.scheduledJobs),
          inProgressJobs: parseInt(dashboard.inProgressJobs),
          completedJobs: parseInt(dashboard.completedJobs),
          totalBilled: parseFloat(dashboard.totalBilled || 0),
          totalPaid: parseFloat(dashboard.totalPaid || 0),
          outstandingBalance: parseFloat(dashboard.outstandingBalance || 0),
          unreadNotifications: parseInt(dashboard.unreadNotifications),
          unreadMessages: parseInt(dashboard.unreadMessages)
        },
        recentJobs: recentJobsResult.rows.map(job => ({
          ...job,
          estimatedHours: parseFloat(job.estimatedHours || 0),
          actualHours: parseFloat(job.actualHours || 0),
          estimatedCost: parseFloat(job.estimatedCost || 0),
          actualCost: parseFloat(job.actualCost || 0),
          billedAmount: parseFloat(job.billedAmount || 0),
          progressPercentage: parseInt(job.progressPercentage)
        })),
        notifications: notificationsResult.rows
      }
    })

  } catch (error) {
    console.error('Error fetching customer dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}