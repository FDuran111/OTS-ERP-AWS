import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

// Mock notifications for now - will be replaced with database queries
const getNotificationsForUser = (userId: string, role: string) => {
  const baseNotifications = []
  
  // Role-specific notifications
  if (role === 'EMPLOYEE') {
    baseNotifications.push(
      {
        id: '1',
        type: 'job',
        title: 'New Job Assignment',
        message: 'You have been assigned to a new job. Check your schedule for details.',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        read: false,
        priority: 'high',
        actionUrl: '/jobs'
      },
      {
        id: '2',
        type: 'schedule',
        title: 'Schedule Update',
        message: 'Your schedule for next week has been posted.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        read: false,
        priority: 'medium',
        actionUrl: '/schedule'
      }
    )
  } else if (role === 'FOREMAN') {
    baseNotifications.push(
      {
        id: '1',
        type: 'job',
        title: 'Job Completion Review',
        message: 'Job #2345 is ready for your review and approval.',
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        read: false,
        priority: 'high',
        actionUrl: '/jobs'
      },
      {
        id: '2',
        type: 'alert',
        title: 'Material Shortage',
        message: 'Low stock alert: Circuit breakers running low.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
        read: true,
        priority: 'medium',
        actionUrl: '/materials'
      }
    )
  } else if (role === 'OWNER_ADMIN') {
    baseNotifications.push(
      {
        id: '1',
        type: 'system',
        title: 'Weekly Report Ready',
        message: 'Your weekly performance report is ready for review.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        read: false,
        priority: 'medium',
        actionUrl: '/reports'
      },
      {
        id: '2',
        type: 'alert',
        title: 'Invoice Overdue',
        message: '3 invoices are overdue for payment.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
        read: false,
        priority: 'high',
        actionUrl: '/invoicing'
      }
    )
  }
  
  // Common notifications for all users
  baseNotifications.push(
    {
      id: '3',
      type: 'system',
      title: 'Time Entry Reminder',
      message: 'Please submit your time entries for this week.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      read: true,
      priority: 'low',
      actionUrl: '/time'
    }
  )
  
  return baseNotifications
}

export async function GET(request: NextRequest) {
  try {
    // Get auth token
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify token
    let userPayload
    try {
      userPayload = verifyToken(token)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Get notifications for user
    const notifications = getNotificationsForUser(userPayload.id, userPayload.role)

    return NextResponse.json({
      notifications,
      unreadCount: notifications.filter(n => !n.read).length
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Mark notification as read
export async function PATCH(request: NextRequest) {
  try {
    // Get auth token
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify token
    let userPayload
    try {
      userPayload = verifyToken(token)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const { notificationId, action } = await request.json()

    if (!notificationId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // In a real implementation, this would update the database
    // For now, just return success
    return NextResponse.json({
      success: true,
      message: `Notification ${notificationId} marked as ${action}`
    })
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}