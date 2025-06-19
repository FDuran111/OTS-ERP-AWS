import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const updatePhaseSchema = z.object({
  description: z.string().optional(),
  estimatedHours: z.number().positive().optional(),
  actualHours: z.number().positive().optional(),
  estimatedCost: z.number().positive().optional(),
  actualCost: z.number().positive().optional(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']).optional(),
  startDate: z.string().optional().nullable(),
  completedDate: z.string().optional().nullable(),
  notes: z.string().optional(),
})

// GET a specific phase
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string, phaseId: string }> }
) {
  const resolvedParams = await params
  try {
    const phaseResult = await query(
      'SELECT * FROM "JobPhase" WHERE id = $1 AND "jobId" = $2',
      [resolvedParams.phaseId, resolvedParams.id]
    )
    const phase = phaseResult.rows[0]

    if (!phase) {
      return NextResponse.json(
        { error: 'Phase not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(phase)
  } catch (error) {
    console.error('Error fetching job phase:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job phase' },
      { status: 500 }
    )
  }
}

// PATCH update a phase
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string, phaseId: string }> }
) {
  const resolvedParams = await params
  try {
    const body = await request.json()
    const data = updatePhaseSchema.parse(body)

    // Auto-set dates based on status changes
    const updateData: any = { ...data }
    
    if (data.status === 'IN_PROGRESS' && !data.startDate) {
      updateData.startDate = new Date()
    }
    
    if (data.status === 'COMPLETED' && !data.completedDate) {
      updateData.completedDate = new Date()
    }

    // Convert date strings to Date objects
    if (data.startDate !== undefined) {
      updateData.startDate = data.startDate ? new Date(data.startDate) : null
    }
    if (data.completedDate !== undefined) {
      updateData.completedDate = data.completedDate ? new Date(data.completedDate) : null
    }

    // Build dynamic UPDATE query
    const setFields = []
    const values = []
    let paramCount = 1

    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        setFields.push(`"${key}" = $${paramCount}`)
        values.push(value)
        paramCount++
      }
    }

    if (setFields.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    values.push(resolvedParams.phaseId, resolvedParams.id)
    
    const updateQuery = `
      UPDATE "JobPhase" 
      SET ${setFields.join(', ')}, "updatedAt" = NOW()
      WHERE id = $${paramCount} AND "jobId" = $${paramCount + 1}
      RETURNING *
    `

    const result = await query(updateQuery, values)
    const phase = result.rows[0]

    return NextResponse.json(phase)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error updating job phase:', error)
    return NextResponse.json(
      { error: 'Failed to update job phase' },
      { status: 500 }
    )
  }
}

// DELETE a phase
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string, phaseId: string }> }
) {
  const resolvedParams = await params
  try {
    await query(
      'DELETE FROM "JobPhase" WHERE id = $1 AND "jobId" = $2',
      [resolvedParams.phaseId, resolvedParams.id]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting job phase:', error)
    return NextResponse.json(
      { error: 'Failed to delete job phase' },
      { status: 500 }
    )
  }
}