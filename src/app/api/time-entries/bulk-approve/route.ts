import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { query } from '@/lib/db'
import { timeTrackingNotifications } from '@/lib/time-tracking-notifications'
import { createAudit, captureChanges, generateCorrelationId } from '@/lib/audit-helper'
import { Pool } from 'pg'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userPayload = verifyToken(token)
    const adminId = userPayload.id
    const adminRole = userPayload.role

    if (!['ADMIN', 'MANAGER', 'HR_MANAGER', 'OWNER_ADMIN'].includes(adminRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { 
      entryIds, 
      employeeId, 
      jobId, 
      startDate, 
      endDate,
      notes 
    } = body

    let timeEntries: any[] = []

    if (entryIds && entryIds.length > 0) {
      const result = await query(
        `SELECT te.*, u.name as "userName", u.email, j."jobNumber", j.description as "jobTitle"
         FROM "TimeEntry" te
         LEFT JOIN "User" u ON te."userId" = u.id
         LEFT JOIN "Job" j ON te."jobId" = j.id
         WHERE te.id = ANY($1::text[])
           AND te.status = 'submitted'`,
        [entryIds]
      )
      timeEntries = result.rows
    } else if (employeeId) {
      let queryStr = `SELECT te.*, u.name as "userName", u.email, j."jobNumber", j.description as "jobTitle"
                      FROM "TimeEntry" te
                      LEFT JOIN "User" u ON te."userId" = u.id
                      LEFT JOIN "Job" j ON te."jobId" = j.id
                      WHERE te."userId" = $1
                        AND te.status = 'submitted'`
      const params: any[] = [employeeId]
      
      if (startDate) {
        params.push(startDate)
        queryStr += ` AND te.date >= $${params.length}`
      }
      if (endDate) {
        params.push(endDate)
        queryStr += ` AND te.date <= $${params.length}`
      }
      
      const result = await query(queryStr, params)
      timeEntries = result.rows
    } else if (jobId) {
      let queryStr = `SELECT te.*, u.name as "userName", u.email, j."jobNumber", j.description as "jobTitle"
                      FROM "TimeEntry" te
                      LEFT JOIN "User" u ON te."userId" = u.id
                      LEFT JOIN "Job" j ON te."jobId" = j.id
                      WHERE te."jobId" = $1
                        AND te.status = 'submitted'`
      const params: any[] = [jobId]
      
      if (startDate) {
        params.push(startDate)
        queryStr += ` AND te.date >= $${params.length}`
      }
      if (endDate) {
        params.push(endDate)
        queryStr += ` AND te.date <= $${params.length}`
      }
      
      const result = await query(queryStr, params)
      timeEntries = result.rows
    } else if (startDate && endDate) {
      const result = await query(
        `SELECT te.*, u.name as "userName", u.email, j."jobNumber", j.description as "jobTitle"
         FROM "TimeEntry" te
         LEFT JOIN "User" u ON te."userId" = u.id
         LEFT JOIN "Job" j ON te."jobId" = j.id
         WHERE te.date >= $1
           AND te.date <= $2
           AND te.status = 'submitted'`,
        [startDate, endDate]
      )
      timeEntries = result.rows
    } else {
      return NextResponse.json(
        { error: 'Must provide entryIds, employeeId, jobId, or date range' },
        { status: 400 }
      )
    }

    if (timeEntries.length === 0) {
      return NextResponse.json({
        message: 'No entries found to approve',
        approved: 0,
      })
    }

    const correlationId = generateCorrelationId()
    const approvedEntries: any[] = []
    const failedEntries: any[] = []

    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    for (const entry of timeEntries) {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL })
      const client = await pool.connect()

      try {
        await client.query('BEGIN')

        await client.query(
          `UPDATE "TimeEntry"
           SET status = 'approved',
               "approvedBy" = $1,
               "approvedAt" = NOW()
           WHERE id = $2`,
          [adminId, entry.id]
        )

        await new Promise(resolve => setTimeout(resolve, 100))

        const laborCostResult = await client.query(
          `SELECT id FROM "JobLaborCost" 
           WHERE "timeEntryId" = $1 
           ORDER BY "createdAt" DESC 
           LIMIT 1`,
          [entry.id]
        )

        const jobLaborCostId = laborCostResult.rows[0]?.id || null

        const changes = captureChanges(
          { 
            status: entry.status,
            approvedBy: entry.approvedBy,
            approvedAt: entry.approvedAt
          },
          { 
            status: 'approved',
            approvedBy: adminId,
            approvedAt: new Date().toISOString()
          }
        )

        await createAudit({
          entryId: entry.id,
          userId: entry.userId,
          action: 'BULK_APPROVE',
          changedBy: adminId,
          changes,
          notes: notes || 'Bulk approved',
          correlationId,
          jobLaborCostId,
          ipAddress,
          userAgent
        }, client)

        await client.query('COMMIT')

        await timeTrackingNotifications.sendTimeEntryApprovedNotification({
          timeEntryId: entry.id,
          employeeId: entry.userId,
          employeeName: entry.userName,
          employeeEmail: entry.email,
          date: new Date(entry.date).toLocaleDateString(),
          hours: parseFloat(entry.hours || 0),
          jobNumber: entry.jobNumber,
          jobTitle: entry.jobTitle,
        })

        approvedEntries.push(entry.id)
      } catch (error) {
        await client.query('ROLLBACK')
        console.error(`Failed to approve entry ${entry.id}:`, error)
        failedEntries.push({ id: entry.id, error: String(error) })
      } finally {
        client.release()
        await pool.end()
      }
    }

    return NextResponse.json({
      message: `Approved ${approvedEntries.length} of ${timeEntries.length} entries`,
      approved: approvedEntries.length,
      failed: failedEntries.length,
      approvedIds: approvedEntries,
      failedIds: failedEntries,
      correlationId,
    })
  } catch (error) {
    console.error('Bulk approve error:', error)
    return NextResponse.json(
      { error: 'Failed to bulk approve entries' },
      { status: 500 }
    )
  }
}
