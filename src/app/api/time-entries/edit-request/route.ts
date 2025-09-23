import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Get user from token
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userPayload = verifyToken(token)
    const userId = (userPayload as any).userId || userPayload.id

    const body = await request.json()
    const { timeEntryId, newStartTime, newEndTime, newHours, reason } = body

    if (!timeEntryId || !reason) {
      return NextResponse.json(
        { error: 'Time entry ID and reason are required' },
        { status: 400 }
      )
    }

    // Verify the time entry belongs to the requesting user
    const entryCheck = await query(
      `SELECT id, "userId", date FROM "TimeEntry" WHERE id = $1`,
      [timeEntryId]
    )

    if (entryCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Time entry not found' },
        { status: 404 }
      )
    }

    if (entryCheck.rows[0].userId !== userId) {
      return NextResponse.json(
        { error: 'You can only request changes for your own time entries' },
        { status: 403 }
      )
    }

    // Create the edit request record
    // For now, we'll store this in a JSON field in the TimeEntry table
    // In a production system, you might want a separate TimeEditRequest table
    const updateResult = await query(
      `UPDATE "TimeEntry"
       SET "editRequest" = jsonb_build_object(
         'requestedAt', NOW(),
         'requestedBy', $2,
         'newStartTime', $3,
         'newEndTime', $4,
         'newHours', $5,
         'reason', $6,
         'status', 'pending'
       ),
       "updatedAt" = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        timeEntryId,
        userId,
        newStartTime,
        newEndTime,
        newHours,
        reason
      ]
    )

    if (updateResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Failed to submit edit request' },
        { status: 500 }
      )
    }

    // TODO: Send notification to manager about the edit request

    return NextResponse.json({
      success: true,
      message: 'Edit request submitted successfully',
      timeEntry: updateResult.rows[0]
    })
  } catch (error) {
    console.error('Error submitting edit request:', error)
    return NextResponse.json(
      { error: 'Failed to submit edit request' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve edit requests for managers
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userPayload = verifyToken(token)
    const userRole = userPayload.role

    // Only managers and admins can view all edit requests
    if (userRole !== 'OWNER_ADMIN' && userRole !== 'FOREMAN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get all pending edit requests
    const result = await query(
      `SELECT
        te.id,
        te."userId",
        te."jobId",
        te.date,
        te."startTime",
        te."endTime",
        te.hours,
        te."editRequest",
        u.name as "userName",
        j."jobNumber",
        j.description as "jobTitle"
       FROM "TimeEntry" te
       INNER JOIN "User" u ON te."userId" = u.id
       INNER JOIN "Job" j ON te."jobId" = j.id
       WHERE te."editRequest" IS NOT NULL
         AND te."editRequest"->>'status' = 'pending'
       ORDER BY te."editRequest"->>'requestedAt' DESC`
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching edit requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch edit requests' },
      { status: 500 }
    )
  }
}

// PATCH endpoint to approve/reject edit requests
export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userPayload = verifyToken(token)
    const userRole = userPayload.role
    const managerId = (userPayload as any).userId || userPayload.id

    // Only managers and admins can approve/reject edit requests
    if (userRole !== 'OWNER_ADMIN' && userRole !== 'FOREMAN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { timeEntryId, action, managerNotes } = body

    if (!timeEntryId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      )
    }

    // Get the current edit request
    const entryResult = await query(
      `SELECT * FROM "TimeEntry" WHERE id = $1 AND "editRequest" IS NOT NULL`,
      [timeEntryId]
    )

    if (entryResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Edit request not found' },
        { status: 404 }
      )
    }

    const entry = entryResult.rows[0]
    const editRequest = entry.editRequest

    if (action === 'approve') {
      // Apply the requested changes
      const newStartTime = editRequest.newStartTime || entry.startTime
      const newEndTime = editRequest.newEndTime || entry.endTime
      let newHours = editRequest.newHours

      // Calculate hours if not provided
      if (!newHours && newStartTime && newEndTime) {
        const start = new Date(newStartTime)
        const end = new Date(newEndTime)
        newHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      }

      // Update the time entry with the approved changes
      await query(
        `UPDATE "TimeEntry"
         SET "startTime" = $2,
             "endTime" = $3,
             hours = $4,
             "editRequest" = jsonb_set("editRequest", '{status}', '"approved"'),
             "editRequest" = jsonb_set("editRequest", '{approvedBy}', $5::jsonb),
             "editRequest" = jsonb_set("editRequest", '{approvedAt}', to_jsonb(NOW())),
             "editRequest" = jsonb_set("editRequest", '{managerNotes}', $6::jsonb),
             "approvedAt" = NOW(),
             "approvedBy" = $7,
             "updatedAt" = NOW()
         WHERE id = $1`,
        [
          timeEntryId,
          newStartTime,
          newEndTime,
          newHours,
          JSON.stringify(managerId),
          JSON.stringify(managerNotes || ''),
          managerId
        ]
      )
    } else {
      // Reject the edit request
      await query(
        `UPDATE "TimeEntry"
         SET "editRequest" = jsonb_set("editRequest", '{status}', '"rejected"'),
             "editRequest" = jsonb_set("editRequest", '{rejectedBy}', $2::jsonb),
             "editRequest" = jsonb_set("editRequest", '{rejectedAt}', to_jsonb(NOW())),
             "editRequest" = jsonb_set("editRequest", '{managerNotes}', $3::jsonb),
             "updatedAt" = NOW()
         WHERE id = $1`,
        [
          timeEntryId,
          JSON.stringify(managerId),
          JSON.stringify(managerNotes || '')
        ]
      )
    }

    return NextResponse.json({
      success: true,
      message: `Edit request ${action}ed successfully`
    })
  } catch (error) {
    console.error('Error processing edit request:', error)
    return NextResponse.json(
      { error: 'Failed to process edit request' },
      { status: 500 }
    )
  }
}