import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const newJobEntrySchema = z.object({
  userId: z.string(),
  jobNumber: z.string().min(1),
  customer: z.string().min(1),
  description: z.string().optional(),
  date: z.string(),
  hours: z.number().positive(),
  workDescription: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = newJobEntrySchema.parse(body)

    // Store the new job entry in a separate table for admin review
    const result = await query(`
      INSERT INTO "NewJobEntry" (
        "userId",
        "jobNumber",
        customer,
        description,
        date,
        hours,
        "workDescription",
        status,
        "createdAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', NOW())
      RETURNING *
    `, [
      data.userId,
      data.jobNumber,
      data.customer,
      data.description || null,
      data.date,
      data.hours,
      data.workDescription || null,
    ])

    // Get user details for the notification
    const userResult = await query(`
      SELECT name, email FROM "User" WHERE id = $1
    `, [data.userId])

    const newEntry = result.rows[0]
    const user = userResult.rows[0]

    // Add user info to response
    newEntry.userName = user?.name || 'Unknown'
    newEntry.userEmail = user?.email || ''

    return NextResponse.json(newEntry, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    // If table doesn't exist, return error message
    if (error?.originalError?.code === '42P01') {
      return NextResponse.json(
        { error: 'New job entry system is not yet configured. Please contact administrator.' },
        { status: 503 }
      )
    }

    console.error('Error creating new job entry:', error)
    return NextResponse.json(
      { error: 'Failed to create new job entry' },
      { status: 500 }
    )
  }
}

// GET endpoint to fetch pending new job entries for admin review
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'PENDING'

    const result = await query(`
      SELECT
        nje.*,
        u.name as "userName",
        u.email as "userEmail"
      FROM "NewJobEntry" nje
      LEFT JOIN "User" u ON nje."userId" = u.id
      WHERE nje.status = $1
      ORDER BY nje."createdAt" DESC
      LIMIT 50
    `, [status])

    return NextResponse.json(result.rows)
  } catch (error: any) {
    // If table doesn't exist, return empty array
    if (error?.originalError?.code === '42P01') {
      return NextResponse.json([])
    }
    console.error('Error fetching new job entries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch new job entries' },
      { status: 500 }
    )
  }
}

// PATCH endpoint to approve/reject new job entries
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, jobId } = body

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Update the entry status
    const updateResult = await query(`
      UPDATE "NewJobEntry"
      SET status = $1, "reviewedAt" = NOW(), "approvedJobId" = $2
      WHERE id = $3
      RETURNING *
    `, [status, jobId || null, id])

    if (updateResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      )
    }

    const entry = updateResult.rows[0]

    // If approved and a jobId is provided, create a time entry
    if (status === 'APPROVED' && jobId) {
      await query(`
        INSERT INTO "TimeEntry" (
          "userId",
          "jobId",
          date,
          hours,
          description,
          "createdAt"
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `, [
        entry.userId,
        jobId,
        entry.date,
        entry.hours,
        entry.workDescription || `Work performed on ${entry.jobNumber}`,
      ])
    }

    return NextResponse.json(entry)
  } catch (error) {
    console.error('Error updating new job entry:', error)
    return NextResponse.json(
      { error: 'Failed to update new job entry' },
      { status: 500 }
    )
  }
}