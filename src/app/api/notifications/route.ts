import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get auth token
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify token and get user info
    let userPayload
    try {
      userPayload = verifyToken(token)
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = (userPayload as any).userId || userPayload.id

    // Fetch real notifications from database
    const notificationsResult = await query(
      `SELECT
        id,
        type,
        subject as title,
        message,
        metadata,
        status,
        "createdAt" as timestamp,
        "readAt",
        CASE
          WHEN type = 'JOB_PENDING_REVIEW' THEN 'high'
          WHEN type = 'JOB_ASSIGNED' THEN 'medium'
          ELSE 'low'
        END as priority
      FROM "NotificationLog"
      WHERE "userId" = $1
      ORDER BY "createdAt" DESC
      LIMIT 50`,
      [userId]
    )

    // Transform notifications to match frontend format
    const notifications = notificationsResult.rows.map(notif => {
      const metadata = notif.metadata || {}

      // Determine notification type for icon
      let notificationType = 'system'
      if (notif.type.includes('JOB')) {
        notificationType = 'job'
      } else if (notif.type.includes('SCHEDULE')) {
        notificationType = 'schedule'
      } else if (notif.type.includes('ALERT')) {
        notificationType = 'alert'
      }

      // Build action URL based on notification type
      let actionUrl = null
      if (notif.type === 'JOB_PENDING_REVIEW' && metadata.jobId) {
        actionUrl = '/jobs/pending-review'
      } else if (notif.type === 'TIME_ENTRY_REJECTED') {
        // Rejected entries should open the fix dialog (handled by NotificationCenter)
        // Just navigate to /time, the NotificationCenter will open the rejection dialog
        actionUrl = metadata.link || '/time'
      } else if (notif.type === 'TIME_ENTRY_APPROVED') {
        // Approved entries - just navigate to time page, no dialog
        actionUrl = metadata.link || '/time'
      } else if (metadata.jobId) {
        actionUrl = `/jobs/${metadata.jobId}`
      }

      return {
        id: notif.id,
        type: notificationType,
        title: notif.title,
        message: notif.message,
        timestamp: notif.timestamp,
        read: !!notif.readAt || notif.status === 'READ',
        priority: notif.priority,
        actionUrl,
        metadata
      }
    })

    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

// Mark notification as read
export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { notificationId, markAllRead } = body

    let userPayload
    try {
      userPayload = verifyToken(token)
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = (userPayload as any).userId || userPayload.id

    if (markAllRead) {
      // Mark all notifications as read for this user
      await query(
        `UPDATE "NotificationLog"
         SET status = 'READ',
             "readAt" = CURRENT_TIMESTAMP
         WHERE "userId" = $1 AND status = 'SENT'`,
        [userId]
      )
      return NextResponse.json({ success: true, message: 'All notifications marked as read' })
    } else if (notificationId) {
      // Mark specific notification as read
      await query(
        `UPDATE "NotificationLog"
         SET status = 'READ',
             "readAt" = CURRENT_TIMESTAMP
         WHERE id = $1 AND "userId" = $2`,
        [notificationId, userId]
      )
      return NextResponse.json({ success: true, message: 'Notification marked as read' })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    )
  }
}

// Delete notification
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const notificationId = searchParams.get('id')

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 })
    }

    let userPayload
    try {
      userPayload = verifyToken(token)
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = (userPayload as any).userId || userPayload.id

    // Soft delete - just mark as deleted
    await query(
      `UPDATE "NotificationLog"
       SET status = 'DELETED',
           "deletedAt" = CURRENT_TIMESTAMP
       WHERE id = $1 AND "userId" = $2`,
      [notificationId, userId]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting notification:', error)
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    )
  }
}