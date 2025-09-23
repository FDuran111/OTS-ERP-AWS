import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET available crew members for a date range
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate') || startDate

    if (!startDate) {
      return NextResponse.json(
        { error: 'Start date is required' },
        { status: 400 }
      )
    }

    // Get all users first
    const usersResult = await query(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.role
      FROM "User" u
      WHERE u.role IN ('EMPLOYEE', 'FOREMAN', 'OWNER_ADMIN')
      ORDER BY u.name
    `)

    // Get scheduled hours for each user in the date range
    const scheduledHoursResult = await query(`
      SELECT
        ca."userId",
        COALESCE(SUM(js."estimatedHours"), 0) as scheduled_hours
      FROM "CrewAssignment" ca
      INNER JOIN "JobSchedule" js ON ca."scheduleId" = js.id
      WHERE js."startDate" >= $1
        AND js."startDate" <= $2
        AND ca.status = 'ASSIGNED'
      GROUP BY ca."userId"
    `, [startDate, endDate])

    // Create a map of scheduled hours by user ID
    const scheduledHoursMap = new Map()
    scheduledHoursResult.rows.forEach(row => {
      scheduledHoursMap.set(row.userId, parseFloat(row.scheduled_hours) || 0)
    })

    // Get logged hours (actual time entries) for each user in the date range
    const loggedHoursResult = await query(`
      SELECT
        "userId",
        COALESCE(SUM(hours), 0) as logged_hours
      FROM "TimeEntry"
      WHERE date >= $1
        AND date <= $2
      GROUP BY "userId"
    `, [startDate, endDate])

    // Create a map of logged hours by user ID
    const loggedHoursMap = new Map()
    loggedHoursResult.rows.forEach(row => {
      loggedHoursMap.set(row.userId, parseFloat(row.logged_hours) || 0)
    })

    // Get conflict counts (overlapping schedules) for each user
    const conflictsResult = await query(`
      WITH user_schedules AS (
        SELECT
          ca."userId",
          js."startDate",
          js."endDate"
        FROM "CrewAssignment" ca
        INNER JOIN "JobSchedule" js ON ca."scheduleId" = js.id
        WHERE js."startDate" >= $1
          AND js."startDate" <= $2
          AND ca.status = 'ASSIGNED'
      )
      SELECT
        s1."userId",
        COUNT(DISTINCT s2."startDate") as conflicts
      FROM user_schedules s1
      INNER JOIN user_schedules s2
        ON s1."userId" = s2."userId"
        AND s1."startDate" != s2."startDate"
        AND (
          (s1."startDate" <= s2."startDate" AND s1."endDate" > s2."startDate")
          OR (s2."startDate" <= s1."startDate" AND s2."endDate" > s1."startDate")
        )
      GROUP BY s1."userId"
    `, [startDate, endDate])

    // Create a map of conflicts by user ID
    const conflictsMap = new Map()
    conflictsResult.rows.forEach(row => {
      conflictsMap.set(row.userId, parseInt(row.conflicts) || 0)
    })

    // Combine all data
    const availableCrew = usersResult.rows.map(user => {
      const scheduledHours = scheduledHoursMap.get(user.id) || 0
      const loggedHours = loggedHoursMap.get(user.id) || 0
      const totalCapacity = 40 // Standard 40-hour work week
      const availableHours = Math.max(0, totalCapacity - scheduledHours)

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        scheduledHours: scheduledHours,
        loggedHours: loggedHours,
        totalCapacity: totalCapacity,
        availableHours: availableHours,
        conflicts: conflictsMap.get(user.id) || 0
      }
    })

    return NextResponse.json(availableCrew)
  } catch (error) {
    console.error('Error fetching available crew:', error)
    return NextResponse.json(
      { error: 'Failed to fetch available crew' },
      { status: 500 }
    )
  }
}