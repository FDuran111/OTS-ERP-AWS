import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'
import { withRBAC } from '@/lib/rbac-middleware'

const createTimeEntrySchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
  phaseId: z.string().optional(),
  description: z.string().optional(),
  startTime: z.string().optional(), // ISO string, defaults to now
})

// GET all time entries
export const GET = withRBAC({
  requiredRoles: ['OWNER_ADMIN', 'FOREMAN', 'EMPLOYEE']
})(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const active = searchParams.get('active') === 'true'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build WHERE conditions
    const conditions = []
    const params = []
    let paramIndex = 1

    if (userId) {
      conditions.push(`te."userId" = $${paramIndex++}`)
      params.push(userId)
    }

    if (startDate && endDate) {
      conditions.push(`te.date >= $${paramIndex++}::date`)
      conditions.push(`te.date <= $${paramIndex++}::date`)
      params.push(startDate)
      params.push(endDate)
    }

    if (active) {
      conditions.push(`te."endTime" IS NULL`)
    }

    // Add status filter
    if (status) {
      conditions.push(`te."status" = $${paramIndex++}`)
      params.push(status)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const timeEntriesResult = await query(
      `SELECT
        te.*,
        te."regularHours",
        te."overtimeHours",
        te."doubleTimeHours",
        te."estimatedPay",
        te."status",
        te."submittedAt",
        te."submittedBy",
        te."approvedAt",
        te."approvedBy",
        te."rejectedAt",
        te."rejectedBy",
        te."rejectionReason",
        u.name as user_name,
        u.email as user_email,
        u."regularRate",
        u."overtimeRate",
        u."doubleTimeRate",
        COALESCE(j."jobNumber", te."jobId"::text) as "jobNumber",
        COALESCE(j.description, 'Job details pending') as job_description,
        COALESCE(c."companyName", 'Customer pending') as "companyName",
        c."firstName",
        c."lastName",
        p.name as phase_name
      FROM "TimeEntry" te
      INNER JOIN "User" u ON te."userId" = u.id
      LEFT JOIN "Job" j ON te."jobId" = j.id
      LEFT JOIN "Customer" c ON j."customerId" = c.id
      LEFT JOIN "JobPhase" p ON te."phaseId" = p.id
      ${whereClause}
      ORDER BY te."startTime" DESC
      LIMIT $${paramIndex}`,
      [...params, limit]
    )

    // Transform data for frontend
    const transformedEntries = timeEntriesResult.rows.map(entry => {
      const duration = entry.endTime
        ? Math.round((new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / (1000 * 60 * 60) * 100) / 100
        : null

      // Calculate estimated pay if not stored
      let estimatedPay = parseFloat(entry.estimatedPay || 0)
      if (!estimatedPay && entry.hours) {
        const regularRate = parseFloat(entry.regularRate) || 15.00
        const overtimeRate = parseFloat(entry.overtimeRate) || (regularRate * 1.5)
        const doubleTimeRate = parseFloat(entry.doubleTimeRate) || (regularRate * 2.0)

        estimatedPay =
          (parseFloat(entry.regularHours || 0) * regularRate) +
          (parseFloat(entry.overtimeHours || 0) * overtimeRate) +
          (parseFloat(entry.doubleTimeHours || 0) * doubleTimeRate)
      }

      return {
        id: entry.id,
        userId: entry.userId,
        userName: entry.user_name,
        userEmail: entry.user_email,
        jobId: entry.jobId,
        jobNumber: entry.jobNumber,
        jobTitle: entry.job_description,
        customer: entry.companyName || `${entry.firstName} ${entry.lastName}`,
        phaseId: entry.phaseId,
        phaseName: entry.phase_name,
        date: entry.date ? new Date(entry.date).toISOString().split('T')[0] : null,
        startTime: entry.startTime,
        endTime: entry.endTime,
        hours: parseFloat(entry.hours) || 0,
        regularHours: parseFloat(entry.regularHours || 0),
        overtimeHours: parseFloat(entry.overtimeHours || 0),
        doubleTimeHours: parseFloat(entry.doubleTimeHours || 0),
        categoryHours: entry.categoryHours || null,
        estimatedPay: estimatedPay,
        calculatedHours: duration,
        description: entry.description,
        synced: entry.synced || false,
        isActive: !entry.endTime,
        status: entry.status || 'draft',
        submittedAt: entry.submittedAt,
        submittedBy: entry.submittedBy,
        approvedAt: entry.approvedAt,
        approvedBy: entry.approvedBy,
        rejectedAt: entry.rejectedAt,
        rejectedBy: entry.rejectedBy,
        rejectionReason: entry.rejectionReason,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      }
    })

    return NextResponse.json(transformedEntries)
  } catch (error) {
    console.error('Error fetching time entries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch time entries' },
      { status: 500 }
    )
  }
})

// POST create a new time entry (start timer)
export const POST = withRBAC({
  requiredRoles: ['OWNER_ADMIN', 'FOREMAN', 'EMPLOYEE']
})(async (request: NextRequest) => {
  try {
    const body = await request.json()
    console.log('POST /api/time-entries - Request body:', body)
    const data = createTimeEntrySchema.parse(body)

    // Get current user (in a real app, this would come from authentication)
    const userId = body.userId || 'default-user-id' // Temporary fallback
    console.log('Using userId:', userId)

    // Check if user has an active timer
    const activeEntryResult = await query(
      'SELECT id FROM "TimeEntry" WHERE "userId" = $1 AND "endTime" IS NULL',
      [userId]
    )

    if (activeEntryResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'User already has an active timer running' },
        { status: 400 }
      )
    }

    const startTime = data.startTime ? new Date(data.startTime) : new Date()

    const timeEntryResult = await query(
      `INSERT INTO "TimeEntry" (
        id, "userId", "jobId", "phaseId", date, "startTime", hours, description,
        synced, "createdAt", "updatedAt"
      ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        userId,
        data.jobId,
        data.phaseId || null,
        startTime,
        startTime,
        0, // Will be calculated when timer stops
        data.description || null,
        false,
        new Date(),
        new Date()
      ]
    )

    const timeEntry = timeEntryResult.rows[0]

    // Get related data for response
    const [userResult, jobResult, phaseResult] = await Promise.all([
      query('SELECT id, name FROM "User" WHERE id = $1', [userId]),
      query('SELECT id, "jobNumber", description FROM "Job" WHERE id = $1', [data.jobId]),
      data.phaseId ? query('SELECT id, name FROM "JobPhase" WHERE id = $1', [data.phaseId]) : Promise.resolve({ rows: [] })
    ])

    const completeTimeEntry = {
      ...timeEntry,
      user: userResult.rows[0] || null,
      job: jobResult.rows[0] || null,
      phase: phaseResult.rows[0] || null
    }

    return NextResponse.json(completeTimeEntry, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating time entry:', error)
    return NextResponse.json(
      { error: 'Failed to create time entry' },
      { status: 500 }
    )
  }
})