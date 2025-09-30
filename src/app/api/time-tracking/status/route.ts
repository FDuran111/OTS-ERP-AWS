import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }
    
    // Get active time entry (where endTime is NULL)
    const result = await pool.query(`
      SELECT te.*,
             j."jobNumber", j.description as "jobDescription"
      FROM "TimeEntry" te
      LEFT JOIN "Job" j ON te."jobId" = j.id
      WHERE te."userId" = $1 AND te."endTime" IS NULL
      ORDER BY te."startTime" DESC
      LIMIT 1
    `, [userId])
    
    const activeEntry = result.rows[0] || null
    
    // If there's an active entry, calculate elapsed time
    let elapsedTime = null
    if (activeEntry) {
      const now = new Date()
      const startTime = new Date(activeEntry.startTime)
      const elapsedMinutes = Math.floor((now.getTime() - startTime.getTime()) / 60000)
      
      elapsedTime = {
        totalMinutes: elapsedMinutes,
        hours: Math.floor(elapsedMinutes / 60),
        minutes: elapsedMinutes % 60,
        formatted: `${Math.floor(elapsedMinutes / 60)}:${(elapsedMinutes % 60).toString().padStart(2, '0')}`
      }
    }
    
    // Get recent time entries (last 7 days)
    const recentResult = await pool.query(`
      SELECT te.*, 
             j."jobNumber", j.description as "jobDescription"
      FROM "TimeEntry" te
      LEFT JOIN "Job" j ON te."jobId" = j.id
      WHERE te."userId" = $1 
        AND te.status != 'ACTIVE' 
        AND te."clockInTime" >= NOW() - INTERVAL '7 days'
      ORDER BY te."clockInTime" DESC
      LIMIT 10
    `, [userId])
    
    // Get today's hours summary
    const todayResult = await pool.query(`
      SELECT 
        COUNT(*) as "totalEntries",
        COALESCE(SUM("totalHours"), 0) as "totalHours",
        COALESCE(SUM("regularHours"), 0) as "regularHours",
        COALESCE(SUM("overtimeHours"), 0) as "overtimeHours",
        COALESCE(SUM("totalPay"), 0) as "totalPay",
        COALESCE(SUM("breakMinutes"), 0) as "totalBreakMinutes"
      FROM "TimeEntry"
      WHERE "userId" = $1 
        AND DATE("clockInTime") = CURRENT_DATE
        AND status != 'ACTIVE'
    `, [userId])
    
    const todaySummary = todayResult.rows[0]
    
    // Get current active break
    const activeBreakResult = await pool.query(`
      SELECT 
        teb.*,
        EXTRACT(EPOCH FROM (NOW() - teb."startTime")) / 60 as "currentDurationMinutes"
      FROM "TimeEntryBreak" teb
      JOIN "TimeEntry" te ON teb."timeEntryId" = te.id
      WHERE te."userId" = $1 
        AND teb."endTime" IS NULL
        AND te.status = 'ACTIVE'
      ORDER BY teb."startTime" DESC
      LIMIT 1
    `, [userId])
    
    const activeBreak = activeBreakResult.rows[0]
    
    // Get today's break summary
    const breakSummaryResult = await pool.query(`
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
        ), 0) as "deductedMinutes"
      FROM "TimeEntryBreak" teb
      JOIN "TimeEntry" te ON teb."timeEntryId" = te.id
      WHERE te."userId" = $1 
        AND DATE(teb."startTime") = CURRENT_DATE
    `, [userId])
    
    const breakSummary = breakSummaryResult.rows[0]
    
    return NextResponse.json({
      success: true,
      data: {
        activeEntry,
        elapsedTime,
        recentEntries: recentResult.rows,
        activeBreak: activeBreak ? {
          id: activeBreak.id,
          breakType: activeBreak.breakType,
          startTime: activeBreak.startTime,
          currentDurationMinutes: parseFloat(activeBreak.currentDurationMinutes),
          isPaid: activeBreak.isPaid,
          isDeducted: activeBreak.isDeducted,
          notes: activeBreak.notes
        } : null,
        todaySummary: {
          entries: parseInt(todaySummary.totalEntries),
          totalHours: parseFloat(todaySummary.totalHours),
          regularHours: parseFloat(todaySummary.regularHours),
          overtimeHours: parseFloat(todaySummary.overtimeHours),
          totalPay: parseFloat(todaySummary.totalPay),
          totalBreakMinutes: parseFloat(todaySummary.totalBreakMinutes)
        },
        breakSummary: {
          totalBreaks: parseInt(breakSummary.totalBreaks),
          totalBreakMinutes: parseFloat(breakSummary.totalBreakMinutes),
          deductedMinutes: parseFloat(breakSummary.deductedMinutes)
        }
      }
    })
    
  } catch (error) {
    console.error('Time tracking status error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get time tracking status' },
      { status: 500 }
    )
  }
}