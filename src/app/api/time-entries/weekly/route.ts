import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { withRBAC } from '@/lib/rbac-middleware'
import { verifyToken } from '@/lib/auth'

// GET weekly timesheet
export const GET = withRBAC({
  requiredRoles: ['OWNER_ADMIN', 'FOREMAN', 'EMPLOYEE']
})(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const weekStart = searchParams.get('weekStart')
    const weekEnd = searchParams.get('weekEnd')

    if (!userId || !weekStart || !weekEnd) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Get user from token to check permissions
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userPayload = verifyToken(token)

    // Employees can only view their own timesheets
    if (userPayload.role === 'EMPLOYEE' && userPayload.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch time entries for the week
    const entriesResult = await query(
      `SELECT
        te.*,
        j."jobNumber",
        j.description as job_title,
        c."companyName",
        c."firstName",
        c."lastName"
      FROM "TimeEntry" te
      INNER JOIN "Job" j ON te."jobId" = j.id
      INNER JOIN "Customer" c ON j."customerId" = c.id
      WHERE te."userId" = $1
        AND te.date >= $2::date
        AND te.date <= $3::date
      ORDER BY te.date, te."jobId"`,
      [userId, weekStart, weekEnd]
    )

    // Transform entries into weekly grid format
    const jobMap = new Map()

    for (const entry of entriesResult.rows) {
      if (!jobMap.has(entry.jobId)) {
        jobMap.set(entry.jobId, {
          id: entry.jobId,
          jobId: entry.jobId,
          job: {
            id: entry.jobId,
            jobNumber: entry.jobNumber,
            title: entry.job_title,
            customer: entry.companyName || `${entry.firstName} ${entry.lastName}`
          },
          hours: {
            monday: 0,
            tuesday: 0,
            wednesday: 0,
            thursday: 0,
            friday: 0,
            saturday: 0,
            sunday: 0,
          },
          notes: entry.description || ''
        })
      }

      const row = jobMap.get(entry.jobId)
      const dayOfWeek = new Date(entry.date).getDay()
      const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek]
      row.hours[dayName] = parseFloat(entry.hours) || 0
    }

    // For now, just return draft status since we don't have TimesheetWeek table yet
    const status = 'draft'

    return NextResponse.json({
      rows: Array.from(jobMap.values()),
      status,
      submittedAt: null,
      approvedAt: null,
      approvedBy: null
    })
  } catch (error) {
    console.error('Error fetching weekly timesheet:', error)
    return NextResponse.json(
      { error: 'Failed to fetch timesheet' },
      { status: 500 }
    )
  }
})

// POST save/submit weekly timesheet
export const POST = withRBAC({
  requiredRoles: ['OWNER_ADMIN', 'FOREMAN', 'EMPLOYEE']
})(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { userId, weekStart, rows, status, action } = body

    // Get user from token
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userPayload = verifyToken(token)

    // Employees can only save their own timesheets
    if (userPayload.role === 'EMPLOYEE' && userPayload.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Start transaction
    await query('BEGIN')

    try {
      // Delete existing entries for the week
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)

      await query(
        `DELETE FROM "TimeEntry"
        WHERE "userId" = $1
          AND date >= $2::date
          AND date <= $3::date`,
        [userId, weekStart, weekEnd.toISOString().split('T')[0]]
      )

      // Insert new entries
      for (const row of rows) {
        if (!row.jobId) continue

        for (const [day, hours] of Object.entries(row.hours)) {
          if (hours === 0) continue

          const dayIndex = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(day)
          const entryDate = new Date(weekStart)
          entryDate.setDate(entryDate.getDate() + dayIndex)

          await query(
            `INSERT INTO "TimeEntry" (
              id, "userId", "jobId", date, "startTime", "endTime", hours, description,
              "createdAt", "updatedAt"
            ) VALUES (
              gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
            )`,
            [
              userId,
              row.jobId,
              entryDate.toISOString().split('T')[0],
              new Date(entryDate.setHours(8, 0, 0, 0)), // Default 8 AM start
              new Date(entryDate.setHours(8 + Number(hours), 0, 0, 0)), // End time based on hours
              hours,
              row.notes || null
            ]
          )
        }
      }

      // Skip TimesheetWeek table operations for now
      // TODO: Add this back when TimesheetWeek table is created

      await query('COMMIT')

      return NextResponse.json({ success: true })
    } catch (error) {
      await query('ROLLBACK')
      throw error
    }
  } catch (error) {
    console.error('Error saving weekly timesheet:', error)
    return NextResponse.json(
      { error: 'Failed to save timesheet' },
      { status: 500 }
    )
  }
})