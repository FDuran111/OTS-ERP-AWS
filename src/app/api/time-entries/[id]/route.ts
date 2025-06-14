import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateTimeEntrySchema = z.object({
  endTime: z.string().optional(),
  hours: z.number().optional(),
  description: z.string().optional(),
})

// GET a specific time entry
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const timeEntry = await prisma.timeEntry.findUnique({
      where: { id: resolvedParams.id },
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
            phase: true,
          }
        }
      }
    })

    if (!timeEntry) {
      return NextResponse.json(
        { error: 'Time entry not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(timeEntry)
  } catch (error) {
    console.error('Error fetching time entry:', error)
    return NextResponse.json(
      { error: 'Failed to fetch time entry' },
      { status: 500 }
    )
  }
}

// PATCH update a time entry (stop timer)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const body = await request.json()
    const data = updateTimeEntrySchema.parse(body)

    // If stopping the timer, calculate hours
    let calculatedHours = data.hours
    if (data.endTime && !calculatedHours) {
      const timeEntry = await prisma.timeEntry.findUnique({
        where: { id: resolvedParams.id }
      })
      
      if (timeEntry) {
        const endTime = new Date(data.endTime)
        const startTime = timeEntry.startTime
        calculatedHours = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60) * 100) / 100
      }
    }

    const updatedEntry = await prisma.timeEntry.update({
      where: { id: resolvedParams.id },
      data: {
        endTime: data.endTime ? new Date(data.endTime) : undefined,
        hours: calculatedHours,
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
            phase: true,
          }
        }
      }
    })

    return NextResponse.json(updatedEntry)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error updating time entry:', error)
    return NextResponse.json(
      { error: 'Failed to update time entry' },
      { status: 500 }
    )
  }
}

// DELETE a time entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    await prisma.timeEntry.delete({
      where: { id: resolvedParams.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting time entry:', error)
    return NextResponse.json(
      { error: 'Failed to delete time entry' },
      { status: 500 }
    )
  }
}