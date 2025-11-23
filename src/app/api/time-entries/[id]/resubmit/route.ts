import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { createAudit, captureChanges } from '@/lib/audit-helper'
import { Pool } from 'pg'

// POST - Resubmit a rejected time entry with corrections
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  const entryId = resolvedParams.id

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  const client = await pool.connect()

  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userPayload = verifyToken(token)
    const userId = userPayload.id

    const body = await request.json().catch(() => ({}))
    const { hours, regularHours, overtimeHours, doubleTimeHours, description, responseNote } = body

    await client.query('BEGIN')

    // Get the existing entry
    const entryResult = await client.query(
      `SELECT te.*, u.name as "userName"
       FROM "TimeEntry" te
       LEFT JOIN "User" u ON te."userId" = u.id
       WHERE te.id = $1`,
      [entryId]
    )

    if (entryResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Time entry not found' }, { status: 404 })
    }

    const entry = entryResult.rows[0]

    // Only the owner can resubmit their own entry
    if (entry.userId !== userId) {
      await client.query('ROLLBACK')
      return NextResponse.json(
        { error: 'You can only resubmit your own time entries' },
        { status: 403 }
      )
    }

    // Can only resubmit rejected entries
    if (entry.status !== 'rejected') {
      await client.query('ROLLBACK')
      return NextResponse.json(
        { error: 'Only rejected entries can be resubmitted' },
        { status: 400 }
      )
    }

    // Build update query with provided fields
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    // Required: update status back to submitted
    updates.push(`status = 'submitted'`)
    updates.push(`"submittedAt" = NOW()`)
    updates.push(`"submittedBy" = $${paramIndex++}`)
    values.push(userId)

    // Clear rejection fields
    updates.push(`"rejectedAt" = NULL`)
    updates.push(`"rejectedBy" = NULL`)
    updates.push(`"rejectionReason" = NULL`)

    // Optional updates for corrections
    if (hours !== undefined) {
      updates.push(`hours = $${paramIndex++}`)
      values.push(hours)
    }
    if (regularHours !== undefined) {
      updates.push(`"regularHours" = $${paramIndex++}`)
      values.push(regularHours)
    }
    if (overtimeHours !== undefined) {
      updates.push(`"overtimeHours" = $${paramIndex++}`)
      values.push(overtimeHours)
    }
    if (doubleTimeHours !== undefined) {
      updates.push(`"doubleTimeHours" = $${paramIndex++}`)
      values.push(doubleTimeHours)
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`)
      values.push(description)
    }

    updates.push(`"updatedAt" = NOW()`)

    // Add entry ID as last parameter
    values.push(entryId)

    const updateResult = await client.query(
      `UPDATE "TimeEntry"
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    )

    const updatedEntry = updateResult.rows[0]

    // Add response note if provided
    if (responseNote) {
      await client.query(
        `INSERT INTO "TimeEntryRejectionNote"
         ("timeEntryId", "userId", "userRole", note, "isAdminNote", "createdAt")
         VALUES ($1, $2, $3, $4, false, NOW())`,
        [entryId, userId, userPayload.role || 'EMPLOYEE', responseNote]
      )
    }

    // Create audit record
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                      request.headers.get('x-real-ip') ||
                      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const changes = captureChanges(
      {
        status: entry.status,
        hours: entry.hours,
        regularHours: entry.regularHours,
        overtimeHours: entry.overtimeHours,
        doubleTimeHours: entry.doubleTimeHours,
        description: entry.description
      },
      {
        status: 'submitted',
        hours: hours ?? entry.hours,
        regularHours: regularHours ?? entry.regularHours,
        overtimeHours: overtimeHours ?? entry.overtimeHours,
        doubleTimeHours: doubleTimeHours ?? entry.doubleTimeHours,
        description: description ?? entry.description
      }
    )

    await createAudit({
      entryId,
      userId: entry.userId,
      action: 'RESUBMIT',
      changedBy: userId,
      changes,
      notes: responseNote || 'Entry resubmitted after rejection',
      ipAddress,
      userAgent
    }, client)

    await client.query('COMMIT')

    return NextResponse.json({
      success: true,
      message: 'Time entry resubmitted successfully',
      entry: updatedEntry
    })

  } catch (error: any) {
    await client.query('ROLLBACK')
    console.error('Error resubmitting time entry:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to resubmit time entry' },
      { status: 500 }
    )
  } finally {
    client.release()
    await pool.end()
  }
}
