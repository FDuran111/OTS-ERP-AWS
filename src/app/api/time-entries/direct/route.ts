import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const directTimeEntrySchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  jobId: z.string().min(1, 'Job ID is required'),
  phaseId: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().optional(), // Made optional for direct hours entry
  endTime: z.string().optional(), // Made optional for direct hours entry
  hours: z.number()
    .positive('Hours must be positive')
    .max(24, 'Hours cannot exceed 24 per day')
    .refine(
      (hours) => {
        // Check if hours is in 0.25 increments (15-minute intervals)
        const remainder = (hours * 100) % 25
        return remainder === 0
      },
      { message: 'Hours must be in 15-minute (0.25 hour) increments' }
    ),
  description: z.string().optional(),
  scheduleId: z.string().optional(),
})

// POST create a direct time entry (no timer needed)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = directTimeEntrySchema.parse(body)

    // Validate job exists
    const jobCheck = await query(
      'SELECT id FROM "Job" WHERE id = $1',
      [data.jobId]
    )

    if (jobCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid job ID. Job does not exist.' },
        { status: 400 }
      )
    }

    let startTime: Date
    let endTime: Date
    let finalHours = data.hours

    if (data.startTime && data.endTime) {
      // Time range provided - validate times
      startTime = new Date(data.startTime)
      endTime = new Date(data.endTime)
      
      if (endTime <= startTime) {
        return NextResponse.json(
          { error: 'End time must be after start time' },
          { status: 400 }
        )
      }

      // Calculate hours based on actual time difference
      const calculatedHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
      
      // Round to nearest 15-minute (0.25 hour) increment
      const roundedHours = Math.round(calculatedHours * 4) / 4
      
      // Validate that the provided hours match the calculated hours
      if (Math.abs(data.hours - roundedHours) > 0.01) {
        return NextResponse.json(
          { 
            error: 'Provided hours do not match the time range', 
            details: {
              provided: data.hours,
              calculated: roundedHours,
              message: 'Hours must match the time difference rounded to 15-minute increments'
            }
          },
          { status: 400 }
        )
      }
    } else {
      // Direct hours entry - create synthetic start/end times
      // Parse date string as local date (YYYY-MM-DD format)
      const [year, month, day] = data.date.split('-').map(Number)
      // Default to 8 AM start time in local timezone
      startTime = new Date(year, month - 1, day, 8, 0, 0)
      // Calculate end time based on hours
      endTime = new Date(startTime.getTime() + (data.hours * 60 * 60 * 1000))
    }

    // Check for overlapping time entries for the same user on the same day
    const overlapCheck = await query(`
      SELECT id FROM "TimeEntry" 
      WHERE "userId" = $1 
      AND DATE("startTime") = DATE($2::timestamp)
      AND (
        ("startTime" <= $3::timestamp AND "endTime" > $3::timestamp) OR
        ("startTime" < $4::timestamp AND "endTime" >= $4::timestamp) OR
        ("startTime" >= $3::timestamp AND "endTime" <= $4::timestamp)
      )
    `, [data.userId, data.startTime, data.startTime, data.endTime])

    if (overlapCheck.rows.length > 0) {
      return NextResponse.json(
        { error: 'Time entry overlaps with an existing entry for this day' },
        { status: 400 }
      )
    }

    // Create the time entry with a UUID
    const timeEntryResult = await query(
      `INSERT INTO "TimeEntry" (
        id, "userId", "jobId", "phaseId", date, "startTime", "endTime",
        hours, description, synced, "createdAt", "updatedAt"
      ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        data.userId,
        data.jobId,
        data.phaseId || null,
        data.date, // Pass date string directly, let PostgreSQL handle it
        startTime,
        endTime,
        finalHours,
        data.description || null,
        false,
        new Date(),
        new Date()
      ]
    )

    const timeEntry = timeEntryResult.rows[0]

    // If this entry is linked to a schedule, update the schedule status
    if (data.scheduleId) {
      await query(`
        UPDATE "JobSchedule" 
        SET "actualHours" = COALESCE("actualHours", 0) + $1,
            "updatedAt" = NOW()
        WHERE id = $2
      `, [finalHours, data.scheduleId])
    }

    // Get related data for response
    const [userResult, jobResult, customerResult] = await Promise.all([
      query('SELECT id, name FROM "User" WHERE id = $1', [data.userId]),
      query('SELECT id, "jobNumber", description FROM "Job" WHERE id = $1', [data.jobId]),
      query(`
        SELECT c."companyName", c."firstName", c."lastName"
        FROM "Customer" c
        INNER JOIN "Job" j ON c.id = j."customerId"
        WHERE j.id = $1
      `, [data.jobId])
    ])

    const user = userResult.rows[0]
    const job = jobResult.rows[0]
    const customer = customerResult.rows[0]

    const completeTimeEntry = {
      id: timeEntry.id,
      userId: timeEntry.userId,
      userName: user?.name || 'Unknown User',
      jobId: timeEntry.jobId,
      jobNumber: job?.jobNumber || 'Unknown Job',
      jobTitle: job?.description || 'Unknown Job',
      customer: customer ? (customer.companyName || `${customer.firstName} ${customer.lastName}`) : 'Unknown Customer',
      phaseId: timeEntry.phaseId,
      phaseName: null,
      date: timeEntry.date,
      startTime: timeEntry.startTime,
      endTime: timeEntry.endTime,
      hours: parseFloat(timeEntry.hours),
      calculatedHours: finalHours,
      description: timeEntry.description,
      synced: timeEntry.synced,
      isActive: false,
      createdAt: timeEntry.createdAt,
      updatedAt: timeEntry.updatedAt,
    }

    return NextResponse.json(completeTimeEntry, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating direct time entry:', error)
    return NextResponse.json(
      { error: 'Failed to create time entry' },
      { status: 500 }
    )
  }
}