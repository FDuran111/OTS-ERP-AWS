import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { query } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let authUser
    try {
      authUser = verifyToken(token)
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if user is admin or foreman
    if (!['OWNER_ADMIN', 'FOREMAN'].includes(authUser.role)) {
      return NextResponse.json({ error: 'Only admins can approve job completion' }, { status: 403 })
    }

    const { id: jobId } = await params
    const body = await request.json()
    const { notes, billedAmount } = body

    // Update job status from PENDING_REVIEW to COMPLETED
    const updateResult = await query(
      `UPDATE "Job"
       SET status = 'COMPLETED',
           "completedDate" = CURRENT_TIMESTAMP,
           "billedAmount" = COALESCE($2, "billedAmount"),
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'PENDING_REVIEW'
       RETURNING *`,
      [jobId, billedAmount]
    )

    if (!updateResult || updateResult.rows.length === 0) {
      return NextResponse.json({ error: 'Job not found or not in pending review status' }, { status: 404 })
    }

    const job = updateResult.rows[0]

    // Add approval note
    const userId = (authUser as any).id || (authUser as any).userId
    await query(
      `INSERT INTO "JobNote"
       (id, "jobId", note, "createdBy", "createdAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, CURRENT_TIMESTAMP)`,
      [
        jobId,
        notes || `Job approved and closed by ${authUser.name || 'Admin'}`,
        userId
      ]
    )

    // Clear the pending review notification
    await query(
      `UPDATE "NotificationLog"
       SET status = 'READ',
           "readAt" = CURRENT_TIMESTAMP
       WHERE metadata->>'jobId' = $1
       AND type = 'JOB_PENDING_REVIEW'
       AND status = 'SENT'`,
      [jobId]
    )

    return NextResponse.json({
      success: true,
      message: 'Job successfully closed',
      job: job
    })
  } catch (error) {
    console.error('Error approving job:', error)
    return NextResponse.json(
      { error: 'Failed to approve job completion' },
      { status: 500 }
    )
  }
}