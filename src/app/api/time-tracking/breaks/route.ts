import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { z } from 'zod'

const startBreakSchema = z.object({
  userId: z.string(),
  breakType: z.enum(['LUNCH', 'SHORT_BREAK', 'PERSONAL', 'MEETING', 'TRAVEL', 'OTHER']),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  notes: z.string().optional()
})

// POST - Start a break
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = startBreakSchema.parse(body)
    
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Check if user has an active time entry
      const activeTimeResult = await client.query(`
        SELECT id FROM "TimeEntry" 
        WHERE "userId" = $1 AND status = 'ACTIVE'
      `, [data.userId])
      
      if (activeTimeResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No active time entry found. Clock in first.' },
          { status: 400 }
        )
      }
      
      const timeEntryId = activeTimeResult.rows[0].id
      
      // Check if user already has an active break
      const activeBreakResult = await client.query(`
        SELECT id FROM "TimeEntryBreak" 
        WHERE "timeEntryId" = $1 AND "endTime" IS NULL
      `, [timeEntryId])
      
      if (activeBreakResult.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Already on a break. End current break first.' },
          { status: 400 }
        )
      }
      
      // Create break record
      const breakResult = await client.query(`
        INSERT INTO "TimeEntryBreak" (
          "timeEntryId", "breakType", "startTime", 
          "latitude", "longitude", "notes", "isPaid", "isDeducted"
        ) VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        timeEntryId,
        data.breakType,
        data.latitude || null,
        data.longitude || null,
        data.notes || null,
        data.breakType === 'SHORT_BREAK', // Short breaks are typically paid
        data.breakType !== 'SHORT_BREAK'  // Everything except short breaks is deducted
      ])
      
      await client.query('COMMIT')
      
      const breakRecord = breakResult.rows[0]
      
      return NextResponse.json({
        success: true,
        data: {
          id: breakRecord.id,
          timeEntryId: breakRecord.timeEntryId,
          breakType: breakRecord.breakType,
          startTime: breakRecord.startTime,
          latitude: breakRecord.latitude,
          longitude: breakRecord.longitude,
          notes: breakRecord.notes,
          isPaid: breakRecord.isPaid,
          isDeducted: breakRecord.isDeducted
        },
        message: `${data.breakType.replace('_', ' ').toLowerCase()} break started`
      })
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error starting break:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to start break' },
      { status: 500 }
    )
  }
}

// GET - Get break history for user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const timeEntryId = searchParams.get('timeEntryId')
    const limit = searchParams.get('limit') || '50'
    
    if (!userId && !timeEntryId) {
      return NextResponse.json(
        { success: false, error: 'userId or timeEntryId is required' },
        { status: 400 }
      )
    }
    
    const client = await pool.connect()
    
    try {
      let query = `
        SELECT 
          teb.*,
          te."userId",
          u.name as "userName",
          CASE 
            WHEN teb."endTime" IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (teb."endTime" - teb."startTime")) / 60
            ELSE EXTRACT(EPOCH FROM (NOW() - teb."startTime")) / 60
          END as "currentDurationMinutes"
        FROM "TimeEntryBreak" teb
        JOIN "TimeEntry" te ON teb."timeEntryId" = te.id
        JOIN "User" u ON te."userId" = u.id
        WHERE 1=1
      `
      
      const params: any[] = []
      let paramIndex = 1
      
      if (userId) {
        query += ` AND te."userId" = $${paramIndex}`
        params.push(userId)
        paramIndex++
      }
      
      if (timeEntryId) {
        query += ` AND teb."timeEntryId" = $${paramIndex}`
        params.push(timeEntryId)
        paramIndex++
      }
      
      query += ` ORDER BY teb."startTime" DESC LIMIT $${paramIndex}`
      params.push(parseInt(limit))
      
      const result = await client.query(query, params)
      
      const breaks = result.rows.map(row => ({
        id: row.id,
        timeEntryId: row.timeEntryId,
        userId: row.userId,
        userName: row.userName,
        breakType: row.breakType,
        startTime: row.startTime,
        endTime: row.endTime,
        durationMinutes: row.durationMinutes,
        currentDurationMinutes: parseFloat(row.currentDurationMinutes || 0),
        isPaid: row.isPaid,
        isDeducted: row.isDeducted,
        latitude: row.latitude,
        longitude: row.longitude,
        notes: row.notes,
        isActive: !row.endTime,
        createdAt: row.createdAt
      }))
      
      return NextResponse.json({
        success: true,
        data: breaks
      })
      
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('Error fetching breaks:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch breaks' },
      { status: 500 }
    )
  }
}