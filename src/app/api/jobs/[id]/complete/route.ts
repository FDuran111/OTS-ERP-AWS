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

    const { id: jobId } = await params
    const body = await request.json()
    const { completedBy, completedByName } = body

    // Update job status to PENDING_REVIEW (physical work done, needs admin approval)
    const updateResult = await query(
      `UPDATE "Job"
       SET status = 'PENDING_REVIEW',
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [jobId]
    )

    if (!updateResult || updateResult.rows.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const job = updateResult.rows[0]

    // Create notification for admins (get all admin users)
    const adminUsersResult = await query(
      `SELECT id FROM "User" WHERE role IN ('OWNER_ADMIN', 'FOREMAN') AND active = true`
    )

    // Create notifications for each admin
    for (const admin of adminUsersResult.rows) {
      await query(
        `INSERT INTO "NotificationLog"
         (id, "userId", type, channel, subject, message, metadata, status, "createdAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
        [
          admin.id,
          'JOB_PENDING_REVIEW',
          'IN_APP',
          `Job ${job.jobNumber} Ready for Closure`,
          `Job ${job.jobNumber} physical work has been completed by ${completedByName || 'Employee'} and is ready for final review and closure.`,
          JSON.stringify({
            jobId: jobId,
            jobNumber: job.jobNumber,
            completedBy: completedBy,
            completedByName: completedByName,
            completedAt: new Date().toISOString(),
            action: 'NEEDS_CLOSURE'
          }),
          'SENT'
        ]
      )
    }

    // Also log this as a job note
    const userId = (authUser as any).id || (authUser as any).userId || completedBy
    await query(
      `INSERT INTO "JobNote"
       (id, "jobId", note, "createdBy", "createdAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, CURRENT_TIMESTAMP)`,
      [
        jobId,
        `Physical work completed by ${completedByName || 'Employee'}. Job pending admin review for final closure.`,
        userId
      ]
    )

    return NextResponse.json({
      success: true,
      message: 'Job marked as done and sent for admin review',
      job: job
    })
  } catch (error) {
    console.error('Error marking job complete:', error)
    return NextResponse.json(
      { error: 'Failed to mark job as complete' },
      { status: 500 }
    )
  }
}