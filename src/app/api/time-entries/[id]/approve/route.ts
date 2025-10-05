import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { timeTrackingNotifications } from '@/lib/time-tracking-notifications'

// POST - Approve a time entry
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resolvedParams = await params
    const entryId = resolvedParams.id

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

    const checkResult = await query(
      `SELECT te.*, u.name as "userName", u.email, j."jobNumber", j.description as "jobTitle"
       FROM "TimeEntry" te
       LEFT JOIN "User" u ON te."userId" = u.id
       LEFT JOIN "Job" j ON te."jobId" = j.id
       WHERE te.id = $1`,
      [entryId]
    )

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Time entry not found' },
        { status: 404 }
      )
    }

    const entry = checkResult.rows[0]

    if (entry.status === 'approved') {
      return NextResponse.json(
        { error: 'This entry has already been approved' },
        { status: 400 }
      )
    }

    const updateResult = await query(
      `UPDATE "TimeEntry"
       SET
         status = 'approved',
         "approvedAt" = NOW(),
         "approvedBy" = $2,
         "updatedAt" = NOW()
       WHERE id = $1
       RETURNING *`,
      [entryId, userId]
    )

    try {
      await query(
        `INSERT INTO "TimeEntryAudit" (entry_id, user_id, action, changes, notes, created_at)
         VALUES ($1, $2, 'APPROVE', $3, $4, NOW())`,
        [
          entryId,
          userId,
          JSON.stringify({ status: { from: entry.status, to: 'approved' } }),
          'Entry approved',
        ]
      )
    } catch (auditError) {
      console.log('[AUDIT] Failed to log approval:', auditError)
    }

    await timeTrackingNotifications.sendTimeEntryApprovedNotification({
      timeEntryId: entryId,
      employeeId: entry.userId,
      employeeName: entry.userName,
      employeeEmail: entry.email,
      date: new Date(entry.date).toLocaleDateString(),
      hours: parseFloat(entry.hours || 0),
      jobNumber: entry.jobNumber,
      jobTitle: entry.jobTitle,
    })

    return NextResponse.json({
      success: true,
      message: 'Time entry approved with notification sent',
      entry: updateResult.rows[0]
    })

  } catch (error: any) {
    console.error('Error approving time entry:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to approve time entry' },
      { status: 500 }
    )
  }
}