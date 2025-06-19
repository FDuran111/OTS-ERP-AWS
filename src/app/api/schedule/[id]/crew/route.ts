import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const updateCrewSchema = z.object({
  crewIds: z.array(z.string())
})

// GET crew assignments for a schedule
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const result = await query(`
      SELECT 
        ca."userId",
        ca.role,
        ca.status,
        u.name,
        u.email,
        u.role as user_role
      FROM "CrewAssignment" ca
      INNER JOIN "User" u ON ca."userId" = u.id
      WHERE ca."scheduleId" = $1 AND ca.status != 'REMOVED'
      ORDER BY u.name ASC
    `, [id])

    const assignedCrew = result.rows.map(row => ({
      id: row.userId,
      name: row.name,
      email: row.email,
      role: row.user_role,
      assignmentRole: row.role,
      status: row.status
    }))

    return NextResponse.json(assignedCrew)
  } catch (error) {
    console.error('Error fetching crew assignments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch crew assignments' },
      { status: 500 }
    )
  }
}

// PUT update crew assignments for a schedule
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const data = updateCrewSchema.parse(body)

    // Start transaction
    await query('BEGIN')

    try {
      // Get the job ID for this schedule
      const scheduleResult = await query(`
        SELECT "jobId" FROM "JobSchedule" WHERE id = $1
      `, [id])

      if (scheduleResult.rows.length === 0) {
        throw new Error('Schedule not found')
      }

      const jobId = scheduleResult.rows[0].jobId

      // Remove existing crew assignments
      await query(`
        UPDATE "CrewAssignment" 
        SET status = 'REMOVED', "updatedAt" = NOW()
        WHERE "scheduleId" = $1
      `, [id])

      // Add new crew assignments
      for (const userId of data.crewIds) {
        await query(`
          INSERT INTO "CrewAssignment" (
            id, "scheduleId", "userId", "jobId", role, status, "assignedAt", "createdAt", "updatedAt"
          ) VALUES (
            encode(gen_random_bytes(12), 'base64'), $1, $2, $3, $4, $5, NOW(), NOW(), NOW()
          )
          ON CONFLICT ("scheduleId", "userId") 
          DO UPDATE SET 
            status = 'ASSIGNED',
            "assignedAt" = NOW(),
            "updatedAt" = NOW()
        `, [id, userId, jobId, 'TECHNICIAN', 'ASSIGNED'])
      }

      await query('COMMIT')

      // Fetch updated crew assignments
      const updatedResult = await query(`
        SELECT 
          ca."userId",
          ca.role,
          ca.status,
          u.name,
          u.email,
          u.role as user_role
        FROM "CrewAssignment" ca
        INNER JOIN "User" u ON ca."userId" = u.id
        WHERE ca."scheduleId" = $1 AND ca.status != 'REMOVED'
        ORDER BY u.name ASC
      `, [id])

      const updatedCrew = updatedResult.rows.map(row => ({
        id: row.userId,
        name: row.name,
        email: row.email,
        role: row.user_role,
        assignmentRole: row.role,
        status: row.status
      }))

      return NextResponse.json(updatedCrew)
    } catch (error) {
      await query('ROLLBACK')
      throw error
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error updating crew assignments:', error)
    return NextResponse.json(
      { error: 'Failed to update crew assignments' },
      { status: 500 }
    )
  }
}