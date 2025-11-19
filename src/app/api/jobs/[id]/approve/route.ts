import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'
import { withRBAC } from '@/lib/rbac-middleware'

const approveJobSchema = z.object({
  newStatus: z.enum(['SCHEDULED', 'ESTIMATE']).optional().default('SCHEDULED')
})

// PATCH approve a pending job
export const PATCH = withRBAC({
  requiredRoles: ['OWNER_ADMIN', 'FOREMAN']
})(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    // Next.js 15 requires awaiting params
    const { id: jobId } = await params
    const body = await request.json()
    const { newStatus } = approveJobSchema.parse(body)

    // Update job status from PENDING_APPROVAL to SCHEDULED (or ESTIMATE)
    const result = await query(
      `UPDATE "Job"
       SET status = $1::"JobStatus",
           "updatedAt" = NOW()
       WHERE id = $2
       AND status::text = 'PENDING_APPROVAL'
       RETURNING *`,
      [newStatus, jobId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Job not found or not pending approval' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      job: result.rows[0]
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error approving job:', error)
    return NextResponse.json(
      { error: 'Failed to approve job' },
      { status: 500 }
    )
  }
})
