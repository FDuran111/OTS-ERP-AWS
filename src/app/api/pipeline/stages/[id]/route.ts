import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const updateStageSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  autoActions: z.object({
    sendEmail: z.boolean().optional(),
    assignTo: z.string().optional(),
    addTag: z.string().optional(),
  }).optional(),
})

interface Props {
  params: Promise<{
    id: string
  }>
}

// GET single pipeline stage
export async function GET(request: NextRequest, { params }: Props) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = verifyToken(token)

    const { id } = await params

    const result = await query(
      `SELECT
        ps.*,
        COUNT(l.id) as "leadCount"
       FROM "LeadPipelineStage" ps
       LEFT JOIN "Lead" l ON l."pipelineStageId" = ps.id
       WHERE ps.id = $1
       GROUP BY ps.id`,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Pipeline stage not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching pipeline stage:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pipeline stage' },
      { status: 500 }
    )
  }
}

// PATCH update pipeline stage
export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = verifyToken(token)
    if (!['OWNER_ADMIN', 'FOREMAN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const data = updateStageSchema.parse(body)

    // Build dynamic update query
    const updates = []
    const values = []
    let paramCount = 1

    if (data.name !== undefined) {
      updates.push(`name = $${paramCount++}`)
      values.push(data.name)
    }

    if (data.color !== undefined) {
      updates.push(`color = $${paramCount++}`)
      values.push(data.color)
    }

    if (data.autoActions !== undefined) {
      updates.push(`"autoActions" = $${paramCount++}`)
      values.push(JSON.stringify(data.autoActions))
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    updates.push(`"updatedAt" = CURRENT_TIMESTAMP`)
    values.push(id)

    const result = await query(
      `UPDATE "LeadPipelineStage"
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Pipeline stage not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating pipeline stage:', error)
    return NextResponse.json(
      { error: 'Failed to update pipeline stage' },
      { status: 500 }
    )
  }
}

// DELETE pipeline stage
export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = verifyToken(token)
    if (user.role !== 'OWNER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if stage has leads
    const checkResult = await query(
      `SELECT COUNT(*) as count FROM "Lead" WHERE "pipelineStageId" = $1`,
      [id]
    )

    if (parseInt(checkResult.rows[0].count) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete stage with existing leads. Move or delete leads first.' },
        { status: 400 }
      )
    }

    // No longer restrict deletion of default stages
    // Users should be able to customize their pipeline completely

    // Soft delete (mark as inactive)
    const result = await query(
      `UPDATE "LeadPipelineStage"
       SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Pipeline stage not found' },
        { status: 404 }
      )
    }

    // Reorder remaining stages
    await query(
      `UPDATE "LeadPipelineStage"
       SET position = position - 1
       WHERE position > $1 AND "isActive" = true`,
      [result.rows[0].position]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting pipeline stage:', error)
    return NextResponse.json(
      { error: 'Failed to delete pipeline stage' },
      { status: 500 }
    )
  }
}