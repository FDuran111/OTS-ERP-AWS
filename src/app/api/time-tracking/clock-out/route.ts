import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, latitude, longitude, workDescription, notes } = body
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }
    
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Find active time entry (where endTime is NULL)
      const activeResult = await client.query(`
        SELECT * FROM "TimeEntry"
        WHERE "userId" = $1 AND "endTime" IS NULL
        ORDER BY "startTime" DESC
        LIMIT 1
      `, [userId])
      
      if (activeResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No active time entry found for user' },
          { status: 400 }
        )
      }
      
      const timeEntry = activeResult.rows[0]
      
      // Calculate hours worked
      const hoursWorked = (Date.now() - new Date(timeEntry.startTime).getTime()) / (1000 * 60 * 60)

      // Update time entry with clock out
      const updateResult = await client.query(`
        UPDATE "TimeEntry"
        SET
          "endTime" = NOW(),
          "hours" = $1,
          "description" = COALESCE("description", '') || ' | ' || $2,
          "gpsLatitude" = COALESCE("gpsLatitude", $3),
          "gpsLongitude" = COALESCE("gpsLongitude", $4),
          "updatedAt" = NOW()
        WHERE id = $5
        RETURNING *
      `, [hoursWorked.toFixed(2), workDescription || 'Clock out', latitude, longitude, timeEntry.id])
      
      const updatedEntry = updateResult.rows[0]
      
      // Calculate hours and pay
      const totalMinutes = Math.floor((new Date(updatedEntry.endTime).getTime() - new Date(updatedEntry.startTime).getTime()) / 60000)
      const totalHours = parseFloat(updatedEntry.hours)
      
      // Simple overtime calculation (over 8 hours)
      const regularHours = Math.min(totalHours, 8)
      const overtimeHours = Math.max(0, totalHours - 8)
      
      const regularRate = updatedEntry.appliedRegularRate || 25.00
      const overtimeRate = regularRate * 1.5
      
      const regularPay = regularHours * regularRate
      const overtimePay = overtimeHours * overtimeRate
      const totalPay = regularPay + overtimePay
      
      // Update calculated values
      const finalUpdate = await client.query(`
        UPDATE "TimeEntry" 
        SET 
          "totalHours" = $1,
          "regularHours" = $2,
          "overtimeHours" = $3,
          "totalPay" = $4
        WHERE id = $5
        RETURNING *
      `, [totalHours, regularHours, overtimeHours, totalPay, timeEntry.id])
      
      // Create job labor actual record if job assigned
      if (updatedEntry.jobId) {
        await client.query(`
          INSERT INTO "JobLaborActual" (
            "jobId", "timeEntryId", "userId",
            "actualHours", "actualCost", "dateWorked"
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT ("timeEntryId") DO UPDATE SET
            "actualHours" = EXCLUDED."actualHours",
            "actualCost" = EXCLUDED."actualCost"
        `, [
          updatedEntry.jobId,
          timeEntry.id,
          userId,
          totalHours,
          totalPay,
          new Date().toISOString().split('T')[0] // Today's date
        ])
      }
      
      await client.query('COMMIT')
      
      return NextResponse.json({
        success: true,
        data: finalUpdate.rows[0],
        message: 'Clocked out successfully',
        summary: {
          totalHours: totalHours.toFixed(2),
          regularHours: regularHours.toFixed(2),
          overtimeHours: overtimeHours.toFixed(2),
          totalPay: totalPay.toFixed(2)
        }
      })
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('Clock out error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to clock out' },
      { status: 500 }
    )
  }
}