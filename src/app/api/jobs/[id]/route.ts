import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// GET a single job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const job = await prisma.job.findUnique({
      where: { id: resolvedParams.id },
      include: {
        customer: true,
        assignments: {
          include: {
            user: true
          }
        },
        phases: true,
        timeEntries: {
          include: {
            user: true
          }
        },
        materialUsage: {
          include: {
            material: true
          }
        },
        changeOrders: true,
        notes: true,
      }
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(job)
  } catch (error) {
    console.error('Error fetching job:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    )
  }
}

// Schema for updating a job
const updateJobSchema = z.object({
  description: z.string().optional(),
  status: z.enum(['ESTIMATE', 'SCHEDULED', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED', 'BILLED', 'CANCELLED']).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  scheduledDate: z.string().optional(),
  completedDate: z.string().optional(),
  estimatedHours: z.number().optional(),
  estimatedCost: z.number().optional(),
  actualHours: z.number().optional(),
  actualCost: z.number().optional(),
  billedAmount: z.number().optional(),
  assignedUserIds: z.array(z.string()).optional(),
})

// PATCH update a job
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const body = await request.json()
    const data = updateJobSchema.parse(body)

    // If assignedUserIds is provided, update assignments
    if (data.assignedUserIds) {
      // Remove existing assignments
      await prisma.jobAssignment.deleteMany({
        where: { jobId: resolvedParams.id }
      })

      // Create new assignments
      await prisma.jobAssignment.createMany({
        data: data.assignedUserIds.map(userId => ({
          jobId: resolvedParams.id,
          userId,
          assignedBy: 'system', // TODO: Get from authenticated user
        }))
      })
    }

    // Update the job
    const job = await prisma.job.update({
      where: { id: resolvedParams.id },
      data: {
        description: data.description,
        status: data.status,
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
        completedDate: data.completedDate ? new Date(data.completedDate) : undefined,
        estimatedHours: data.estimatedHours,
        estimatedCost: data.estimatedCost,
        actualHours: data.actualHours,
        actualCost: data.actualCost,
        billedAmount: data.billedAmount,
      },
      include: {
        customer: true,
        assignments: {
          include: {
            user: true
          }
        }
      }
    })

    return NextResponse.json(job)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error updating job:', error)
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    )
  }
}

// DELETE a job
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    // Delete related records first (if not using cascade delete)
    // Note: JobPhase has onDelete: Cascade, so it should be handled automatically
    await prisma.jobAssignment.deleteMany({
      where: { jobId: resolvedParams.id }
    })

    // Delete job phases explicitly (in case cascade isn't working)
    await prisma.jobPhase.deleteMany({
      where: { jobId: resolvedParams.id }
    })

    // Delete time entries
    await prisma.timeEntry.deleteMany({
      where: { jobId: resolvedParams.id }
    })

    // Delete material usage
    await prisma.materialUsage.deleteMany({
      where: { jobId: resolvedParams.id }
    })

    // Delete change orders
    await prisma.changeOrder.deleteMany({
      where: { jobId: resolvedParams.id }
    })

    // Delete job notes
    await prisma.jobNote.deleteMany({
      where: { jobId: resolvedParams.id }
    })

    // Finally delete the job
    await prisma.job.delete({
      where: { id: resolvedParams.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting job:', error)
    return NextResponse.json(
      { error: 'Failed to delete job', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}