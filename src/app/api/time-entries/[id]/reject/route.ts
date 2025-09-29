import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// POST - Reject a time entry
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resolvedParams = await params
    const entryId = resolvedParams.id

    // Get the rejection details from the request body
    const body = await request.json().catch(() => ({}))
    const { rejectedBy, rejectionReason } = body

    if (!rejectionReason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      )
    }

    // Check if the time entry exists
    const checkResult = await query(
      'SELECT id, "userId", date, hours, status FROM "TimeEntry" WHERE id = $1',
      [entryId]
    )

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Time entry not found' },
        { status: 404 }
      )
    }

    const entry = checkResult.rows[0]

    // Update the time entry to mark it as rejected
    const updateResult = await query(
      `UPDATE "TimeEntry"
       SET
         status = 'rejected',
         "rejectedAt" = NOW(),
         "rejectedBy" = $2,
         "rejectionReason" = $3,
         "updatedAt" = NOW()
       WHERE id = $1
       RETURNING *`,
      [entryId, rejectedBy || 'system', rejectionReason]
    )

    // Log the rejection in audit trail (only for valid UUID entry IDs)
    try {
      // Check if entryId is a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(entryId)) {
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
            gen_random_uuid(), $1, $2, 'REJECT',
            $3, $3,
            0, 0,
            0, 0,
            0, 0,
            0, 0,
            $4, NOW(),
            $5
          )
        `, [
          entryId,
          entry.userId,
          entry.hours,
          rejectedBy || 'system',
          `Rejected: ${rejectionReason}`
        ])
      } else {
        console.log('[AUDIT] Skipping audit log for non-UUID entry:', entryId)
      }
    } catch (auditError) {
      console.log('[AUDIT] Failed to log rejection:', auditError)
    }

    return NextResponse.json({
      success: true,
      message: 'Time entry rejected',
      entry: updateResult.rows[0]
    })

  } catch (error: any) {
    console.error('Error rejecting time entry:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reject time entry' },
      { status: 500 }
    )
  }
}