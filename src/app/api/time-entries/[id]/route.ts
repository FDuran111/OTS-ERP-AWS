import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'
import { calculateWeeklyHours, getWeekDateRange } from '@/lib/timeCalculations'
import { format } from 'date-fns'

const updateTimeEntrySchema = z.object({
  endTime: z.string().optional(),
  hours: z.number()
    .optional()
    .refine(
      (hours) => {
        if (hours === undefined) return true
        // Check if hours is in 0.25 increments (15-minute intervals)
        const remainder = (hours * 100) % 25
        return remainder === 0
      },
      { message: 'Hours must be in 15-minute (0.25 hour) increments' }
    ),
  description: z.string().optional(),
  jobId: z.string().optional(),
  date: z.string().optional(),
})

// GET a specific time entry
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const result = await query(
      `SELECT
        te.*,
        u.name as user_name,
        j."jobNumber",
        j.description as job_description,
        te."rejectionReason",
        te.status,
        te."hasRejectionNotes"
      FROM "TimeEntry" te
      LEFT JOIN "User" u ON te."userId" = u.id
      LEFT JOIN "Job" j ON te."jobId" = j.id
      WHERE te.id = $1`,
      [resolvedParams.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Time entry not found' },
        { status: 404 }
      )
    }

    const timeEntry = result.rows[0]

    // Transform to match expected format
    const transformedEntry = {
      id: timeEntry.id,
      startTime: timeEntry.startTime,
      endTime: timeEntry.endTime,
      hours: parseFloat(timeEntry.hours || 0),
      regularHours: parseFloat(timeEntry.regularHours || 0),
      overtimeHours: parseFloat(timeEntry.overtimeHours || 0),
      doubleTimeHours: parseFloat(timeEntry.doubleTimeHours || 0),
      estimatedPay: parseFloat(timeEntry.estimatedPay || 0),
      categoryHours: timeEntry.categoryHours || null,
      description: timeEntry.description,
      date: timeEntry.date,
      jobId: timeEntry.jobId,
      userId: timeEntry.userId,
      status: timeEntry.status,
      rejectionReason: timeEntry.rejectionReason,
      hasRejectionNotes: timeEntry.hasRejectionNotes,
      // Flat fields for compatibility
      jobNumber: timeEntry.jobNumber,
      job_description: timeEntry.job_description,
      user_name: timeEntry.user_name,
      // Nested structures
      user: {
        id: timeEntry.userId,
        name: timeEntry.user_name || 'Unknown User'
      },
      job: {
        id: timeEntry.jobId,
        jobNumber: timeEntry.jobNumber || 'Unknown Job',
        description: timeEntry.job_description || ''
      }
    }

    return NextResponse.json(transformedEntry)
  } catch (error) {
    console.error('Error fetching time entry:', error)
    return NextResponse.json(
      { error: 'Failed to fetch time entry' },
      { status: 500 }
    )
  }
}

// Helper function for safe recalculation with transaction support
async function recalculateWeeklyHours(
  entryId: string,
  userId: string,
  date: string,
  newHours: number,
  weekNumber: number
) {
  // Get overtime settings
  let overtimeSettings
  try {
    const settingsResult = await query(`
      SELECT * FROM "OvertimeSettings"
      WHERE "companyId" = '00000000-0000-0000-0000-000000000001'
      LIMIT 1
    `)

    if (settingsResult.rows.length > 0) {
      overtimeSettings = {
        dailyOTThreshold: parseFloat(settingsResult.rows[0].dailyOTThreshold),
        weeklyOTThreshold: parseFloat(settingsResult.rows[0].weeklyOTThreshold),
        dailyDTThreshold: parseFloat(settingsResult.rows[0].dailyDTThreshold),
        weeklyDTThreshold: parseFloat(settingsResult.rows[0].weeklyDTThreshold),
        otMultiplier: parseFloat(settingsResult.rows[0].otMultiplier),
        dtMultiplier: parseFloat(settingsResult.rows[0].dtMultiplier),
        seventhDayOT: settingsResult.rows[0].seventhDayOT,
        seventhDayDT: settingsResult.rows[0].seventhDayDT,
        useDailyOT: settingsResult.rows[0].useDailyOT ?? false,
        useWeeklyOT: settingsResult.rows[0].useWeeklyOT ?? true,
        roundingInterval: parseInt(settingsResult.rows[0].roundingInterval),
        roundingType: settingsResult.rows[0].roundingType
      }
    }
  } catch (error) {
    // Use default settings if table doesn't exist
    overtimeSettings = {
      dailyOTThreshold: 8,
      weeklyOTThreshold: 40,
      dailyDTThreshold: 12,
      weeklyDTThreshold: 60,
      otMultiplier: 1.5,
      dtMultiplier: 2.0,
      seventhDayOT: true,
      seventhDayDT: true,
      useDailyOT: false,
      useWeeklyOT: true,
      roundingInterval: 15,
      roundingType: 'nearest'
    }
  }

  // Get all entries for the week to recalculate with context
  const weekEntriesResult = await query(`
    SELECT id, date, hours, "userId"
    FROM "TimeEntry"
    WHERE "userId" = $1
    AND "weekNumber" = $2
    ORDER BY date ASC
  `, [userId, weekNumber])

  // Build the entries array with the updated hours - ensure dates are strings
  const allEntries = weekEntriesResult.rows.map(entry => ({
    id: entry.id,
    date: typeof entry.date === 'string' ? entry.date : format(entry.date, 'yyyy-MM-dd'),
    hours: entry.id === entryId ? newHours : parseFloat(entry.hours),
    userId: entry.userId
  }))

  // Calculate weekly hours with overtime/double-time
  const weeklyCalc = calculateWeeklyHours(allEntries, overtimeSettings!)

  // Get user pay rates for earnings calculation
  const userRatesResult = await query(
    'SELECT "regularRate", "overtimeRate", "doubleTimeRate" FROM "User" WHERE id = $1',
    [userId]
  )

  const rates = userRatesResult.rows[0] || {}
  const regularRate = parseFloat(rates.regularRate) || 15.00
  const overtimeRate = parseFloat(rates.overtimeRate) || (regularRate * 1.5)
  const doubleTimeRate = parseFloat(rates.doubleTimeRate) || (regularRate * 2.0)

  // Update all affected entries in the week
  const updates = []
  for (const entry of allEntries) {
    // Ensure we use string date for Map lookup
    const entryDateKey = typeof entry.date === 'string' ? entry.date : format(entry.date, 'yyyy-MM-dd')
    const dayBreakdown = weeklyCalc.entries.get(entryDateKey) || {
      regularHours: entry.hours,
      overtimeHours: 0,
      doubleTimeHours: 0,
      totalHours: entry.hours,
      consecutiveDay: 1,
      isSeventhDay: false
    }

    // Calculate estimated pay for this entry
    const estimatedPay =
      (dayBreakdown.regularHours * regularRate) +
      (dayBreakdown.overtimeHours * overtimeRate) +
      (dayBreakdown.doubleTimeHours * doubleTimeRate)

    // Update the entry with recalculated values
    updates.push(query(`
      UPDATE "TimeEntry"
      SET "regularHours" = $1,
          "overtimeHours" = $2,
          "doubleTimeHours" = $3,
          "estimatedPay" = $4,
          "consecutiveDay" = $5,
          "updatedAt" = NOW()
      WHERE id = $6
    `, [
      dayBreakdown.regularHours,
      dayBreakdown.overtimeHours,
      dayBreakdown.doubleTimeHours,
      estimatedPay,
      dayBreakdown.consecutiveDay,
      entry.id
    ]))
  }

  // Execute all updates
  await Promise.all(updates)

  // Return the breakdown for the specific entry being edited - ensure date is a string
  const dateKey = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd')
  const editedDayBreakdown = weeklyCalc.entries.get(dateKey)
  return {
    regularHours: editedDayBreakdown?.regularHours || newHours,
    overtimeHours: editedDayBreakdown?.overtimeHours || 0,
    doubleTimeHours: editedDayBreakdown?.doubleTimeHours || 0,
    estimatedPay: editedDayBreakdown ?
      (editedDayBreakdown.regularHours * regularRate) +
      (editedDayBreakdown.overtimeHours * overtimeRate) +
      (editedDayBreakdown.doubleTimeHours * doubleTimeRate) :
      newHours * regularRate
  }
}

// PATCH update a time entry with recalculation
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const body = await request.json()
    const data = updateTimeEntrySchema.parse(body)

    // First, get the current entry to check status and get needed info
    const currentEntryResult = await query(
      `SELECT
        te.*,
        te."weekNumber",
        te."userId",
        te.date,
        te."approvedAt"
      FROM "TimeEntry" te
      WHERE te.id = $1`,
      [resolvedParams.id]
    )

    if (currentEntryResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Time entry not found' },
        { status: 404 }
      )
    }

    const currentEntry = currentEntryResult.rows[0]

    // Check if entry is approved/locked (only for non-admins)
    // Admins can edit approved entries for corrections
    const userRole = body.userRole // Should be passed from frontend based on logged-in user
    if (currentEntry.approvedAt && userRole !== 'OWNER_ADMIN' && userRole !== 'FOREMAN') {
      return NextResponse.json(
        { error: 'This entry is unavailable for editing. Please contact your supervisor for changes.' },
        { status: 400 }
      )
    }

    // Check if entry is older than 14 days (only for employees)
    if (userRole === 'EMPLOYEE') {
      const entryDate = new Date(currentEntry.date)
      const today = new Date()
      const daysDifference = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))

      if (daysDifference > 14) {
        return NextResponse.json(
          { error: 'This entry is older than 14 days. Please contact your administrator to request changes.' },
          { status: 403 }
        )
      }
    }

    // If stopping the timer, calculate hours
    let calculatedHours = data.hours
    if (data.endTime && !calculatedHours) {
      const endTime = new Date(data.endTime)
      const startTime = new Date(currentEntry.startTime)
      // Calculate hours and round to nearest 15-minute increment
      const rawHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
      calculatedHours = Math.round(rawHours * 4) / 4
    }

    // Build update query
    const updateFields = []
    const updateParams = []
    let paramIndex = 1
    let needsRecalculation = false

    if (data.endTime) {
      updateFields.push(`"endTime" = $${paramIndex++}`)
      updateParams.push(new Date(data.endTime))
    }

    if (calculatedHours !== undefined) {
      updateFields.push(`hours = $${paramIndex++}`)
      updateParams.push(calculatedHours)
      needsRecalculation = true // Hours changed, need to recalculate
    }

    if (data.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`)
      updateParams.push(data.description)
    }

    if (data.jobId !== undefined) {
      updateFields.push(`"jobId" = $${paramIndex++}`)
      updateParams.push(data.jobId)
    }

    if (data.date !== undefined) {
      updateFields.push(`date = $${paramIndex++}`)
      updateParams.push(data.date)
      needsRecalculation = true // Date changed, affects week calculation
    }

    // If hours changed, recalculate overtime/double-time and pay
    let recalculatedValues = null
    if (needsRecalculation && calculatedHours !== undefined) {
      recalculatedValues = await recalculateWeeklyHours(
        resolvedParams.id,
        currentEntry.userId,
        data.date || currentEntry.date,
        calculatedHours,
        currentEntry.weekNumber
      )

      // Add recalculated fields to update
      updateFields.push(`"regularHours" = $${paramIndex++}`)
      updateParams.push(recalculatedValues.regularHours)

      updateFields.push(`"overtimeHours" = $${paramIndex++}`)
      updateParams.push(recalculatedValues.overtimeHours)

      updateFields.push(`"doubleTimeHours" = $${paramIndex++}`)
      updateParams.push(recalculatedValues.doubleTimeHours)

      updateFields.push(`"estimatedPay" = $${paramIndex++}`)
      updateParams.push(recalculatedValues.estimatedPay)
    }

    updateFields.push(`"updatedAt" = $${paramIndex++}`)
    updateParams.push(new Date())

    updateParams.push(resolvedParams.id)

    // Execute the update
    const updateResult = await query(
      `UPDATE "TimeEntry"
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      updateParams
    )

    if (updateResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Time entry not found' },
        { status: 404 }
      )
    }

    // Log the change for audit trail
    try {
      const { createAudit, captureChanges } = await import('@/lib/audit-helper')
      
      const oldSnapshot = {
        hours: currentEntry.hours,
        regularHours: currentEntry.regularHours,
        overtimeHours: currentEntry.overtimeHours,
        doubletimeHours: currentEntry.doubleTimeHours,
        totalPay: currentEntry.estimatedPay,
        jobId: currentEntry.jobId,
        date: currentEntry.date,
        description: currentEntry.description
      }
      
      const newSnapshot = {
        hours: calculatedHours || currentEntry.hours,
        regularHours: recalculatedValues?.regularHours || currentEntry.regularHours,
        overtimeHours: recalculatedValues?.overtimeHours || currentEntry.overtimeHours,
        doubletimeHours: recalculatedValues?.doubleTimeHours || currentEntry.doubleTimeHours,
        totalPay: recalculatedValues?.estimatedPay || currentEntry.estimatedPay,
        jobId: data.jobId || currentEntry.jobId,
        date: data.date || currentEntry.date,
        description: data.description || currentEntry.description
      }
      
      const changes = captureChanges(oldSnapshot, newSnapshot)
      
      const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                        request.headers.get('x-real-ip') || 
                        'unknown'
      const userAgent = request.headers.get('user-agent') || 'unknown'

      await createAudit({
        entryId: resolvedParams.id,
        userId: currentEntry.userId,
        action: 'UPDATE',
        changedBy: body.updatedBy || currentEntry.userId,
        changes,
        notes: 'Time entry updated',
        ipAddress,
        userAgent
      })
    } catch (auditError) {
      console.error('Audit log failed:', auditError)
    }

    // Get the updated entry with related data
    const result = await query(
      `SELECT
        te.*,
        u.name as user_name,
        j."jobNumber",
        j.description as job_description
      FROM "TimeEntry" te
      LEFT JOIN "User" u ON te."userId" = u.id
      LEFT JOIN "Job" j ON te."jobId" = j.id
      WHERE te.id = $1`,
      [resolvedParams.id]
    )

    const timeEntry = result.rows[0]

    const transformedEntry = {
      id: timeEntry.id,
      startTime: timeEntry.startTime,
      endTime: timeEntry.endTime,
      hours: parseFloat(timeEntry.hours || 0),
      regularHours: parseFloat(timeEntry.regularHours || 0),
      overtimeHours: parseFloat(timeEntry.overtimeHours || 0),
      doubleTimeHours: parseFloat(timeEntry.doubleTimeHours || 0),
      estimatedPay: parseFloat(timeEntry.estimatedPay || 0),
      description: timeEntry.description,
      date: timeEntry.date,
      user: {
        id: timeEntry.userId,
        name: timeEntry.user_name || 'Unknown User'
      },
      job: {
        id: timeEntry.jobId,
        jobNumber: timeEntry.jobNumber || 'Unknown Job',
        description: timeEntry.job_description || ''
      },
      recalculated: needsRecalculation // Let frontend know if recalculation occurred
    }

    return NextResponse.json(transformedEntry)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating time entry:', error)
    return NextResponse.json(
      { error: 'Failed to update time entry' },
      { status: 500 }
    )
  }
}

// PUT fully update a time entry with recalculation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const body = await request.json()

    // Get current entry info first
    const currentEntryResult = await query(
      `SELECT * FROM "TimeEntry" WHERE id = $1`,
      [resolvedParams.id]
    )

    if (currentEntryResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Time entry not found' },
        { status: 404 }
      )
    }

    const currentEntry = currentEntryResult.rows[0]

    // Check if entry is approved/locked
    if (currentEntry.approvedAt) {
      return NextResponse.json(
        { error: 'Cannot edit approved time entries' },
        { status: 403 }
      )
    }

    // Get week number for the new date
    const { weekNumber } = getWeekDateRange(new Date(body.date))

    // Recalculate if hours changed
    let recalculatedValues = null
    if (body.hours !== currentEntry.hours) {
      // Ensure date is a string for the recalculation
      const dateString = typeof body.date === 'string' ? body.date : format(body.date, 'yyyy-MM-dd')
      recalculatedValues = await recalculateWeeklyHours(
        resolvedParams.id,
        currentEntry.userId,
        dateString,
        body.hours,
        weekNumber
      )
    }

    // Update the time entry with all fields
    const updateResult = await query(
      `UPDATE "TimeEntry"
       SET "jobId" = $1,
           date = $2,
           hours = $3,
           description = $4,
           "weekNumber" = $5,
           "regularHours" = $6,
           "overtimeHours" = $7,
           "doubleTimeHours" = $8,
           "estimatedPay" = $9,
           status = $10,
           "submittedAt" = $11,
           "rejectionReason" = $12,
           "hasRejectionNotes" = $13,
           "updatedAt" = NOW()
       WHERE id = $14
       RETURNING *`,
      [
        body.jobId,
        body.date,
        body.hours,
        body.description || null,
        weekNumber,
        recalculatedValues?.regularHours || currentEntry.regularHours,
        recalculatedValues?.overtimeHours || currentEntry.overtimeHours,
        recalculatedValues?.doubleTimeHours || currentEntry.doubleTimeHours,
        recalculatedValues?.estimatedPay || currentEntry.estimatedPay,
        body.status || currentEntry.status,
        body.status === 'submitted' ? new Date() : currentEntry.submittedAt,
        body.status === 'submitted' ? null : currentEntry.rejectionReason,
        currentEntry.hasRejectionNotes, // Keep rejection notes even after resubmit
        resolvedParams.id
      ]
    )

    if (updateResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Time entry not found' },
        { status: 404 }
      )
    }

    // If status changed from rejected to submitted, notify admins
    if (currentEntry.status === 'rejected' && body.status === 'submitted') {
      try {
        // Get employee and job info
        const entryInfoResult = await query(
          `SELECT
            te.id,
            te.date,
            te.hours,
            u.id as "userId",
            u.name as "userName",
            u.email as "userEmail",
            j."jobNumber",
            j.description as "jobTitle"
          FROM "TimeEntry" te
          LEFT JOIN "User" u ON te."userId" = u.id
          LEFT JOIN "Job" j ON te."jobId" = j.id
          WHERE te.id = $1`,
          [resolvedParams.id]
        )

        if (entryInfoResult.rows.length > 0) {
          const entryInfo = entryInfoResult.rows[0]

          // Get all admins
          const adminsResult = await query(
            `SELECT id, email, name
             FROM "User"
             WHERE role IN ('OWNER_ADMIN', 'FOREMAN')
             AND active = true`
          )

          // Create notifications for all admins
          for (const admin of adminsResult.rows) {
            await query(
              `INSERT INTO "NotificationLog"
              ("userId", type, subject, message, metadata, status, channel, "createdAt")
              VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
              [
                admin.id,
                'TIME_ENTRY_RESUBMITTED',
                'Time Entry Resubmitted',
                `${entryInfo.userName} resubmitted a time entry for ${entryInfo.date} (${entryInfo.hours} hours${entryInfo.jobNumber ? ` on job ${entryInfo.jobNumber}` : ''}) for approval.`,
                JSON.stringify({
                  timeEntryId: entryInfo.id,
                  employeeId: entryInfo.userId,
                  employeeName: entryInfo.userName,
                  date: entryInfo.date,
                  hours: entryInfo.hours,
                  jobNumber: entryInfo.jobNumber,
                  resubmitted: true,
                }),
                'PENDING',
                'IN_APP',
              ]
            )
          }
        }
      } catch (notifError) {
        console.error('Error creating resubmit notifications:', notifError)
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json(updateResult.rows[0])
  } catch (error) {
    console.error('Error updating time entry:', error)
    return NextResponse.json(
      { error: 'Failed to update time entry' },
      { status: 500 }
    )
  }
}

// DELETE a time entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const body = await request.json().catch(() => ({}))
    const deletedBy = body.deletedBy || 'unknown'
    const deleteReason = body.reason || 'Entry deleted'

    // Get entry details before deletion for audit and recalculation
    const entryResult = await query(
      `SELECT te.*, u.name as "userName", j."jobNumber", j.description as "jobTitle"
       FROM "TimeEntry" te
       LEFT JOIN "User" u ON te."userId" = u.id
       LEFT JOIN "Job" j ON te."jobId" = j.id
       WHERE te.id = $1`,
      [resolvedParams.id]
    )

    if (entryResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Time entry not found' },
        { status: 404 }
      )
    }

    const entry = entryResult.rows[0]

    // Log deletion in audit trail before actually deleting
    try {
      const { createAudit } = await import('@/lib/audit-helper')
      
      const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                        request.headers.get('x-real-ip') || 
                        'unknown'
      const userAgent = request.headers.get('user-agent') || 'unknown'

      await createAudit({
        entryId: resolvedParams.id,
        userId: entry.userId,
        action: 'DELETE',
        changedBy: deletedBy,
        changes: {
          status: { from: entry.status, to: 'DELETED' },
          hours: { from: entry.hours, to: 0 }
        },
        notes: deleteReason,
        changeReason: deleteReason,
        ipAddress,
        userAgent
      })
    } catch (auditError) {
      console.error('Audit log failed:', auditError)
    }

    // Delete the entry
    const result = await query(
      'DELETE FROM "TimeEntry" WHERE id = $1 RETURNING id',
      [resolvedParams.id]
    )

    // After deletion, recalculate the week for remaining entries
    // This ensures overtime calculations remain correct
    await recalculateWeeklyHours(
      '', // No specific entry ID since it's deleted
      entry.userId,
      entry.date,
      0, // Zero hours since entry is deleted
      entry.weekNumber
    )

    return NextResponse.json({ 
      success: true,
      message: `Time entry deleted: ${entry.hours} hours on ${entry.date} for ${entry.jobNumber || 'Unknown Job'}`
    })
  } catch (error) {
    console.error('Error deleting time entry:', error)
    return NextResponse.json(
      { error: 'Failed to delete time entry' },
      { status: 500 }
    )
  }
}