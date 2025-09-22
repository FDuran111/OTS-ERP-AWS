import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, jobId, latitude, longitude, workSiteAddress } = body
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }
    
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Check if user already has an active time entry
      const activeCheck = await client.query(`
        SELECT id, "startTime" FROM "TimeEntry"
        WHERE "userId" = $1 AND "endTime" IS NULL
      `, [userId])
      
      if (activeCheck.rows.length > 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'User already has an active time entry',
            activeEntry: activeCheck.rows[0]
          },
          { status: 400 }
        )
      }
      
      // Get user's default rate information
      const userResult = await client.query(`
        SELECT u.*, lr."regularRate", lr."overtimeRate"
        FROM "User" u
        LEFT JOIN "LaborRate" lr ON lr."userId" = u.id AND lr."isDefault" = true
        WHERE u.id = $1
      `, [userId])

      const userData = userResult.rows[0]
      
      // Get effective labor rate (considering job-specific overrides)
      let effectiveRate = userData?.regularRate || 25.00 // Default rate
      
      if (jobId) {
        // Check for job-specific rate override
        const rateResult = await client.query(`
          SELECT get_effective_labor_rate($1, $2) as effective_rate
        `, [jobId, userId])
        
        if (rateResult.rows.length > 0 && rateResult.rows[0].effective_rate) {
          effectiveRate = parseFloat(rateResult.rows[0].effective_rate)
        }
      }
      
      // Create time entry
      const result = await client.query(`
        INSERT INTO "TimeEntry" (
          id, "userId", "startTime", "date", "jobId",
          "gpsLatitude", "gpsLongitude", "description",
          "regularRate", "hours", "synced"
        ) VALUES (
          gen_random_uuid()::text, $1, NOW(), NOW()::date, $2,
          $3, $4, $5,
          $6, 0, false
        )
        RETURNING *
      `, [
        userId,
        jobId || null,
        latitude || null,
        longitude || null,
        workSiteAddress || 'Clock in at ' + new Date().toLocaleTimeString(),
        effectiveRate
      ])
      
      await client.query('COMMIT')
      
      return NextResponse.json({
        success: true,
        data: result.rows[0],
        message: 'Clocked in successfully'
      })
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('Clock in error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to clock in' },
      { status: 500 }
    )
  }
}