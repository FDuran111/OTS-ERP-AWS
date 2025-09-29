import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// POST - Submit a time entry for approval
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resolvedParams = await params
    const entryId = resolvedParams.id

    // Get the current user from the request body (sent by client)
    const body = await request.json().catch(() => ({}))
    const submittedBy = body.submittedBy

    // Check if the time entry exists
    const checkResult = await query(
      'SELECT id, "userId", date, hours, "approvedAt" FROM "TimeEntry" WHERE id = $1',
      [entryId]
    )

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Time entry not found' },
        { status: 404 }
      )
    }

    const entry = checkResult.rows[0]

    // Check if already approved
    if (entry.approvedAt) {
      return NextResponse.json(
        { error: 'This entry has already been approved and cannot be resubmitted' },
        { status: 400 }
      )
    }

    // Update the time entry to mark it as submitted
    const updateResult = await query(
      `UPDATE "TimeEntry"
       SET
         status = 'submitted',
         "submittedAt" = NOW(),
         "submittedBy" = $2,
         "updatedAt" = NOW()
       WHERE id = $1
       RETURNING *`,
      [entryId, submittedBy || entry.userId]
    )

    // Log the submission in audit trail
    try {
      await query(`
        INSERT INTO "TimeEntryAudit" (
          id, entry_id, user_id, action,
          old_hours, new_hours,
          old_regular, new_regular,
          old_overtime, new_overtime,
          old_doubletime, new_doubletime,
          old_pay, new_pay,
          changed_by, changed_at,
          change_reason
        ) VALUES (
          gen_random_uuid(), $1, $2, 'SUBMIT',
          $3, $3,
          0, 0,
          0, 0,
          0, 0,
          0, 0,
          $4, NOW(),
          'Submitted for approval'
        )
      `, [
        entryId,
        entry.userId,
        entry.hours,
        submittedBy || entry.userId
      ])
    } catch (auditError) {
      console.log('[AUDIT] Failed to log submission:', auditError)
    }

    return NextResponse.json({
      success: true,
      message: 'Time entry submitted for approval',
      entry: updateResult.rows[0]
    })

  } catch (error: any) {
    console.error('Error submitting time entry:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to submit time entry' },
      { status: 500 }
    )
  }
}