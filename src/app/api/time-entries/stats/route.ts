import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

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

    // Build user filter
    const userFilter = userId ? 'AND "userId" = $2' : ''
    const userParams = userId ? [userId] : []

    // Get today's hours
    const todayQuery = `
      SELECT COALESCE(SUM(hours), 0) as total_hours, COUNT(*) as entry_count
      FROM "TimeEntry" 
      WHERE date >= $1 AND date < ${userId ? '$3' : '$2'}
      ${userFilter}
    `
    const todayParams = [today, tomorrow, ...userParams]
    const todayResult = await query(todayQuery, todayParams)
    const hoursToday = parseFloat(todayResult.rows[0]?.total_hours || 0)
    const entriesToday = parseInt(todayResult.rows[0]?.entry_count || 0)


    // Get this week's hours
    const weekQuery = `
      SELECT COALESCE(SUM(hours), 0) as total_hours
      FROM "TimeEntry" 
      WHERE date >= $1
      ${userFilter}
    `
    const weekParams = [weekStart, ...userParams]
    const weekResult = await query(weekQuery, weekParams)
    const hoursThisWeek = parseFloat(weekResult.rows[0]?.total_hours || 0)

    // Get active employees (users with time entries today)
    const activeEmployeesQuery = `
      SELECT COUNT(DISTINCT "userId") as count
      FROM "TimeEntry" 
      WHERE date >= $1 AND date < $2
    `
    const activeEmployeesResult = await query(activeEmployeesQuery, [today, tomorrow])
    const activeEmployeesCount = parseInt(activeEmployeesResult.rows[0]?.count || 0)

    const stats = [
      { 
        title: 'Hours Today', 
        value: `${Math.round(hoursToday * 10) / 10}`, 
        icon: 'timer', 
        color: '#1d8cf8' 
      },
      { 
        title: 'Entries Today', 
        value: entriesToday.toString(), 
        icon: 'today', 
        color: '#00bf9a' 
      },
      { 
        title: 'This Week', 
        value: `${Math.round(hoursThisWeek)}h`, 
        icon: 'today', 
        color: '#e14eca' 
      },
      { 
        title: 'Active Employees', 
        value: activeEmployeesCount.toString(), 
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