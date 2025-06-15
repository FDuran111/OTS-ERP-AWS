import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const scheduleJobSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
  scheduledDate: z.string().datetime('Invalid scheduled date'),
  estimatedHours: z.number().min(0).optional(),
  notes: z.string().optional(),
  reminderDays: z.number().min(0).default(3),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobId, scheduledDate, estimatedHours, notes, reminderDays } = scheduleJobSchema.parse(body)

    // Check if job exists
    const existingJob = await prisma.job.findUnique({
      where: { id: jobId },
    })

    if (!existingJob) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Update the job with scheduling information
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        scheduledDate: new Date(scheduledDate),
        estimatedHours: estimatedHours || existingJob.estimatedHours,
        status: existingJob.status === 'ESTIMATE' ? 'SCHEDULED' : existingJob.status,
        // Store scheduling notes - we'll add this field if it doesn't exist
        ...(notes && { description: `${existingJob.description}\n\nScheduling Notes: ${notes}` }),
      },
    })

    // TODO: Create reminder system entry
    // For now, we'll store reminder info in a simple way
    // In the future, this could trigger email/notification systems

    return NextResponse.json({
      success: true,
      job: {
        id: updatedJob.id,
        jobNumber: updatedJob.jobNumber,
        scheduledDate: updatedJob.scheduledDate,
        status: updatedJob.status,
      },
      reminder: {
        jobId: updatedJob.id,
        reminderDate: new Date(new Date(scheduledDate).getTime() - (reminderDays * 24 * 60 * 60 * 1000)),
        daysBeforeStart: reminderDays,
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error scheduling job:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}