import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { calculateWeeklyHours, calculateDailyBreakdown } from '@/lib/timeCalculations'
import { format, startOfWeek, endOfWeek } from 'date-fns'

// POST /api/time-entries/bulk - Create multiple time entries at once
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { entries, userId, date, currentUserId } = data

    // Validate input
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: 'No entries provided' },
        { status: 400 }
      )
    }

    if (!userId || !date) {
      return NextResponse.json(
        { error: 'User ID and date are required' },
        { status: 400 }
      )
    }

    // Check for duplicate jobs in the submission
    const jobIds = entries.map(e => e.jobId)
    const uniqueJobIds = new Set(jobIds)
    if (jobIds.length !== uniqueJobIds.size) {
      return NextResponse.json(
        { error: 'Cannot have duplicate jobs in the same submission' },
        { status: 400 }
      )
    }

    // Calculate total hours for the day
    const totalHours = entries.reduce((sum, entry) => sum + (entry.hours || 0), 0)
    if (totalHours > 24) {
      return NextResponse.json(
        { error: 'Total hours cannot exceed 24 hours per day' },
        { status: 400 }
      )
    }

    // Get existing entries for the week to calculate overtime correctly
    const weekStart = startOfWeek(new Date(date), { weekStartsOn: 1 })
    const weekEnd = endOfWeek(new Date(date), { weekStartsOn: 1 })

    const existingEntriesResult = await query(
      `SELECT id, date, hours, "userId"
       FROM "TimeEntry"
       WHERE "userId" = $1
       AND date >= $2
       AND date <= $3
       AND date != $4
       ORDER BY date ASC`,
      [
        userId,
        format(weekStart, 'yyyy-MM-dd'),
        format(weekEnd, 'yyyy-MM-dd'),
        date
      ]
    )

    // Convert existing entries to the format expected by calculateWeeklyHours
    const existingEntries = existingEntriesResult.rows.map(row => ({
      date: typeof row.date === 'string' ? row.date : format(row.date, 'yyyy-MM-dd'),
      hours: parseFloat(row.hours),
      userId: row.userId
    }))

    // Get overtime settings (use defaults if not found)
    const settingsResult = await query(
      'SELECT * FROM "OvertimeSettings" LIMIT 1'
    )

    const settings = settingsResult.rows[0] || {
      dailyOTThreshold: 8,
      dailyDTThreshold: 12,
      weeklyOTThreshold: 40,
      weeklyDTThreshold: 60,
      seventhDayOT: true,
      useWeeklyOT: true,
      roundingInterval: 0.25,
      roundingType: 'STANDARD' as const
    }

    // Add new entries to calculate breakdown
    const allEntriesForCalculation = [
      ...existingEntries,
      ...entries.map(entry => ({
        date: date,
        hours: entry.hours,
        userId: userId
      }))
    ]

    // Calculate the weekly breakdown with overtime
    const weeklyBreakdown = calculateWeeklyHours(allEntriesForCalculation, settings)

    // Find the breakdown for our specific date
    const dailyBreakdown = weeklyBreakdown.entries.get(date)

    if (!dailyBreakdown) {
      return NextResponse.json(
        { error: 'Failed to calculate daily breakdown' },
        { status: 500 }
      )
    }

    // Get user's pay rates for cost calculation
    const userResult = await query(
      'SELECT "regularRate", "overtimeRate", "doubleTimeRate" FROM "User" WHERE id = $1',
      [userId]
    )

    const user = userResult.rows[0]
    const regularRate = parseFloat(user?.regularRate || '15')
    const overtimeRate = parseFloat(user?.overtimeRate || '22.50')
    const doubleTimeRate = parseFloat(user?.doubleTimeRate || '30')

    // Calculate how to distribute the overtime across jobs
    // We'll distribute proportionally based on hours
    const regularHoursPerJob = entries.map(entry => {
      const proportion = entry.hours / totalHours
      return {
        ...entry,
        regularHours: dailyBreakdown.regularHours * proportion,
        overtimeHours: dailyBreakdown.overtimeHours * proportion,
        doubleTimeHours: dailyBreakdown.doubleTimeHours * proportion
      }
    })

    // Begin transaction by creating all entries
    const createdEntries = []

    for (const entry of regularHoursPerJob) {
      // Check if entry already exists for this job/date/user
      const existingEntry = await query(
        'SELECT id FROM "TimeEntry" WHERE "jobId" = $1 AND date = $2 AND "userId" = $3',
        [entry.jobId, date, userId]
      )

      if (existingEntry.rows.length > 0) {
        return NextResponse.json(
          { error: `Time entry already exists for job ${entry.jobId} on ${date}` },
          { status: 400 }
        )
      }

      // Calculate estimated pay for this entry
      const estimatedPay =
        (entry.regularHours * regularRate) +
        (entry.overtimeHours * overtimeRate) +
        (entry.doubleTimeHours * doubleTimeRate)

      // Create synthetic start/end times for bulk entries
      // Parse date string as local date (YYYY-MM-DD format)
      const [year, month, day] = date.split('-').map(Number)
      // Start times staggered based on index to avoid overlaps
      const entryIndex = regularHoursPerJob.indexOf(entry)
      const startHour = 8 + (entryIndex * 0.25) // Stagger by 15 minutes
      const startTime = new Date(year, month - 1, day, Math.floor(startHour), (startHour % 1) * 60, 0)
      const endTime = new Date(startTime.getTime() + (entry.hours * 60 * 60 * 1000))

      // Create the time entry
      const timeEntryResult = await query(
        `INSERT INTO "TimeEntry" (
          id, "jobId", "userId", date, "startTime", "endTime", hours,
          "regularHours", "overtimeHours", "doubleTimeHours",
          "estimatedPay", description, "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        ) RETURNING *`,
        [
          entry.jobId,
          userId,
          date,
          startTime,
          endTime,
          entry.hours,
          entry.regularHours,
          entry.overtimeHours,
          entry.doubleTimeHours,
          estimatedPay,
          entry.description || null,
          new Date(),
          new Date()
        ]
      )

      const timeEntry = timeEntryResult.rows[0]

      // Log CREATE action for audit trail
      try {
        console.log('[AUDIT] Creating bulk audit entry for time entry:', timeEntry.id)
        await query(`
          INSERT INTO "TimeEntryAudit" (
            id, entry_id, user_id, action,
            old_hours, new_hours,
            old_regular, new_regular,
            old_overtime, new_overtime,
            old_doubletime, new_doubletime,
            old_pay, new_pay,
            changed_by, changed_at
          ) VALUES (
            gen_random_uuid(), $1, $2, 'CREATE',
            NULL, $3,
            NULL, $4,
            NULL, $5,
            NULL, $6,
            NULL, $7,
            $8, NOW()
          )
        `, [
          timeEntry.id,
          userId,
          entry.hours,
          entry.regularHours,
          entry.overtimeHours,
          entry.doubleTimeHours,
          estimatedPay,
          currentUserId || userId // Use the actual current user if provided, otherwise fall back to entry user
        ])
        console.log('[AUDIT] Successfully created bulk audit entry')
      } catch (auditError) {
        console.error('[AUDIT] Failed to create bulk audit entry:', auditError)
      }

      createdEntries.push(timeEntry)
    }

    // Return success with created entries
    return NextResponse.json({
      success: true,
      created: createdEntries.length,
      entries: createdEntries,
      breakdown: dailyBreakdown
    })

  } catch (error: any) {
    console.error('Error creating bulk time entries:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create time entries' },
      { status: 500 }
    )
  }
}