import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { z } from 'zod'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const endBreakSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  notes: z.string().optional()
})

// PUT - End a break
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const data = endBreakSchema.parse(body)
    
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Check if break exists and is active
      const breakResult = await client.query(`
        SELECT teb.*, te."userId", u.name as "userName"
        FROM "TimeEntryBreak" teb
        JOIN "TimeEntry" te ON teb."timeEntryId" = te.id
        JOIN "User" u ON te."userId" = u.id
        WHERE teb.id = $1 AND teb."endTime" IS NULL
      `, [params.id])
      
      if (breakResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Break not found or already ended' },
          { status: 404 }
        )
      }
      
      const breakRecord = breakResult.rows[0]
      
      // End the break
      const updateResult = await client.query(`
        UPDATE "TimeEntryBreak" 
        SET 
          "endTime" = NOW(),
          "durationMinutes" = EXTRACT(EPOCH FROM (NOW() - "startTime")) / 60,
          "endLatitude" = $1,
          "endLongitude" = $2,
          "notes" = COALESCE($3, "notes")
        WHERE id = $4
        RETURNING *
      `, [data.latitude, data.longitude, data.notes, params.id])
      
      const updatedBreak = updateResult.rows[0]
      
      // Update total break minutes on the time entry if this break is deducted
      if (updatedBreak.isDeducted) {
        await client.query(`
          UPDATE "TimeEntry" 
          SET "breakMinutes" = COALESCE("breakMinutes", 0) + $1
          WHERE id = $2
        `, [updatedBreak.durationMinutes, updatedBreak.timeEntryId])
      }
      
      await client.query('COMMIT')
      
      return NextResponse.json({
        success: true,
        data: {
          id: updatedBreak.id,
          timeEntryId: updatedBreak.timeEntryId,
          userId: breakRecord.userId,
          userName: breakRecord.userName,
          breakType: updatedBreak.breakType,
          startTime: updatedBreak.startTime,
          endTime: updatedBreak.endTime,
          durationMinutes: parseFloat(updatedBreak.durationMinutes),
          isPaid: updatedBreak.isPaid,
          isDeducted: updatedBreak.isDeducted,
          latitude: updatedBreak.latitude,
          longitude: updatedBreak.longitude,
          endLatitude: updatedBreak.endLatitude,
          endLongitude: updatedBreak.endLongitude,
          notes: updatedBreak.notes
        },
        message: `${updatedBreak.breakType.replace('_', ' ').toLowerCase()} break ended (${Math.round(updatedBreak.durationMinutes)} minutes)`
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
    console.error('Error ending break:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to end break' },
      { status: 500 }
    )
  }
}

// GET - Get specific break details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = await pool.connect()
    
    try {
      const result = await client.query(`
        SELECT 
          teb.*,
          te."userId",
          u.name as "userName",
          j."jobNumber",
          j.title as "jobTitle",
          CASE 
            WHEN teb."endTime" IS NOT NULL 
            THEN teb."durationMinutes"
            ELSE EXTRACT(EPOCH FROM (NOW() - teb."startTime")) / 60
          END as "currentDurationMinutes"
        FROM "TimeEntryBreak" teb
        JOIN "TimeEntry" te ON teb."timeEntryId" = te.id
        JOIN "User" u ON te."userId" = u.id
        LEFT JOIN "Job" j ON te."jobId" = j.id
        WHERE teb.id = $1
      `, [params.id])
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Break not found' },
          { status: 404 }
        )
      }
      
      const breakRecord = result.rows[0]
      
      return NextResponse.json({
        success: true,
        data: {
          id: breakRecord.id,
          timeEntryId: breakRecord.timeEntryId,
          userId: breakRecord.userId,
          userName: breakRecord.userName,
          jobNumber: breakRecord.jobNumber,
          jobTitle: breakRecord.jobTitle,
          breakType: breakRecord.breakType,
          startTime: breakRecord.startTime,
          endTime: breakRecord.endTime,
          durationMinutes: breakRecord.durationMinutes,
          currentDurationMinutes: parseFloat(breakRecord.currentDurationMinutes || 0),
          isPaid: breakRecord.isPaid,
          isDeducted: breakRecord.isDeducted,
          latitude: breakRecord.latitude,
          longitude: breakRecord.longitude,
          endLatitude: breakRecord.endLatitude,
          endLongitude: breakRecord.endLongitude,
          notes: breakRecord.notes,
          isActive: !breakRecord.endTime,
          createdAt: breakRecord.createdAt
        }
      })
      
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('Error fetching break:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch break' },
      { status: 500 }
    )
  }
}

// DELETE - Cancel/delete a break (only if not ended)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Check if break exists and is active
      const breakResult = await client.query(`
        SELECT * FROM "TimeEntryBreak" 
        WHERE id = $1 AND "endTime" IS NULL
      `, [params.id])
      
      if (breakResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Break not found or already ended' },
          { status: 404 }
        )
      }
      
      // Delete the break record
      await client.query(`
        DELETE FROM "TimeEntryBreak" WHERE id = $1
      `, [params.id])
      
      await client.query('COMMIT')
      
      return NextResponse.json({
        success: true,
        message: 'Break cancelled successfully'
      })
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('Error cancelling break:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to cancel break' },
      { status: 500 }
    )
  }
}