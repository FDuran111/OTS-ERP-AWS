import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { timeTrackingNotifications } from '@/lib/time-tracking-notifications'
import { createAudit, captureChanges } from '@/lib/audit-helper'
import { Pool } from 'pg'

// POST - Reject a time entry
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
    const userRole = userPayload.role

    if (!['ADMIN', 'MANAGER', 'HR_MANAGER', 'OWNER_ADMIN'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { rejectionReason } = body

    if (!rejectionReason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      )
    }

    await client.query('BEGIN')

    const checkResult = await client.query(
      `SELECT te.*, u.name as "userName", u.email, j."jobNumber", j.description as "jobTitle"
       FROM "TimeEntry" te
       LEFT JOIN "User" u ON te."userId" = u.id
       LEFT JOIN "Job" j ON te."jobId" = j.id
       WHERE te.id = $1`,
      [entryId]
    )

    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return NextResponse.json(
        { error: 'Time entry not found' },
        { status: 404 }
      )
    }

    const entry = checkResult.rows[0]

    const updateResult = await client.query(
      `UPDATE "TimeEntry"
       SET
         status = 'rejected',
         "hasRejectionNotes" = true,
         "updatedAt" = NOW()
       WHERE id = $1
       RETURNING *`,
      [entryId]
    )

    await client.query(
      `INSERT INTO "TimeEntryRejectionNote" 
       ("timeEntryId", "userId", "userRole", note, "isAdminNote", "createdAt")
       VALUES ($1, $2, $3, $4, true, NOW())`,
      [entryId, userId, userRole, rejectionReason]
    )

    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const changes = captureChanges(
      { 
        status: entry.status,
        rejectedBy: entry.rejectedBy,
        rejectedAt: entry.rejectedAt,
        rejectionReason: entry.rejectionReason
      },
      { 
        status: 'REJECTED',
        rejectedBy: userId,
        rejectedAt: new Date().toISOString(),
        rejectionReason
      }
    )

    await createAudit({
      entryId,
      userId: entry.userId,
      action: 'REJECT',
      changedBy: userId,
      changes,
      notes: rejectionReason,
      changeReason: rejectionReason,
      ipAddress,
      userAgent
    }, client)

    await client.query('COMMIT')

    const adminResult = await query(
      `SELECT name FROM "User" WHERE id = $1`,
      [userId]
    )
    const adminName = adminResult.rows[0]?.name || 'Admin'

    await timeTrackingNotifications.sendTimeEntryRejectedNotification({
      timeEntryId: entryId,
      employeeId: entry.userId,
      employeeName: entry.userName,
      employeeEmail: entry.email,
      date: new Date(entry.date).toLocaleDateString(),
      hours: parseFloat(entry.hours || 0),
      jobNumber: entry.jobNumber,
      jobTitle: entry.jobTitle,
      reason: rejectionReason,
      adminName,
    })

    return NextResponse.json({
      success: true,
      message: 'Time entry rejected with notification sent',
      entry: updateResult.rows[0]
    })

  } catch (error: any) {
    await client.query('ROLLBACK')
    console.error('Error rejecting time entry:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reject time entry' },
      { status: 500 }
    )
  } finally {
    client.release()
    await pool.end()
  }
}
