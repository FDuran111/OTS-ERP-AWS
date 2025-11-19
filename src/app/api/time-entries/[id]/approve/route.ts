import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { timeTrackingNotifications } from '@/lib/time-tracking-notifications'
import { createAudit, captureChanges } from '@/lib/audit-helper'
import { Pool } from 'pg'

// POST - Approve a time entry
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  const client = await pool.connect()

  try {
    const resolvedParams = await params
    const entryId = resolvedParams.id

    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userPayload = verifyToken(token)
    const userId = userPayload.id
    const userRole = userPayload.role

    if (!['ADMIN', 'MANAGER', 'HR_MANAGER', 'OWNER_ADMIN'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    await client.query('BEGIN')

    const checkResult = await client.query(
      `SELECT te.*, u.name as "userName", u.email, j."jobNumber", j.description as "jobTitle"
       FROM "TimeEntry" te
       LEFT JOIN "User" u ON te."userId" = u.id
       LEFT JOIN "Job" j ON te."jobId" = j.id
       WHERE te.id = $1`,
      [entryId]
    )

    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return NextResponse.json(
        { error: 'Time entry not found' },
        { status: 404 }
      )
    }

    const entry = checkResult.rows[0]

    if (entry.status === 'approved') {
      await client.query('ROLLBACK')
      return NextResponse.json(
        { error: 'This entry has already been approved' },
        { status: 400 }
      )
    }

    const updateResult = await client.query(
      `UPDATE "TimeEntry"
       SET
         status = 'approved',
         "approvedAt" = NOW(),
         "approvedBy" = $2,
         "updatedAt" = NOW()
       WHERE id = $1
       RETURNING *`,
      [entryId, userId]
    )

    const approvedEntry = updateResult.rows[0]

    // Check if JobLaborCost already exists for this time entry
    const existingLaborCost = await client.query(
      `SELECT id FROM "JobLaborCost"
       WHERE "timeEntryId" = $1
       ORDER BY "createdAt" DESC
       LIMIT 1`,
      [entryId]
    )

    let jobLaborCostId = existingLaborCost.rows[0]?.id || null

    // If no JobLaborCost exists and we have a jobId, create one
    if (!jobLaborCostId && entry.jobId) {
      // Get user's rates and role for labor cost calculation
      const userRatesResult = await client.query(
        `SELECT role, "regularRate", "overtimeRate", "doubleTimeRate"
         FROM "User" WHERE id = $1`,
        [entry.userId]
      )
      const userRates = userRatesResult.rows[0]

      // Map role to skill level
      const roleToSkillLevel: Record<string, string> = {
        'OWNER_ADMIN': 'FOREMAN',
        'FOREMAN': 'FOREMAN',
        'EMPLOYEE': 'JOURNEYMAN',
        'FIELD_CREW': 'JOURNEYMAN',
        'APPRENTICE': 'APPRENTICE'
      }
      const skillLevel = roleToSkillLevel[userRates?.role] || 'JOURNEYMAN'

      // Calculate total cost based on hour types
      const regularHours = parseFloat(approvedEntry.regularHours || 0)
      const overtimeHours = parseFloat(approvedEntry.overtimeHours || 0)
      const doubleTimeHours = parseFloat(approvedEntry.doubleTimeHours || 0)
      const totalHours = parseFloat(approvedEntry.hours || 0)

      const regularRate = parseFloat(userRates?.regularRate || 25)
      const overtimeRate = parseFloat(userRates?.overtimeRate || regularRate * 1.5)
      const doubleTimeRate = parseFloat(userRates?.doubleTimeRate || regularRate * 2)

      // Calculate total cost with OT breakdown
      const totalCost = (regularHours * regularRate) +
                        (overtimeHours * overtimeRate) +
                        (doubleTimeHours * doubleTimeRate)

      // Use weighted average hourly rate for the record
      const effectiveRate = totalHours > 0 ? totalCost / totalHours : regularRate

      // Create the JobLaborCost record
      const laborCostInsert = await client.query(
        `INSERT INTO "JobLaborCost" (
          "jobId", "userId", "skillLevel", "hourlyRate",
          "hoursWorked", "totalCost", "workDate", "timeEntryId"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id`,
        [
          entry.jobId,
          entry.userId,
          skillLevel,
          effectiveRate,
          totalHours,
          totalCost,
          entry.date,
          entryId
        ]
      )

      jobLaborCostId = laborCostInsert.rows[0]?.id
      console.log(`[APPROVE] Created JobLaborCost ${jobLaborCostId} for time entry ${entryId}`)
    }

    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const changes = captureChanges(
      { 
        status: entry.status,
        approvedBy: entry.approvedBy,
        approvedAt: entry.approvedAt
      },
      { 
        status: 'approved',
        approvedBy: userId,
        approvedAt: new Date().toISOString()
      }
    )

    await createAudit({
      entryId,
      userId: entry.userId,
      action: 'APPROVE',
      changedBy: userId,
      changes,
      notes: 'Entry approved',
      jobLaborCostId,
      ipAddress,
      userAgent
    }, client)

    await client.query('COMMIT')

    await timeTrackingNotifications.sendTimeEntryApprovedNotification({
      timeEntryId: entryId,
      employeeId: entry.userId,
      employeeName: entry.userName,
      employeeEmail: entry.email,
      date: new Date(entry.date).toLocaleDateString(),
      hours: parseFloat(entry.hours || 0),
      jobNumber: entry.jobNumber,
      jobTitle: entry.jobTitle,
    })

    return NextResponse.json({
      success: true,
      message: 'Time entry approved with notification sent',
      entry: approvedEntry,
      laborCostId: jobLaborCostId
    })

  } catch (error: any) {
    await client.query('ROLLBACK')
    console.error('Error approving time entry:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to approve time entry' },
      { status: 500 }
    )
  } finally {
    client.release()
    await pool.end()
  }
}
