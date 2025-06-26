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
        SELECT id, "clockInTime" FROM "TimeEntry" 
        WHERE "userId" = $1 AND status = 'ACTIVE'
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
      
      // Get employee schedule for rate information
      const scheduleResult = await client.query(`
        SELECT * FROM "EmployeeSchedule" 
        WHERE "userId" = $1 AND "isActive" = true 
        AND "effectiveDate" <= CURRENT_DATE
        ORDER BY "effectiveDate" DESC 
        LIMIT 1
      `, [userId])
      
      const schedule = scheduleResult.rows[0]
      
      // Get effective labor rate (considering job-specific overrides)
      let effectiveRate = schedule?.regularRate || 25.00 // Default rate
      
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
          "userId", "clockInTime", "jobId", 
          "clockInLatitude", "clockInLongitude", "workSiteAddress",
          "appliedRegularRate"
        ) VALUES ($1, NOW(), $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        userId, 
        jobId || null, 
        latitude || null, 
        longitude || null, 
        workSiteAddress || null,
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