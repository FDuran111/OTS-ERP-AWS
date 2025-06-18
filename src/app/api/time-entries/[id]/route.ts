import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
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
    const result = await query(
      `SELECT 
        te.*,
        u.name as user_name,
        j."jobNumber",
        j.description as job_description
      FROM "TimeEntry" te
      LEFT JOIN "User" u ON te."userId" = u.id
      LEFT JOIN "Job" j ON te."jobId" = j.id
      WHERE te.id = $1`,
      [resolvedParams.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Time entry not found' },
        { status: 404 }
      )
    }

    const timeEntry = result.rows[0]
    
    // Transform to match expected format
    const transformedEntry = {
      id: timeEntry.id,
      startTime: timeEntry.startTime,
      endTime: timeEntry.endTime,
      hours: parseFloat(timeEntry.hours || 0),
      description: timeEntry.description,
      date: timeEntry.date,
      user: {
        id: timeEntry.userId,
        name: timeEntry.user_name || 'Unknown User'
      },
      job: {
        id: timeEntry.jobId,
        jobNumber: timeEntry.jobNumber || 'Unknown Job',
        description: timeEntry.job_description || ''
      }
    }

    return NextResponse.json(transformedEntry)
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
      const timeEntryResult = await query(
        'SELECT "startTime" FROM "TimeEntry" WHERE id = $1',
        [resolvedParams.id]
      )
      
      if (timeEntryResult.rows.length > 0) {
        const timeEntry = timeEntryResult.rows[0]
        const endTime = new Date(data.endTime)
        const startTime = new Date(timeEntry.startTime)
        calculatedHours = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60) * 100) / 100
      }
    }

    // Update the time entry
    const updateFields = []
    const updateParams = []
    let paramIndex = 1

    if (data.endTime) {
      updateFields.push(`"endTime" = $${paramIndex++}`)
      updateParams.push(new Date(data.endTime))
    }

    if (calculatedHours !== undefined) {
      updateFields.push(`hours = $${paramIndex++}`)
      updateParams.push(calculatedHours)
    }

    if (data.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`)
      updateParams.push(data.description)
    }

    updateFields.push(`"updatedAt" = $${paramIndex++}`)
    updateParams.push(new Date())

    updateParams.push(resolvedParams.id)

    const updateResult = await query(
      `UPDATE "TimeEntry" 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      updateParams
    )

    if (updateResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Time entry not found' },
        { status: 404 }
      )
    }

    // Get the updated entry with related data
    const result = await query(
      `SELECT 
        te.*,
        u.name as user_name,
        j."jobNumber",
        j.description as job_description
      FROM "TimeEntry" te
      LEFT JOIN "User" u ON te."userId" = u.id
      LEFT JOIN "Job" j ON te."jobId" = j.id
      WHERE te.id = $1`,
      [resolvedParams.id]
    )

    const timeEntry = result.rows[0]
    
    const transformedEntry = {
      id: timeEntry.id,
      startTime: timeEntry.startTime,
      endTime: timeEntry.endTime,
      hours: parseFloat(timeEntry.hours || 0),
      description: timeEntry.description,
      date: timeEntry.date,
      user: {
        id: timeEntry.userId,
        name: timeEntry.user_name || 'Unknown User'
      },
      job: {
        id: timeEntry.jobId,
        jobNumber: timeEntry.jobNumber || 'Unknown Job',
        description: timeEntry.job_description || ''
      }
    }

    return NextResponse.json(transformedEntry)
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
    const result = await query(
      'DELETE FROM "TimeEntry" WHERE id = $1 RETURNING id',
      [resolvedParams.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Time entry not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting time entry:', error)
    return NextResponse.json(
      { error: 'Failed to delete time entry' },
      { status: 500 }
    )
  }
}