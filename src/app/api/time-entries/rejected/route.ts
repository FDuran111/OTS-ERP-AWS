import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Get auth token
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify token and get user info
    let userPayload
    try {
      userPayload = verifyToken(token)
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = (userPayload as any).userId || userPayload.id

    // Fetch rejected time entries for this user
    const result = await query(
      `SELECT
        te.id,
        te.date,
        te.hours,
        te.description,
        te."rejectionReason",
        j."jobNumber",
        j.description as job_description
      FROM "TimeEntry" te
      LEFT JOIN "Job" j ON te."jobId" = j.id
      WHERE te."userId" = $1
        AND te.status = 'rejected'
      ORDER BY te.date DESC`,
      [userId]
    )

    return NextResponse.json({
      entries: result.rows
    })
  } catch (error) {
    console.error('Error fetching rejected entries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rejected entries' },
      { status: 500 }
    )
  }
}
