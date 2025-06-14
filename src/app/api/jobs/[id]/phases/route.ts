import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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
  { params }: { params: { id: string } }
) {
  try {
    const phases = await prisma.jobPhase.findMany({
      where: { jobId: params.id },
      orderBy: {
        createdAt: 'asc'
      }
    })

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
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const data = createPhaseSchema.parse(body)

    // Verify job exists
    const job = await prisma.job.findUnique({
      where: { id: params.id }
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Check if phase already exists for this job
    const existingPhase = await prisma.jobPhase.findFirst({
      where: {
        jobId: params.id,
        name: data.name
      }
    })

    if (existingPhase) {
      return NextResponse.json(
        { error: `Phase ${data.name} already exists for this job` },
        { status: 400 }
      )
    }

    const phase = await prisma.jobPhase.create({
      data: {
        jobId: params.id,
        name: data.name,
        description: data.description,
        estimatedHours: data.estimatedHours,
        actualHours: data.actualHours,
        estimatedCost: data.estimatedCost,
        actualCost: data.actualCost,
        status: data.status,
        startDate: data.startDate ? new Date(data.startDate) : null,
        completedDate: data.completedDate ? new Date(data.completedDate) : null,
        notes: data.notes,
      }
    })

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