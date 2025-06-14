import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createTimeEntrySchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
  phaseId: z.string().optional(),
  description: z.string().optional(),
  startTime: z.string().optional(), // ISO string, defaults to now
})

// GET all time entries
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const active = searchParams.get('active') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')

    const whereClause: any = {}
    
    if (userId) {
      whereClause.userId = userId
    }
    
    if (active) {
      whereClause.endTime = null
    }

    const timeEntries = await prisma.timeEntry.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
          }
        },
        job: {
          select: {
            id: true,
            jobNumber: true,
            description: true,
            customer: {
              select: {
                companyName: true,
                firstName: true,
                lastName: true,
              }
            }
          }
        },
        phase: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      },
      take: limit
    })

    // Transform data for frontend
    const transformedEntries = timeEntries.map(entry => {
      const duration = entry.endTime 
        ? Math.round((entry.endTime.getTime() - entry.startTime.getTime()) / (1000 * 60 * 60) * 100) / 100
        : null

      return {
        id: entry.id,
        userId: entry.userId,
        userName: entry.user.name,
        jobId: entry.jobId,
        jobNumber: entry.job.jobNumber,
        jobTitle: entry.job.description,
        customer: entry.job.customer.companyName || 
                 `${entry.job.customer.firstName} ${entry.job.customer.lastName}`,
        phaseId: entry.phaseId,
        phaseName: entry.phase?.name,
        date: entry.date.toISOString().split('T')[0],
        startTime: entry.startTime,
        endTime: entry.endTime,
        hours: entry.hours,
        calculatedHours: duration,
        description: entry.description,
        synced: entry.synced,
        isActive: !entry.endTime,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      }
    })

    return NextResponse.json(transformedEntries)
  } catch (error) {
    console.error('Error fetching time entries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch time entries' },
      { status: 500 }
    )
  }
}

// POST create a new time entry (start timer)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('POST /api/time-entries - Request body:', body)
    const data = createTimeEntrySchema.parse(body)

    // Get current user (in a real app, this would come from authentication)
    const userId = body.userId || 'default-user-id' // Temporary fallback
    console.log('Using userId:', userId)

    // Check if user has an active timer
    const activeEntry = await prisma.timeEntry.findFirst({
      where: {
        userId: userId,
        endTime: null
      }
    })

    if (activeEntry) {
      return NextResponse.json(
        { error: 'User already has an active timer running' },
        { status: 400 }
      )
    }

    const startTime = data.startTime ? new Date(data.startTime) : new Date()

    const timeEntry = await prisma.timeEntry.create({
      data: {
        userId: userId,
        jobId: data.jobId,
        phaseId: data.phaseId,
        date: startTime,
        startTime: startTime,
        hours: 0, // Will be calculated when timer stops
        description: data.description,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          }
        },
        job: {
          select: {
            id: true,
            jobNumber: true,
            description: true,
          }
        },
        phase: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    return NextResponse.json(timeEntry, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating time entry:', error)
    return NextResponse.json(
      { error: 'Failed to create time entry' },
      { status: 500 }
    )
  }
}