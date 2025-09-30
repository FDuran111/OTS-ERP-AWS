import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { z } from 'zod'

const approvalSchema = z.object({
  timeEntryIds: z.array(z.string()),
  action: z.enum(['APPROVE', 'REJECT', 'SUBMIT_FOR_APPROVAL']),
  notes: z.string().optional(),
  approvedBy: z.string().optional()
})

const bulkApprovalSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  userIds: z.array(z.string()).optional(),
  action: z.enum(['APPROVE', 'REJECT', 'SUBMIT_FOR_APPROVAL']),
  notes: z.string().optional(),
  approvedBy: z.string().optional()
})

// GET - Get time entries pending approval
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'SUBMITTED'
    const userId = searchParams.get('userId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = searchParams.get('limit') || '100'
    
    const client = await pool.connect()
    
    try {
      let query = `
        SELECT 
          te.*,
          u.name as "employeeName",
          u.email as "employeeEmail",
          approver.name as "approvedByName",
          j."jobNumber",
          j.title as "jobTitle",
          
          -- Calculate potential issues
          CASE 
            WHEN te."totalHours" > 12 THEN true
            ELSE false
          END as "hasLongDay",
          
          CASE 
            WHEN te."overtimeHours" > 0 THEN true
            ELSE false
          END as "hasOvertime",
          
          CASE 
            WHEN te."breakMinutes" = 0 AND te."totalHours" > 6 THEN true
            ELSE false
          END as "missingBreaks",
          
          -- Break details
          (
            SELECT json_agg(
              json_build_object(
                'breakType', teb."breakType",
                'startTime', teb."startTime",
                'endTime', teb."endTime",
                'durationMinutes', teb."durationMinutes",
                'isPaid', teb."isPaid",
                'isDeducted', teb."isDeducted"
              )
            )
            FROM "TimeEntryBreak" teb 
            WHERE teb."timeEntryId" = te.id AND teb."endTime" IS NOT NULL
          ) as "breaks"
          
        FROM "TimeEntry" te
        JOIN "User" u ON te."userId" = u.id
        LEFT JOIN "User" approver ON te."approvedBy" = approver.id
        LEFT JOIN "Job" j ON te."jobId" = j.id
        WHERE te.status = $1
      `
      
      const params: any[] = [status]
      let paramIndex = 2
      
      if (userId) {
        query += ` AND te."userId" = $${paramIndex}`
        params.push(userId)
        paramIndex++
      }
      
      if (startDate) {
        query += ` AND DATE(te."clockInTime") >= $${paramIndex}::date`
        params.push(startDate)
        paramIndex++
      }
      
      if (endDate) {
        query += ` AND DATE(te."clockInTime") <= $${paramIndex}::date`
        params.push(endDate)
        paramIndex++
      }
      
      query += ` ORDER BY te."clockInTime" DESC LIMIT $${paramIndex}`
      params.push(parseInt(limit))
      
      const result = await client.query(query, params)
      
      // Group entries by employee for easier review
      const entriesByEmployee = result.rows.reduce((acc, row) => {
        const userId = row.userId
        if (!acc[userId]) {
          acc[userId] = {
            userId: row.userId,
            employeeName: row.employeeName,
            employeeEmail: row.employeeEmail,
            totalEntries: 0,
            totalHours: 0,
            totalPay: 0,
            totalOvertimeHours: 0,
            flaggedEntries: 0,
            entries: []
          }
        }
        
        const entry = {
          id: row.id,
          jobId: row.jobId,
          jobNumber: row.jobNumber,
          jobTitle: row.jobTitle,
          clockInTime: row.clockInTime,
          clockOutTime: row.clockOutTime,
          totalHours: parseFloat(row.totalHours || 0),
          regularHours: parseFloat(row.regularHours || 0),
          overtimeHours: parseFloat(row.overtimeHours || 0),
          totalPay: parseFloat(row.totalPay || 0),
          breakMinutes: parseFloat(row.breakMinutes || 0),
          workDescription: row.workDescription,
          status: row.status,
          approvedBy: row.approvedBy,
          approvedByName: row.approvedByName,
          approvedAt: row.approvedAt,
          submittedAt: row.submittedAt,
          notes: row.notes,
          breaks: row.breaks || [],
          flags: {
            hasLongDay: row.hasLongDay,
            hasOvertime: row.hasOvertime,
            missingBreaks: row.missingBreaks
          },
          workDate: row.clockInTime ? new Date(row.clockInTime).toDateString() : null
        }
        
        acc[userId].totalEntries++
        acc[userId].totalHours += entry.totalHours
        acc[userId].totalPay += entry.totalPay
        acc[userId].totalOvertimeHours += entry.overtimeHours
        
        if (entry.flags.hasLongDay || entry.flags.hasOvertime || entry.flags.missingBreaks) {
          acc[userId].flaggedEntries++
        }
        
        acc[userId].entries.push(entry)
        
        return acc
      }, {})
      
      // Calculate summary statistics
      const summary = {
        totalEmployees: Object.keys(entriesByEmployee).length,
        totalEntries: result.rows.length,
        totalHours: result.rows.reduce((sum, row) => sum + parseFloat(row.totalHours || 0), 0),
        totalPay: result.rows.reduce((sum, row) => sum + parseFloat(row.totalPay || 0), 0),
        totalOvertimeHours: result.rows.reduce((sum, row) => sum + parseFloat(row.overtimeHours || 0), 0),
        flaggedEntries: result.rows.filter(row => row.hasLongDay || row.hasOvertime || row.missingBreaks).length,
        status
      }
      
      return NextResponse.json({
        success: true,
        summary,
        data: Object.values(entriesByEmployee)
      })
      
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('Error fetching entries for approval:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch entries for approval' },
      { status: 500 }
    )
  }
}

// POST - Process approval actions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Check if this is a bulk approval
    if (body.startDate && body.endDate) {
      const data = bulkApprovalSchema.parse(body)
      return await processBulkApproval(data)
    }
    
    // Individual entry approval
    const data = approvalSchema.parse(body)
    return await processIndividualApproval(data)
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error processing approval:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process approval' },
      { status: 500 }
    )
  }
}

// Helper function for individual approvals
async function processIndividualApproval(data: z.infer<typeof approvalSchema>) {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    let newStatus: string
    let timestamp: string
    
    switch (data.action) {
      case 'APPROVE':
        newStatus = 'APPROVED'
        timestamp = 'approvedAt'
        break
      case 'REJECT':
        newStatus = 'REJECTED'
        timestamp = 'approvedAt'
        break
      case 'SUBMIT_FOR_APPROVAL':
        newStatus = 'SUBMITTED'
        timestamp = 'submittedAt'
        break
    }
    
    // Update time entries
    const result = await client.query(`
      UPDATE "TimeEntry" 
      SET 
        status = $1,
        "${timestamp}" = NOW(),
        "approvedBy" = $2,
        notes = COALESCE($3, notes)
      WHERE id = ANY($4::uuid[])
      RETURNING id, "userId", status
    `, [newStatus, data.approvedBy, data.notes, data.timeEntryIds])
    
    // Log approval actions
    for (const entry of result.rows) {
      await client.query(`
        INSERT INTO "TimeEntryAuditLog" (
          "timeEntryId", "userId", "action", "performedBy", 
          "oldStatus", "newStatus", "notes"
        ) VALUES ($1, $2, $3, $4, 'COMPLETED', $5, $6)
      `, [entry.id, entry.userId, data.action, data.approvedBy, newStatus, data.notes])
    }
    
    await client.query('COMMIT')
    
    return NextResponse.json({
      success: true,
      message: `${data.action.toLowerCase()} processed for ${result.rows.length} time entries`,
      processedEntries: result.rows.length,
      action: data.action
    })
    
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// Helper function for bulk approvals
async function processBulkApproval(data: z.infer<typeof bulkApprovalSchema>) {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    // Build query to find eligible entries
    let query = `
      SELECT id, "userId" FROM "TimeEntry"
      WHERE status = 'COMPLETED' OR status = 'SUBMITTED'
        AND DATE("clockInTime") >= $1::date
        AND DATE("clockInTime") <= $2::date
    `
    
    const params: any[] = [data.startDate, data.endDate]
    
    if (data.userIds && data.userIds.length > 0) {
      query += ` AND "userId" = ANY($3::text[])`
      params.push(data.userIds)
    }
    
    const eligibleEntries = await client.query(query, params)
    
    if (eligibleEntries.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No eligible time entries found for the specified criteria'
      }, { status: 400 })
    }
    
    const timeEntryIds = eligibleEntries.rows.map(row => row.id)
    
    // Process the approval using the individual approval function
    const approvalData = {
      timeEntryIds,
      action: data.action,
      notes: data.notes,
      approvedBy: data.approvedBy
    }
    
    return await processIndividualApproval(approvalData)
    
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}