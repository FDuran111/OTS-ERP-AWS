import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: entryId } = await context.params
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userPayload = verifyToken(token)

    const result = await query(
      `SELECT 
        rn.*,
        u."firstName",
        u."lastName"
       FROM "TimeEntryRejectionNote" rn
       LEFT JOIN "User" u ON rn."userId" = u.id
       WHERE rn."timeEntryId" = $1
       ORDER BY rn."createdAt" ASC`,
      [entryId]
    )

    const notes = result.rows.map(row => ({
      id: row.id,
      userId: row.userId,
      userName: `${row.firstName} ${row.lastName}`,
      userRole: row.userRole,
      note: row.note,
      isAdminNote: row.isAdminNote,
      createdAt: row.createdAt,
    }))

    return NextResponse.json({ notes })
  } catch (error) {
    console.error('Get rejection notes error:', error)
    return NextResponse.json(
      { error: 'Failed to get rejection notes' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: entryId } = await context.params
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userPayload = verifyToken(token)
    const userId = userPayload.id
    const userRole = userPayload.role

    const body = await request.json()
    const { note } = body

    if (!note || note.trim().length === 0) {
      return NextResponse.json(
        { error: 'Note is required' },
        { status: 400 }
      )
    }

    const isAdmin = ['ADMIN', 'MANAGER', 'HR_MANAGER', 'OWNER_ADMIN'].includes(userRole)

    const result = await query(
      `INSERT INTO "TimeEntryRejectionNote" 
       ("timeEntryId", "userId", "userRole", note, "isAdminNote", "createdAt")
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [entryId, userId, userRole, note, isAdmin]
    )

    const entryResult = await query(
      `SELECT te."userId", u.email, u."firstName", u."lastName"
       FROM "TimeEntry" te
       LEFT JOIN "User" u ON te."userId" = u.id
       WHERE te.id = $1`,
      [entryId]
    )

    if (isAdmin && entryResult.rows.length > 0) {
      const employee = entryResult.rows[0]
      
      await query(
        `INSERT INTO "NotificationLog" 
        ("userId", type, subject, message, metadata, status, channel, "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          employee.userId,
          'TIME_ENTRY_NOTE',
          'Response to Time Entry Rejection',
          `Admin responded to your rejected time entry: ${note}`,
          JSON.stringify({ timeEntryId: entryId, link: '/time' }),
          'PENDING',
          'IN_APP',
        ]
      )
    }

    return NextResponse.json({
      message: 'Note added successfully',
      note: result.rows[0],
    })
  } catch (error) {
    console.error('Add rejection note error:', error)
    return NextResponse.json(
      { error: 'Failed to add rejection note' },
      { status: 500 }
    )
  }
}
