import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { query } from '@/lib/db'
import { timeTrackingNotifications } from '@/lib/time-tracking-notifications'

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
        `SELECT te.*, u."firstName", u."lastName", u.email, j."jobNumber", j.title as "jobTitle"
         FROM "TimeEntry" te
         LEFT JOIN "User" u ON te."userId" = u.id
         LEFT JOIN "Job" j ON te."jobId" = j.id
         WHERE te.id = ANY($1::text[])
           AND te.status = 'SUBMITTED'`,
        [entryIds]
      )
      timeEntries = result.rows
    } else if (employeeId) {
      let queryStr = `SELECT te.*, u."firstName", u."lastName", u.email, j."jobNumber", j.title as "jobTitle"
                      FROM "TimeEntry" te
                      LEFT JOIN "User" u ON te."userId" = u.id
                      LEFT JOIN "Job" j ON te."jobId" = j.id
                      WHERE te."userId" = $1
                        AND te.status = 'SUBMITTED'`
      const params: any[] = [employeeId]
      
      if (startDate) {
        params.push(startDate)
        queryStr += ` AND te."clockInTime" >= $${params.length}`
      }
      if (endDate) {
        params.push(endDate)
        queryStr += ` AND te."clockInTime" <= $${params.length}`
      }
      
      const result = await query(queryStr, params)
      timeEntries = result.rows
    } else if (jobId) {
      let queryStr = `SELECT te.*, u."firstName", u."lastName", u.email, j."jobNumber", j.title as "jobTitle"
                      FROM "TimeEntry" te
                      LEFT JOIN "User" u ON te."userId" = u.id
                      LEFT JOIN "Job" j ON te."jobId" = j.id
                      WHERE te."jobId" = $1
                        AND te.status = 'SUBMITTED'`
      const params: any[] = [jobId]
      
      if (startDate) {
        params.push(startDate)
        queryStr += ` AND te."clockInTime" >= $${params.length}`
      }
      if (endDate) {
        params.push(endDate)
        queryStr += ` AND te."clockInTime" <= $${params.length}`
      }
      
      const result = await query(queryStr, params)
      timeEntries = result.rows
    } else if (startDate && endDate) {
      const result = await query(
        `SELECT te.*, u."firstName", u."lastName", u.email, j."jobNumber", j.title as "jobTitle"
         FROM "TimeEntry" te
         LEFT JOIN "User" u ON te."userId" = u.id
         LEFT JOIN "Job" j ON te."jobId" = j.id
         WHERE te."clockInTime" >= $1
           AND te."clockInTime" <= $2
           AND te.status = 'SUBMITTED'`,
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

    const approvedEntries: any[] = []
    const failedEntries: any[] = []

    for (const entry of timeEntries) {
      try {
        await query(
          `UPDATE "TimeEntry"
           SET status = 'APPROVED',
               "approvedBy" = $1,
               "approvedAt" = NOW(),
               "approvalNotes" = $2
           WHERE id = $3`,
          [adminId, notes || 'Bulk approved', entry.id]
        )

        await query(
          `INSERT INTO "TimeEntryAudit" (entry_id, user_id, action, changes, notes, created_at)
           VALUES ($1, $2, 'APPROVE', $3, $4, NOW())`,
          [
            entry.id,
            adminId,
            JSON.stringify({ status: { from: 'SUBMITTED', to: 'APPROVED' } }),
            notes || 'Bulk approved',
          ]
        )

        await timeTrackingNotifications.sendTimeEntryApprovedNotification({
          timeEntryId: entry.id,
          employeeId: entry.userId,
          employeeName: `${entry.firstName} ${entry.lastName}`,
          employeeEmail: entry.email,
          date: new Date(entry.clockInTime).toLocaleDateString(),
          hours: parseFloat(entry.totalHours || 0),
          jobNumber: entry.jobNumber,
          jobTitle: entry.jobTitle,
        })

        approvedEntries.push(entry.id)
      } catch (error) {
        console.error(`Failed to approve entry ${entry.id}:`, error)
        failedEntries.push({ id: entry.id, error: String(error) })
      }
    }

    return NextResponse.json({
      message: `Approved ${approvedEntries.length} of ${timeEntries.length} entries`,
      approved: approvedEntries.length,
      failed: failedEntries.length,
      approvedIds: approvedEntries,
      failedIds: failedEntries,
    })
  } catch (error) {
    console.error('Bulk approve error:', error)
    return NextResponse.json(
      { error: 'Failed to bulk approve entries' },
      { status: 500 }
    )
  }
}
