import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
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
    const existingJobResult = await query(
      'SELECT * FROM "Job" WHERE id = $1',
      [jobId]
    )

    if (existingJobResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    const existingJob = existingJobResult.rows[0]

    // Update the job with scheduling information
    const updatedDescription = notes 
      ? `${existingJob.description}\n\nScheduling Notes: ${notes}`
      : existingJob.description

    const updatedJobResult = await query(
      `UPDATE "Job" SET 
        scheduledDate = $1,
        estimatedHours = $2,
        status = $3,
        description = $4,
        updatedAt = $5
      WHERE id = $6 
      RETURNING *`,
      [
        new Date(scheduledDate),
        estimatedHours || existingJob.estimatedhours,
        existingJob.status === 'ESTIMATE' ? 'SCHEDULED' : existingJob.status,
        updatedDescription,
        new Date(),
        jobId
      ]
    )

    const updatedJob = updatedJobResult.rows[0]

    // TODO: Create reminder system entry
    // For now, we'll store reminder info in a simple way
    // In the future, this could trigger email/notification systems

    return NextResponse.json({
      success: true,
      job: {
        id: updatedJob.id,
        jobNumber: updatedJob.jobnumber,
        scheduledDate: updatedJob.scheduleddate,
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