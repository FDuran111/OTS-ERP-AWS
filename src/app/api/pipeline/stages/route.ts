import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { z } from 'zod'

const createStageSchema = z.object({
  name: z.string().min(1).max(50),
  systemName: z.string().min(1).max(50),
  position: z.number().int().positive(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  isActive: z.boolean().optional(),
  autoActions: z.object({
    sendEmail: z.boolean().optional(),
    assignTo: z.string().optional(),
    addTag: z.string().optional(),
  }).optional(),
})

// GET all pipeline stages
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await query(
      `SELECT * FROM "LeadPipelineStage"
       WHERE "isActive" = true
       ORDER BY position ASC`
    )

    // Get lead count for each stage
    const countResult = await query(
      `SELECT
        ps.id,
        ps.name,
        ps."systemName",
        ps.position,
        ps.color,
        ps."isDefault",
        ps."autoActions",
        COUNT(l.id) as "leadCount"
       FROM "LeadPipelineStage" ps
       LEFT JOIN "Lead" l ON l."pipelineStageId" = ps.id
       WHERE ps."isActive" = true
       GROUP BY ps.id, ps.name, ps."systemName", ps.position, ps.color, ps."isDefault", ps."autoActions"
       ORDER BY ps.position ASC`
    )

    return NextResponse.json({
      stages: countResult.rows,
      total: countResult.rows.length
    })
  } catch (error) {
    console.error('Error fetching pipeline stages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pipeline stages' },
      { status: 500 }
    )
  }
}

// POST create new pipeline stage
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user || !['OWNER_ADMIN', 'FOREMAN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = createStageSchema.parse(body)

    // Shift positions of existing stages if needed
    await query(
      `UPDATE "LeadPipelineStage"
       SET position = position + 1
       WHERE position >= $1 AND "isActive" = true`,
      [data.position]
    )

    // Insert new stage
    const result = await query(
      `INSERT INTO "LeadPipelineStage"
       (name, "systemName", position, color, "isActive", "autoActions")
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.name,
        data.systemName,
        data.position,
        data.color || '#6B7280',
        data.isActive !== false,
        JSON.stringify(data.autoActions || {})
      ]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating pipeline stage:', error)
    return NextResponse.json(
      { error: 'Failed to create pipeline stage' },
      { status: 500 }
    )
  }
}

// PUT update pipeline stages (bulk update for reordering)
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user || !['OWNER_ADMIN', 'FOREMAN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { stages } = body

    if (!Array.isArray(stages)) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    // Update each stage's position
    for (const stage of stages) {
      await query(
        `UPDATE "LeadPipelineStage"
         SET position = $1, "updatedAt" = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [stage.position, stage.id]
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating pipeline stages:', error)
    return NextResponse.json(
      { error: 'Failed to update pipeline stages' },
      { status: 500 }
    )
  }
}