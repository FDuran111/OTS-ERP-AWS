import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const createPhaseSchema = z.object({
  name: z.enum(['UG', 'RI', 'FN']),
  description: z.string().optional(),
  estimatedHours: z.number().positive().optional(),
  actualHours: z.number().positive().optional(),
  estimatedCost: z.number().positive().optional(),
  actualCost: z.number().positive().optional(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']).default('NOT_STARTED'),
  startDate: z.string().optional(),
  completedDate: z.string().optional(),
  notes: z.string().optional(),
})

// GET all phases for a job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const result = await query(
      'SELECT * FROM "JobPhase" WHERE "jobId" = $1 ORDER BY "createdAt" ASC',
      [resolvedParams.id]
    )
    const phases = result.rows

    return NextResponse.json(phases)
  } catch (error) {
    console.error('Error fetching job phases:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job phases' },
      { status: 500 }
    )
  }
}

// POST create a new phase for a job
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const body = await request.json()
    const data = createPhaseSchema.parse(body)

    // Verify job exists
    const jobResult = await query(
      'SELECT id FROM "Job" WHERE id = $1',
      [resolvedParams.id]
    )

    if (jobResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Check if phase already exists for this job
    const existingPhaseResult = await query(
      'SELECT id FROM "JobPhase" WHERE "jobId" = $1 AND name = $2',
      [resolvedParams.id, data.name]
    )
    const existingPhase = existingPhaseResult.rows[0]

    if (existingPhase) {
      return NextResponse.json(
        { error: `Phase ${data.name} already exists for this job` },
        { status: 400 }
      )
    }

    const result = await query(
      `INSERT INTO "JobPhase" (
        "jobId", name, description, "estimatedHours", "actualHours", 
        "estimatedCost", "actualCost", status, "startDate", "completedDate", 
        notes, "createdAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()) 
      RETURNING *`,
      [
        resolvedParams.id,
        data.name,
        data.description,
        data.estimatedHours,
        data.actualHours,
        data.estimatedCost,
        data.actualCost,
        data.status,
        data.startDate ? new Date(data.startDate) : null,
        data.completedDate ? new Date(data.completedDate) : null,
        data.notes
      ]
    )
    const phase = result.rows[0]

    return NextResponse.json(phase, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating job phase:', error)
    return NextResponse.json(
      { error: 'Failed to create job phase' },
      { status: 500 }
    )
  }
}