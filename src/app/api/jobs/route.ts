import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// GET all jobs
export async function GET() {
  try {
    const jobs = await prisma.job.findMany({
      include: {
        customer: true,
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        },
        phases: true,
        jobPhases: {
          select: {
            id: true,
            name: true,
            status: true,
          }
        },
        timeEntries: {
          select: {
            hours: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform the data to match the frontend format
    const transformedJobs = jobs.map(job => ({
      id: job.id,
      jobNumber: job.jobNumber,
      title: job.description,
      customer: job.customer.companyName || `${job.customer.firstName} ${job.customer.lastName}`,
      customerId: job.customerId,
      status: job.status.toLowerCase(),
      type: job.type,
      priority: job.estimatedHours && job.estimatedHours > 40 ? 'high' : 'medium',
      dueDate: job.scheduledDate?.toISOString() || null,
      completedDate: job.completedDate?.toISOString() || null,
      crew: job.assignments.map(a => a.user.name),
      estimatedHours: job.estimatedHours,
      actualHours: job.timeEntries.reduce((sum, entry) => sum + entry.hours, 0),
      estimatedCost: job.estimatedCost,
      actualCost: job.actualCost,
      address: job.address,
      city: job.city,
      state: job.state,
      zip: job.zip,
      jobPhases: job.jobPhases,
      phases: job.phases.map(phase => ({
        id: phase.id,
        phase: phase.phase,
        status: phase.status,
        jobNumber: phase.jobNumber,
      }))
    }))

    return NextResponse.json(transformedJobs)
  } catch (error) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}

// Schema for creating a job
const createJobSchema = z.object({
  customerId: z.string(),
  type: z.enum(['SERVICE_CALL', 'COMMERCIAL_PROJECT']),
  description: z.string(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  scheduledDate: z.string().optional(),
  estimatedHours: z.number().optional(),
  estimatedCost: z.number().optional(),
  assignedUserIds: z.array(z.string()).optional(),
})

// POST create a new job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createJobSchema.parse(body)

    // Get the current year for job numbering
    const year = new Date().getFullYear().toString().slice(-2)
    
    // Find the last job number for this year
    const lastJob = await prisma.job.findFirst({
      where: {
        jobNumber: {
          startsWith: `${year}-`
        }
      },
      orderBy: {
        jobNumber: 'desc'
      }
    })

    // Generate new job number
    let sequence = 1
    if (lastJob) {
      const lastSequence = parseInt(lastJob.jobNumber.split('-')[1])
      sequence = lastSequence + 1
    }
    
    const jobNumber = `${year}-${sequence.toString().padStart(3, '0')}-001`

    // Create the job with assignments
    const job = await prisma.job.create({
      data: {
        jobNumber,
        customerId: data.customerId,
        type: data.type,
        description: data.description,
        status: 'ESTIMATE',
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
        estimatedHours: data.estimatedHours,
        estimatedCost: data.estimatedCost,
        assignments: {
          create: data.assignedUserIds?.map(userId => ({
            userId,
            assignedBy: 'system', // TODO: Get from authenticated user
          })) || []
        }
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

    return NextResponse.json(job, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating job:', error)
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    )
  }
}