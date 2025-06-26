import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const equipmentRateSchema = z.object({
  equipmentType: z.enum(['BUCKET_TRUCK', 'CRANE', 'GENERATOR', 'COMPRESSOR', 'TRENCHER', 'AUGER', 'OTHER']),
  equipmentClass: z.enum(['SIZE_35FT', 'SIZE_45FT', 'SIZE_60FT', 'STANDARD', 'HEAVY_DUTY', 'COMPACT']),
  rateName: z.string().min(1),
  description: z.string().optional(),
  hourlyRate: z.number().positive(),
  halfDayRate: z.number().optional(),
  fullDayRate: z.number().optional(),
  weeklyRate: z.number().optional(),
  minimumBillableHours: z.number().min(0).default(1.0),
  roundingIncrement: z.number().min(0.1).max(1.0).default(0.25),
  travelTimeRate: z.number().optional(),
  setupTimeRate: z.number().optional(),
  minimumTravelTime: z.number().min(0).default(0.5),
  overtimeMultiplier: z.number().min(1).default(1.5),
  weekendMultiplier: z.number().min(1).default(1.25),
  holidayMultiplier: z.number().min(1).default(2.0),
  emergencyMultiplier: z.number().min(1).default(2.5),
  requiresOperator: z.boolean().default(true),
  operatorIncluded: z.boolean().default(false),
  operatorRate: z.number().optional(),
  effectiveDate: z.string().optional(),
  expiryDate: z.string().optional(),
})

// GET all equipment rates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const equipmentType = searchParams.get('equipmentType')
    const active = searchParams.get('active') !== 'false'

    let whereClause = active ? 'WHERE active = true' : ''
    const params: any[] = []

    if (equipmentType) {
      whereClause = whereClause 
        ? `${whereClause} AND "equipmentType" = $1`
        : 'WHERE "equipmentType" = $1'
      params.push(equipmentType)
    }

    const result = await query(`
      SELECT * FROM "EquipmentRate"
      ${whereClause}
      ORDER BY "equipmentType", "equipmentClass", "rateName"
    `, params)

    const equipmentRates = result.rows.map(row => ({
      id: row.id,
      equipmentType: row.equipmentType,
      equipmentClass: row.equipmentClass,
      rateName: row.rateName,
      description: row.description,
      hourlyRate: parseFloat(row.hourlyRate),
      halfDayRate: row.halfDayRate ? parseFloat(row.halfDayRate) : null,
      fullDayRate: row.fullDayRate ? parseFloat(row.fullDayRate) : null,
      weeklyRate: row.weeklyRate ? parseFloat(row.weeklyRate) : null,
      minimumBillableHours: parseFloat(row.minimumBillableHours || 1),
      roundingIncrement: parseFloat(row.roundingIncrement || 0.25),
      travelTimeRate: row.travelTimeRate ? parseFloat(row.travelTimeRate) : null,
      setupTimeRate: row.setupTimeRate ? parseFloat(row.setupTimeRate) : null,
      minimumTravelTime: parseFloat(row.minimumTravelTime || 0.5),
      overtimeMultiplier: parseFloat(row.overtimeMultiplier || 1.5),
      weekendMultiplier: parseFloat(row.weekendMultiplier || 1.25),
      holidayMultiplier: parseFloat(row.holidayMultiplier || 2.0),
      emergencyMultiplier: parseFloat(row.emergencyMultiplier || 2.5),
      requiresOperator: row.requiresOperator,
      operatorIncluded: row.operatorIncluded,
      operatorRate: row.operatorRate ? parseFloat(row.operatorRate) : null,
      effectiveDate: row.effectiveDate,
      expiryDate: row.expiryDate,
      active: row.active,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }))

    return NextResponse.json(equipmentRates)

  } catch (error) {
    console.error('Error fetching equipment rates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch equipment rates' },
      { status: 500 }
    )
  }
}

// POST create new equipment rate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = equipmentRateSchema.parse(body)

    const result = await query(`
      INSERT INTO "EquipmentRate" (
        "equipmentType", "equipmentClass", "rateName", "description",
        "hourlyRate", "halfDayRate", "fullDayRate", "weeklyRate",
        "minimumBillableHours", "roundingIncrement", "travelTimeRate",
        "setupTimeRate", "minimumTravelTime", "overtimeMultiplier",
        "weekendMultiplier", "holidayMultiplier", "emergencyMultiplier",
        "requiresOperator", "operatorIncluded", "operatorRate",
        "effectiveDate", "expiryDate"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *
    `, [
      data.equipmentType,
      data.equipmentClass,
      data.rateName,
      data.description || null,
      data.hourlyRate,
      data.halfDayRate || null,
      data.fullDayRate || null,
      data.weeklyRate || null,
      data.minimumBillableHours,
      data.roundingIncrement,
      data.travelTimeRate || null,
      data.setupTimeRate || null,
      data.minimumTravelTime,
      data.overtimeMultiplier,
      data.weekendMultiplier,
      data.holidayMultiplier,
      data.emergencyMultiplier,
      data.requiresOperator,
      data.operatorIncluded,
      data.operatorRate || null,
      data.effectiveDate || new Date().toISOString().split('T')[0],
      data.expiryDate || null
    ])

    const equipmentRate = result.rows[0]

    return NextResponse.json({
      id: equipmentRate.id,
      equipmentType: equipmentRate.equipmentType,
      equipmentClass: equipmentRate.equipmentClass,
      rateName: equipmentRate.rateName,
      description: equipmentRate.description,
      hourlyRate: parseFloat(equipmentRate.hourlyRate),
      halfDayRate: equipmentRate.halfDayRate ? parseFloat(equipmentRate.halfDayRate) : null,
      fullDayRate: equipmentRate.fullDayRate ? parseFloat(equipmentRate.fullDayRate) : null,
      weeklyRate: equipmentRate.weeklyRate ? parseFloat(equipmentRate.weeklyRate) : null,
      minimumBillableHours: parseFloat(equipmentRate.minimumBillableHours),
      roundingIncrement: parseFloat(equipmentRate.roundingIncrement),
      travelTimeRate: equipmentRate.travelTimeRate ? parseFloat(equipmentRate.travelTimeRate) : null,
      setupTimeRate: equipmentRate.setupTimeRate ? parseFloat(equipmentRate.setupTimeRate) : null,
      minimumTravelTime: parseFloat(equipmentRate.minimumTravelTime),
      overtimeMultiplier: parseFloat(equipmentRate.overtimeMultiplier),
      weekendMultiplier: parseFloat(equipmentRate.weekendMultiplier),
      holidayMultiplier: parseFloat(equipmentRate.holidayMultiplier),
      emergencyMultiplier: parseFloat(equipmentRate.emergencyMultiplier),
      requiresOperator: equipmentRate.requiresOperator,
      operatorIncluded: equipmentRate.operatorIncluded,
      operatorRate: equipmentRate.operatorRate ? parseFloat(equipmentRate.operatorRate) : null,
      effectiveDate: equipmentRate.effectiveDate,
      expiryDate: equipmentRate.expiryDate,
      active: equipmentRate.active,
      createdAt: equipmentRate.createdAt
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating equipment rate:', error)
    return NextResponse.json(
      { error: 'Failed to create equipment rate' },
      { status: 500 }
    )
  }
}