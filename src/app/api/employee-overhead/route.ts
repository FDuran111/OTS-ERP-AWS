import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const employeeOverheadSchema = z.object({
  userId: z.string().min(1),
  overheadType: z.enum(['BENEFITS', 'PAYROLL_TAXES', 'WORKERS_COMP', 'TRAINING', 'UNIFORM', 'TOOLS', 'OTHER']),
  overheadCategory: z.enum(['HEALTHCARE', 'TAXES', 'INSURANCE', 'EDUCATION', 'EQUIPMENT', 'SERVICES', 'OTHER']),
  annualCost: z.number().min(0),
  description: z.string().optional(),
  effectiveDate: z.string().optional(),
  expiryDate: z.string().optional(),
})

// GET all employee overhead costs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    let whereClause = 'WHERE eo.active = true'
    const params: any[] = []

    if (userId) {
      whereClause += ' AND eo."userId" = $1'
      params.push(userId)
    }

    const result = await query(`
      SELECT 
        eo.*,
        u.name as "userName"
      FROM "EmployeeOverhead" eo
      LEFT JOIN "User" u ON eo."userId" = u.id
      ${whereClause}
      ORDER BY u.name, eo."overheadType", eo."effectiveDate" DESC
    `, params)

    const overheadCosts = result.rows.map(row => ({
      id: row.id,
      userId: row.userId,
      userName: row.userName,
      overheadType: row.overheadType,
      overheadCategory: row.overheadCategory,
      annualCost: parseFloat(row.annualCost),
      monthlyCost: parseFloat(row.monthlyCost),
      dailyCost: parseFloat(row.dailyCost),
      hourlyCost: parseFloat(row.hourlyCost),
      description: row.description,
      effectiveDate: row.effectiveDate,
      expiryDate: row.expiryDate,
      active: row.active,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }))

    return NextResponse.json(overheadCosts)

  } catch (error) {
    console.error('Error fetching employee overhead costs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employee overhead costs' },
      { status: 500 }
    )
  }
}

// POST create new employee overhead cost
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = employeeOverheadSchema.parse(body)

    // Verify user exists
    const userCheck = await query('SELECT id FROM "User" WHERE id = $1 AND active = true', [data.userId])
    if (userCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Calculate periodic costs
    const annualCost = data.annualCost
    const monthlyCost = annualCost / 12
    const dailyCost = annualCost / 365
    const hourlyCost = annualCost / 2080 // 40 hours/week * 52 weeks

    const result = await query(`
      INSERT INTO "EmployeeOverhead" (
        "userId", "overheadType", "overheadCategory", "annualCost",
        "monthlyCost", "dailyCost", "hourlyCost", "description",
        "effectiveDate", "expiryDate"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      data.userId,
      data.overheadType,
      data.overheadCategory,
      annualCost,
      monthlyCost,
      dailyCost,
      hourlyCost,
      data.description || null,
      data.effectiveDate || new Date().toISOString().split('T')[0],
      data.expiryDate || null
    ])

    const overheadCost = result.rows[0]

    return NextResponse.json({
      id: overheadCost.id,
      userId: overheadCost.userId,
      overheadType: overheadCost.overheadType,
      overheadCategory: overheadCost.overheadCategory,
      annualCost: parseFloat(overheadCost.annualCost),
      monthlyCost: parseFloat(overheadCost.monthlyCost),
      dailyCost: parseFloat(overheadCost.dailyCost),
      hourlyCost: parseFloat(overheadCost.hourlyCost),
      description: overheadCost.description,
      effectiveDate: overheadCost.effectiveDate,
      expiryDate: overheadCost.expiryDate,
      active: overheadCost.active,
      createdAt: overheadCost.createdAt
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating employee overhead cost:', error)
    return NextResponse.json(
      { error: 'Failed to create employee overhead cost' },
      { status: 500 }
    )
  }
}