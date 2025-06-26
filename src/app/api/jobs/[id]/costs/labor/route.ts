import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const laborCostSchema = z.object({
  userId: z.string().uuid(),
  hoursWorked: z.number().positive(),
  workDate: z.string(),
  hourlyRate: z.number().positive().optional(),
  skillLevel: z.string().optional(),
  timeEntryId: z.string().uuid().optional(),
})

// POST add labor cost entry
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const data = laborCostSchema.parse(body)

    // Verify job exists
    const jobCheck = await query('SELECT id FROM "Job" WHERE id = $1', [params.id])
    if (jobCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Verify user exists
    const userCheck = await query('SELECT id, role FROM "User" WHERE id = $1', [data.userId])
    if (userCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const user = userCheck.rows[0]

    // Determine skill level
    let skillLevel = data.skillLevel
    if (!skillLevel) {
      // Map user role to skill level
      switch (user.role) {
        case 'APPRENTICE':
          skillLevel = 'APPRENTICE'
          break
        case 'FIELD_CREW':
          skillLevel = 'JOURNEYMAN'
          break
        case 'ADMIN':
          skillLevel = 'FOREMAN'
          break
        default:
          skillLevel = 'JOURNEYMAN'
      }
    }

    // Get labor rate (considering job-specific overrides)
    let hourlyRate = data.hourlyRate
    let laborRateId = null

    if (!hourlyRate) {
      // First check for job-specific rate override
      const effectiveRateResult = await query(`
        SELECT get_effective_labor_rate($1, $2) as effective_rate
      `, [params.id, data.userId])

      if (effectiveRateResult.rows.length > 0 && effectiveRateResult.rows[0].effective_rate) {
        hourlyRate = parseFloat(effectiveRateResult.rows[0].effective_rate)
      } else {
        // Fallback to skill level-based rates
        const rateResult = await query(`
          SELECT id, "hourlyRate" 
          FROM "LaborRate" 
          WHERE "skillLevel" = $1 
            AND active = true 
            AND "effectiveDate" <= CURRENT_DATE 
            AND ("expiryDate" IS NULL OR "expiryDate" > CURRENT_DATE)
          ORDER BY "effectiveDate" DESC 
          LIMIT 1
        `, [skillLevel])

        if (rateResult.rows.length > 0) {
          laborRateId = rateResult.rows[0].id
          hourlyRate = parseFloat(rateResult.rows[0].hourlyRate)
        } else {
          // Default rates by skill level
          const defaultRates = {
            'APPRENTICE': 45.00,
            'HELPER': 35.00,
            'TECH_L1': 55.00,
            'TECH_L2': 65.00,
            'JOURNEYMAN': 75.00,
            'FOREMAN': 85.00,
            'LOW_VOLTAGE': 60.00,
            'CABLING': 55.00,
            'INSTALL': 70.00
          }
          hourlyRate = defaultRates[skillLevel] || 65.00
        }
      }
    }

    const totalCost = data.hoursWorked * hourlyRate

    // Insert labor cost record
    const result = await query(`
      INSERT INTO "JobLaborCost" (
        "jobId", "userId", "laborRateId", "skillLevel",
        "hourlyRate", "hoursWorked", "totalCost",
        "workDate", "timeEntryId"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      params.id,
      data.userId,
      laborRateId,
      skillLevel,
      hourlyRate,
      data.hoursWorked,
      totalCost,
      data.workDate,
      data.timeEntryId || null
    ])

    const laborCost = result.rows[0]

    // Get user name for response
    const userName = await query('SELECT name FROM "User" WHERE id = $1', [data.userId])

    return NextResponse.json({
      id: laborCost.id,
      jobId: laborCost.jobId,
      userId: laborCost.userId,
      userName: userName.rows[0]?.name,
      skillLevel: laborCost.skillLevel,
      hourlyRate: parseFloat(laborCost.hourlyRate),
      hoursWorked: parseFloat(laborCost.hoursWorked),
      totalCost: parseFloat(laborCost.totalCost),
      workDate: laborCost.workDate,
      timeEntryId: laborCost.timeEntryId,
      createdAt: laborCost.createdAt
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error adding labor cost:', error)
    return NextResponse.json(
      { error: 'Failed to add labor cost' },
      { status: 500 }
    )
  }
}

// GET labor costs for job
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await query(`
      SELECT 
        jlc.*,
        u.name as "userName",
        lr.name as "rateName"
      FROM "JobLaborCost" jlc
      LEFT JOIN "User" u ON jlc."userId" = u.id
      LEFT JOIN "LaborRate" lr ON jlc."laborRateId" = lr.id
      WHERE jlc."jobId" = $1
      ORDER BY jlc."workDate" DESC, jlc."createdAt" DESC
    `, [params.id])

    const laborCosts = result.rows.map(row => ({
      id: row.id,
      userId: row.userId,
      userName: row.userName,
      skillLevel: row.skillLevel,
      rateName: row.rateName,
      hourlyRate: parseFloat(row.hourlyRate),
      hoursWorked: parseFloat(row.hoursWorked),
      totalCost: parseFloat(row.totalCost),
      workDate: row.workDate,
      timeEntryId: row.timeEntryId,
      createdAt: row.createdAt
    }))

    return NextResponse.json(laborCosts)

  } catch (error) {
    console.error('Error fetching labor costs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch labor costs' },
      { status: 500 }
    )
  }
}