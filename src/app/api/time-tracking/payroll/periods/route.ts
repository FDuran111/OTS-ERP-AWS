import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { z } from 'zod'

const payrollPeriodSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  periodType: z.enum(['WEEKLY', 'BI_WEEKLY', 'SEMI_MONTHLY', 'MONTHLY']),
  description: z.string().optional(),
  isActive: z.boolean().default(true)
})

// GET - Get payroll periods
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year') || new Date().getFullYear().toString()
    const periodType = searchParams.get('periodType')
    const current = searchParams.get('current') === 'true'
    
    const client = await pool.connect()
    
    try {
      let query = `
        SELECT 
          pp.*,
          COUNT(te.id) as "timeEntryCount",
          COALESCE(SUM(te."totalHours"), 0) as "totalHours",
          COALESCE(SUM(te."totalPay"), 0) as "totalPay",
          COUNT(DISTINCT te."userId") as "employeeCount"
        FROM "PayrollPeriod" pp
        LEFT JOIN "TimeEntry" te ON DATE(te."clockInTime") >= pp."startDate" 
                                  AND DATE(te."clockInTime") <= pp."endDate"
                                  AND te.status IN ('COMPLETED', 'APPROVED', 'PAID')
        WHERE EXTRACT(YEAR FROM pp."startDate") = $1
      `
      
      const params: any[] = [parseInt(year)]
      let paramIndex = 2
      
      if (periodType) {
        query += ` AND pp."periodType" = $${paramIndex}`
        params.push(periodType)
        paramIndex++
      }
      
      if (current) {
        query += ` AND pp."startDate" <= CURRENT_DATE AND pp."endDate" >= CURRENT_DATE`
      }
      
      query += `
        GROUP BY pp.id
        ORDER BY pp."startDate" DESC
      `
      
      const result = await client.query(query, params)
      
      const periods = result.rows.map(row => ({
        id: row.id,
        startDate: row.startDate,
        endDate: row.endDate,
        periodType: row.periodType,
        description: row.description,
        isActive: row.isActive,
        status: row.status,
        timeEntryCount: parseInt(row.timeEntryCount),
        totalHours: parseFloat(row.totalHours),
        totalPay: parseFloat(row.totalPay),
        employeeCount: parseInt(row.employeeCount),
        isCurrentPeriod: new Date() >= new Date(row.startDate) && new Date() <= new Date(row.endDate),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      }))
      
      return NextResponse.json({
        success: true,
        data: periods
      })
      
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('Error fetching payroll periods:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payroll periods' },
      { status: 500 }
    )
  }
}

// POST - Create payroll period or generate periods for a year
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Check if this is a bulk generation request
    if (body.generateYear) {
      return await generatePayrollPeriodsForYear(body.generateYear, body.periodType || 'BI_WEEKLY')
    }
    
    // Single period creation
    const data = payrollPeriodSchema.parse(body)
    
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Check for overlapping periods
      const overlapCheck = await client.query(`
        SELECT id FROM "PayrollPeriod"
        WHERE (
          ($1::date BETWEEN "startDate" AND "endDate") OR
          ($2::date BETWEEN "startDate" AND "endDate") OR
          ("startDate" BETWEEN $1::date AND $2::date) OR
          ("endDate" BETWEEN $1::date AND $2::date)
        )
      `, [data.startDate, data.endDate])
      
      if (overlapCheck.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Payroll period overlaps with existing period' },
          { status: 400 }
        )
      }
      
      // Create the period
      const result = await client.query(`
        INSERT INTO "PayrollPeriod" (
          "startDate", "endDate", "periodType", "description", "isActive", "status"
        ) VALUES ($1, $2, $3, $4, $5, 'OPEN')
        RETURNING *
      `, [data.startDate, data.endDate, data.periodType, data.description, data.isActive])
      
      await client.query('COMMIT')
      
      const period = result.rows[0]
      
      return NextResponse.json({
        success: true,
        data: {
          id: period.id,
          startDate: period.startDate,
          endDate: period.endDate,
          periodType: period.periodType,
          description: period.description,
          isActive: period.isActive,
          status: period.status,
          createdAt: period.createdAt
        }
      }, { status: 201 })
      
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
    console.error('Error creating payroll period:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create payroll period' },
      { status: 500 }
    )
  }
}

// Helper function to generate payroll periods for a full year
async function generatePayrollPeriodsForYear(year: number, periodType: string) {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    // Delete existing periods for the year
    await client.query(`
      DELETE FROM "PayrollPeriod" 
      WHERE EXTRACT(YEAR FROM "startDate") = $1
    `, [year])
    
    const periods = []
    let currentDate = new Date(year, 0, 1) // January 1st
    
    while (currentDate.getFullYear() === year) {
      let endDate: Date
      let description: string
      
      switch (periodType) {
        case 'WEEKLY':
          // Weekly periods (Sunday to Saturday)
          const startOfWeek = new Date(currentDate)
          startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
          endDate = new Date(startOfWeek)
          endDate.setDate(startOfWeek.getDate() + 6)
          description = `Week of ${startOfWeek.toLocaleDateString()}`
          currentDate = new Date(endDate)
          currentDate.setDate(endDate.getDate() + 1)
          break
          
        case 'BI_WEEKLY':
          // Bi-weekly periods (every 2 weeks)
          endDate = new Date(currentDate)
          endDate.setDate(currentDate.getDate() + 13)
          description = `Bi-weekly ${currentDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
          currentDate = new Date(endDate)
          currentDate.setDate(endDate.getDate() + 1)
          break
          
        case 'SEMI_MONTHLY':
          // Semi-monthly (1st-15th, 16th-end of month)
          if (currentDate.getDate() === 1) {
            endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 15)
            description = `${currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} 1st-15th`
            currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 16)
          } else {
            endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0) // Last day of month
            description = `${currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} 16th-${endDate.getDate()}`
            currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
          }
          break
          
        case 'MONTHLY':
          // Monthly periods
          endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0) // Last day of month
          description = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
          break
          
        default:
          throw new Error('Invalid period type')
      }
      
      // Don't create periods that extend beyond the year
      if (endDate.getFullYear() > year) {
        endDate = new Date(year, 11, 31) // December 31st
      }
      
      periods.push({
        startDate: currentDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        periodType,
        description
      })
      
      // Break if we've reached the end of the year
      if (endDate.getFullYear() > year || 
          (endDate.getFullYear() === year && endDate.getMonth() === 11 && endDate.getDate() === 31)) {
        break
      }
    }
    
    // Insert all periods
    for (const period of periods) {
      await client.query(`
        INSERT INTO "PayrollPeriod" (
          "startDate", "endDate", "periodType", "description", "isActive", "status"
        ) VALUES ($1, $2, $3, $4, true, 'OPEN')
      `, [period.startDate, period.endDate, period.periodType, period.description])
    }
    
    await client.query('COMMIT')
    
    return NextResponse.json({
      success: true,
      message: `Generated ${periods.length} payroll periods for ${year}`,
      periodsCreated: periods.length,
      periodType
    })
    
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}