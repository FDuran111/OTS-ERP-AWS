import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay()) // Start of current week

    // Get today's hours
    const todayEntries = await prisma.timeEntry.findMany({
      where: {
        ...(userId ? { userId } : {}),
        date: {
          gte: today,
          lt: tomorrow
        }
      }
    })

    const hoursToday = todayEntries.reduce((sum, entry) => {
      if (entry.endTime) {
        return sum + entry.hours
      } else {
        // Calculate current elapsed time for active timers
        const elapsed = (new Date().getTime() - entry.startTime.getTime()) / (1000 * 60 * 60)
        return sum + elapsed
      }
    }, 0)

    // Get active timers count
    const activeTimers = await prisma.timeEntry.count({
      where: {
        ...(userId ? { userId } : {}),
        endTime: null
      }
    })

    // Get this week's hours
    const weekEntries = await prisma.timeEntry.findMany({
      where: {
        ...(userId ? { userId } : {}),
        date: {
          gte: weekStart
        }
      }
    })

    const hoursThisWeek = weekEntries.reduce((sum, entry) => {
      if (entry.endTime) {
        return sum + entry.hours
      } else {
        // Calculate current elapsed time for active timers
        const elapsed = (new Date().getTime() - entry.startTime.getTime()) / (1000 * 60 * 60)
        return sum + elapsed
      }
    }, 0)

    // Get active employees (users with time entries today)
    const activeEmployees = await prisma.timeEntry.groupBy({
      by: ['userId'],
      where: {
        date: {
          gte: today,
          lt: tomorrow
        }
      }
    })

    const stats = [
      { 
        title: 'Hours Today', 
        value: `${Math.round(hoursToday * 10) / 10}`, 
        icon: 'timer', 
        color: '#1d8cf8' 
      },
      { 
        title: 'Active Timers', 
        value: activeTimers.toString(), 
        icon: 'play_arrow', 
        color: '#00bf9a' 
      },
      { 
        title: 'This Week', 
        value: `${Math.round(hoursThisWeek)}h`, 
        icon: 'today', 
        color: '#e14eca' 
      },
      { 
        title: 'Active Today', 
        value: activeEmployees.length.toString(), 
        icon: 'group', 
        color: '#fd5d93' 
      },
    ]

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Error fetching time stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch time statistics' },
      { status: 500 }
    )
  }
}