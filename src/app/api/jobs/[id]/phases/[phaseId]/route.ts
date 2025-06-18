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
    const phase = await prisma.jobPhase.findUnique({
      where: { 
        id: resolvedParams.phaseId,
        jobId: resolvedParams.id
      }
    })

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

    const phase = await prisma.jobPhase.update({
      where: { 
        id: resolvedParams.phaseId,
        jobId: resolvedParams.id
      },
      data: updateData
    })

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
    await prisma.jobPhase.delete({
      where: { 
        id: resolvedParams.phaseId,
        jobId: resolvedParams.id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting job phase:', error)
    return NextResponse.json(
      { error: 'Failed to delete job phase' },
      { status: 500 }
    )
  }
}