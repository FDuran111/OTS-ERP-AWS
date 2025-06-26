import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// GET - Get current active break for user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      )
    }
    
    const client = await pool.connect()
    
    try {
      // Get active break for user
      const result = await client.query(`
        SELECT 
          teb.*,
          te."userId",
          te."jobId",
          u.name as "userName",
          j."jobNumber",
          j.title as "jobTitle",
          EXTRACT(EPOCH FROM (NOW() - teb."startTime")) / 60 as "currentDurationMinutes"
        FROM "TimeEntryBreak" teb
        JOIN "TimeEntry" te ON teb."timeEntryId" = te.id
        JOIN "User" u ON te."userId" = u.id
        LEFT JOIN "Job" j ON te."jobId" = j.id
        WHERE te."userId" = $1 
          AND teb."endTime" IS NULL
          AND te.status = 'ACTIVE'
        ORDER BY teb."startTime" DESC
        LIMIT 1
      `, [userId])
      
      const activeBreak = result.rows[0]
      
      if (!activeBreak) {
        return NextResponse.json({
          success: true,
          data: null,
          message: 'No active break found'
        })
      }
      
      // Also get today's break summary
      const summaryResult = await client.query(`
        SELECT 
          COUNT(*) as "totalBreaks",
          COALESCE(SUM(
            CASE 
              WHEN teb."endTime" IS NOT NULL 
              THEN teb."durationMinutes"
              ELSE EXTRACT(EPOCH FROM (NOW() - teb."startTime")) / 60
            END
          ), 0) as "totalBreakMinutes",
          COALESCE(SUM(
            CASE 
              WHEN teb."isDeducted" = true AND teb."endTime" IS NOT NULL
              THEN teb."durationMinutes"
              WHEN teb."isDeducted" = true AND teb."endTime" IS NULL
              THEN EXTRACT(EPOCH FROM (NOW() - teb."startTime")) / 60
              ELSE 0
            END
          ), 0) as "deductedMinutes",
          COALESCE(SUM(
            CASE 
              WHEN teb."isPaid" = true AND teb."endTime" IS NOT NULL
              THEN teb."durationMinutes"
              WHEN teb."isPaid" = true AND teb."endTime" IS NULL
              THEN EXTRACT(EPOCH FROM (NOW() - teb."startTime")) / 60
              ELSE 0
            END
          ), 0) as "paidMinutes"
        FROM "TimeEntryBreak" teb
        JOIN "TimeEntry" te ON teb."timeEntryId" = te.id
        WHERE te."userId" = $1 
          AND DATE(teb."startTime") = CURRENT_DATE
      `, [userId])
      
      const summary = summaryResult.rows[0]
      
      return NextResponse.json({
        success: true,
        data: {
          id: activeBreak.id,
          timeEntryId: activeBreak.timeEntryId,
          userId: activeBreak.userId,
          userName: activeBreak.userName,
          jobNumber: activeBreak.jobNumber,
          jobTitle: activeBreak.jobTitle,
          breakType: activeBreak.breakType,
          startTime: activeBreak.startTime,
          currentDurationMinutes: parseFloat(activeBreak.currentDurationMinutes),
          isPaid: activeBreak.isPaid,
          isDeducted: activeBreak.isDeducted,
          latitude: activeBreak.latitude,
          longitude: activeBreak.longitude,
          notes: activeBreak.notes,
          todaysSummary: {
            totalBreaks: parseInt(summary.totalBreaks),
            totalBreakMinutes: parseFloat(summary.totalBreakMinutes),
            deductedMinutes: parseFloat(summary.deductedMinutes),
            paidMinutes: parseFloat(summary.paidMinutes)
          }
        }
      })
      
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('Error fetching active break:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch active break' },
      { status: 500 }
    )
  }
}