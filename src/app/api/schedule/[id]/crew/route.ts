import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'
import { emailService } from '@/lib/email'
import { verifyToken } from '@/lib/auth'

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
        u."firstName",
        u."lastName",
        u.email,
        u.role as user_role
      FROM "CrewAssignment" ca
      INNER JOIN "User" u ON ca."userId" = u.id
      WHERE ca."scheduleId" = $1 AND ca.status != 'REMOVED'
      ORDER BY u."firstName", u."lastName" ASC
    `, [id])

    const assignedCrew = result.rows.map(row => ({
      id: row.userId,
      name: `${row.firstName} ${row.lastName}`,
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

    // Get current user from token
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userPayload = verifyToken(token)
    const currentUserId = userPayload.id

    // Get current user details
    const currentUserResult = await query(
      'SELECT "firstName", "lastName" FROM "User" WHERE id = $1',
      [currentUserId]
    )
    
    if (currentUserResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const currentUser = currentUserResult.rows[0]
    const assignedBy = `${currentUser.firstName} ${currentUser.lastName}`

    // Start transaction
    await query('BEGIN')

    try {
      // Get the job ID and details for this schedule
      const scheduleResult = await query(`
        SELECT js."jobId", j.*, c."firstName", c."lastName", c."companyName"
        FROM "JobSchedule" js
        INNER JOIN "Job" j ON js."jobId" = j.id
        INNER JOIN "Customer" c ON j."customerId" = c.id
        WHERE js.id = $1
      `, [id])

      if (scheduleResult.rows.length === 0) {
        throw new Error('Schedule not found')
      }

      const schedule = scheduleResult.rows[0]
      const jobId = schedule.jobId
      const customerName = schedule.companyName || `${schedule.firstName} ${schedule.lastName}`

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
        `, [id, userId, jobId, 'EMPLOYEE', 'ASSIGNED'])
      }

      await query('COMMIT')

      // Fetch updated crew assignments
      const updatedResult = await query(`
        SELECT 
          ca."userId",
          ca.role,
          ca.status,
          u."firstName",
          u."lastName",
          u.email,
          u.role as user_role
        FROM "CrewAssignment" ca
        INNER JOIN "User" u ON ca."userId" = u.id
        WHERE ca."scheduleId" = $1 AND ca.status != 'REMOVED'
        ORDER BY u."firstName", u."lastName" ASC
      `, [id])

      const updatedCrew = updatedResult.rows.map(row => ({
        id: row.userId,
        name: `${row.firstName} ${row.lastName}`,
        email: row.email,
        role: row.user_role,
        assignmentRole: row.role,
        status: row.status
      }))

      // Send email notifications to newly assigned crew members
      const crewNames = updatedCrew.map(c => c.name)
      
      for (const crewMember of updatedCrew) {
        // Check if user has notifications enabled
        const shouldSend = await emailService.shouldSendNotification(
          crewMember.id,
          'new_job_assignments'
        )

        if (!shouldSend || !crewMember.email) {
          continue
        }

        // Build address string
        let address = schedule.address || ''
        if (schedule.city) address += address ? `, ${schedule.city}` : schedule.city
        if (schedule.state) address += address ? `, ${schedule.state}` : schedule.state
        if (schedule.zip) address += address ? ` ${schedule.zip}` : schedule.zip

        // Send email notification
        try {
          await emailService.sendJobAssignmentEmail(
            crewMember.email,
            {
              jobNumber: schedule.jobNumber,
              jobTitle: schedule.title,
              customerName,
              address: address || undefined,
              scheduledDate: schedule.scheduledDate,
              scheduledTime: schedule.scheduledTime,
              assignedBy,
              crewMembers: crewNames,
            }
          )
        } catch (error) {
          console.error(`Failed to send notification to ${crewMember.name}:`, error)
        }
      }

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