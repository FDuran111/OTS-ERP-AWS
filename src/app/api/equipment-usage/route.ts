import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const equipmentUsageSchema = z.object({
  jobId: z.string().min(1),
  equipmentRateId: z.string().uuid(),
  equipmentName: z.string().min(1),
  operatorId: z.string().min(1),
  usageDate: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  workingHours: z.number().min(0).optional(),
  travelHours: z.number().min(0).optional(),
  setupHours: z.number().min(0).optional(),
  notes: z.string().optional(),
  mileage: z.number().min(0).optional(),
  fuelUsed: z.number().min(0).optional(),
})

const completeUsageSchema = z.object({
  endTime: z.string().optional(),
  workingHours: z.number().min(0).optional(),
  travelHours: z.number().min(0).optional(),
  setupHours: z.number().min(0).optional(),
  notes: z.string().optional(),
  mileage: z.number().min(0).optional(),
  fuelUsed: z.number().min(0).optional(),
})

// GET equipment usage records
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    const operatorId = searchParams.get('operatorId')
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    let whereClause = 'WHERE 1=1'
    const params: any[] = []
    let paramIndex = 1

    if (jobId) {
      whereClause += ` AND eu."jobId" = $${paramIndex}`
      params.push(jobId)
      paramIndex++
    }

    if (operatorId) {
      whereClause += ` AND eu."operatorId" = $${paramIndex}`
      params.push(operatorId)
      paramIndex++
    }

    if (status) {
      whereClause += ` AND eu."status" = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    if (dateFrom) {
      whereClause += ` AND eu."usageDate" >= $${paramIndex}`
      params.push(dateFrom)
      paramIndex++
    }

    if (dateTo) {
      whereClause += ` AND eu."usageDate" <= $${paramIndex}`
      params.push(dateTo)
      paramIndex++
    }

    const result = await query(`
      SELECT 
        eu.*,
        er."rateName",
        er."equipmentClass",
        j."jobNumber",
        j."description" as "jobDescription",
        u.name as "operatorName"
      FROM "EquipmentUsage" eu
      LEFT JOIN "EquipmentRate" er ON eu."equipmentRateId" = er.id
      LEFT JOIN "Job" j ON eu."jobId" = j.id
      LEFT JOIN "User" u ON eu."operatorId" = u.id
      ${whereClause}
      ORDER BY eu."usageDate" DESC, eu."createdAt" DESC
    `, params)

    const equipmentUsage = result.rows.map(row => ({
      id: row.id,
      jobId: row.jobId,
      jobNumber: row.jobNumber,
      jobDescription: row.jobDescription,
      equipmentRateId: row.equipmentRateId,
      rateName: row.rateName,
      equipmentClass: row.equipmentClass,
      equipmentName: row.equipmentName,
      equipmentType: row.equipmentType,
      operatorId: row.operatorId,
      operatorName: row.operatorName,
      usageDate: row.usageDate,
      startTime: row.startTime,
      endTime: row.endTime,
      totalHours: row.totalHours ? parseFloat(row.totalHours) : null,
      billableHours: row.billableHours ? parseFloat(row.billableHours) : null,
      workingHours: parseFloat(row.workingHours || 0),
      travelHours: parseFloat(row.travelHours || 0),
      setupHours: parseFloat(row.setupHours || 0),
      idleHours: parseFloat(row.idleHours || 0),
      hourlyRate: parseFloat(row.hourlyRate),
      travelRate: row.travelRate ? parseFloat(row.travelRate) : null,
      setupRate: row.setupRate ? parseFloat(row.setupRate) : null,
      appliedMultiplier: parseFloat(row.appliedMultiplier || 1),
      baseCost: parseFloat(row.baseCost || 0),
      travelCost: parseFloat(row.travelCost || 0),
      setupCost: parseFloat(row.setupCost || 0),
      operatorCost: parseFloat(row.operatorCost || 0),
      totalCost: parseFloat(row.totalCost),
      status: row.status,
      notes: row.notes,
      mileage: row.mileage ? parseFloat(row.mileage) : null,
      fuelUsed: row.fuelUsed ? parseFloat(row.fuelUsed) : null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }))

    return NextResponse.json(equipmentUsage)

  } catch (error) {
    console.error('Error fetching equipment usage:', error)
    return NextResponse.json(
      { error: 'Failed to fetch equipment usage' },
      { status: 500 }
    )
  }
}

// POST start new equipment usage
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = equipmentUsageSchema.parse(body)

    // Verify job exists
    const jobCheck = await query('SELECT id FROM "Job" WHERE id = $1', [data.jobId])
    if (jobCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Verify equipment rate exists
    const rateCheck = await query('SELECT * FROM "EquipmentRate" WHERE id = $1 AND active = true', [data.equipmentRateId])
    if (rateCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Equipment rate not found or inactive' },
        { status: 404 }
      )
    }

    // Verify operator exists
    const operatorCheck = await query('SELECT id, name FROM "User" WHERE id = $1 AND active = true', [data.operatorId])
    if (operatorCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Operator not found' },
        { status: 404 }
      )
    }

    const rate = rateCheck.rows[0]

    // If this is a complete usage entry (has end time), create completed record
    if (data.endTime && data.workingHours !== undefined) {
      const totalHours = (data.workingHours || 0) + (data.travelHours || 0) + (data.setupHours || 0)
      
      // Calculate billable hours
      const billableHours = await query('SELECT calculate_billable_hours($1, $2, $3) as billable', [
        data.workingHours || totalHours,
        parseFloat(rate.minimumBillableHours || 1),
        parseFloat(rate.roundingIncrement || 0.25)
      ])

      const result = await query(`
        INSERT INTO "EquipmentUsage" (
          "jobId", "equipmentRateId", "equipmentName", "equipmentType",
          "operatorId", "usageDate", "startTime", "endTime", "totalHours",
          "billableHours", "workingHours", "travelHours", "setupHours",
          "idleHours", "hourlyRate", "travelRate", "setupRate",
          "status", "notes", "mileage", "fuelUsed"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING *
      `, [
        data.jobId,
        data.equipmentRateId,
        data.equipmentName,
        rate.equipmentType,
        data.operatorId,
        data.usageDate || new Date().toISOString().split('T')[0],
        data.startTime || '08:00:00',
        data.endTime,
        totalHours,
        parseFloat(billableHours.rows[0].billable),
        data.workingHours || 0,
        data.travelHours || 0,
        data.setupHours || 0,
        totalHours - (data.workingHours || 0) - (data.travelHours || 0) - (data.setupHours || 0),
        parseFloat(rate.hourlyRate),
        rate.travelTimeRate ? parseFloat(rate.travelTimeRate) : null,
        rate.setupTimeRate ? parseFloat(rate.setupTimeRate) : null,
        'COMPLETED',
        data.notes || null,
        data.mileage || null,
        data.fuelUsed || null
      ])

      const usage = result.rows[0]

      // Update costs
      await query('SELECT update_equipment_usage_cost($1)', [usage.id])

      // Get updated record with costs
      const updatedResult = await query('SELECT * FROM "EquipmentUsage" WHERE id = $1', [usage.id])
      const updatedUsage = updatedResult.rows[0]

      return NextResponse.json({
        id: updatedUsage.id,
        jobId: updatedUsage.jobId,
        equipmentRateId: updatedUsage.equipmentRateId,
        equipmentName: updatedUsage.equipmentName,
        equipmentType: updatedUsage.equipmentType,
        operatorId: updatedUsage.operatorId,
        operatorName: operatorCheck.rows[0].name,
        usageDate: updatedUsage.usageDate,
        startTime: updatedUsage.startTime,
        endTime: updatedUsage.endTime,
        totalHours: parseFloat(updatedUsage.totalHours || 0),
        billableHours: parseFloat(updatedUsage.billableHours || 0),
        workingHours: parseFloat(updatedUsage.workingHours || 0),
        travelHours: parseFloat(updatedUsage.travelHours || 0),
        setupHours: parseFloat(updatedUsage.setupHours || 0),
        totalCost: parseFloat(updatedUsage.totalCost || 0),
        status: updatedUsage.status,
        createdAt: updatedUsage.createdAt
      }, { status: 201 })

    } else {
      // Start usage tracking
      const usageId = await query(`
        SELECT start_equipment_usage($1, $2, $3, $4, $5, $6) as usage_id
      `, [
        data.jobId,
        data.equipmentRateId,
        data.equipmentName,
        data.operatorId,
        data.usageDate || new Date().toISOString().split('T')[0],
        data.startTime || new Date().toTimeString().split(' ')[0]
      ])

      const result = await query('SELECT * FROM "EquipmentUsage" WHERE id = $1', [usageId.rows[0].usage_id])
      const usage = result.rows[0]

      return NextResponse.json({
        id: usage.id,
        jobId: usage.jobId,
        equipmentRateId: usage.equipmentRateId,
        equipmentName: usage.equipmentName,
        equipmentType: usage.equipmentType,
        operatorId: usage.operatorId,
        operatorName: operatorCheck.rows[0].name,
        usageDate: usage.usageDate,
        startTime: usage.startTime,
        status: usage.status,
        createdAt: usage.createdAt
      }, { status: 201 })
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating equipment usage:', error)
    return NextResponse.json(
      { error: 'Failed to create equipment usage' },
      { status: 500 }
    )
  }
}

// PUT update/complete equipment usage
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { usageId, ...updateData } = body
    const data = completeUsageSchema.parse(updateData)

    if (!usageId) {
      return NextResponse.json(
        { error: 'Usage ID is required' },
        { status: 400 }
      )
    }

    // Verify usage exists
    const usageCheck = await query('SELECT * FROM "EquipmentUsage" WHERE id = $1', [usageId])
    if (usageCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Equipment usage not found' },
        { status: 404 }
      )
    }

    // Complete the usage
    await query(`
      SELECT complete_equipment_usage($1, $2, $3, $4, $5, $6)
    `, [
      usageId,
      data.endTime || new Date().toTimeString().split(' ')[0],
      data.workingHours,
      data.travelHours || 0,
      data.setupHours || 0,
      data.notes
    ])

    // Update additional fields if provided
    if (data.mileage !== undefined || data.fuelUsed !== undefined) {
      await query(`
        UPDATE "EquipmentUsage" SET
          "mileage" = COALESCE($1, "mileage"),
          "fuelUsed" = COALESCE($2, "fuelUsed"),
          "updatedAt" = NOW()
        WHERE id = $3
      `, [data.mileage, data.fuelUsed, usageId])
    }

    // Get updated record
    const result = await query(`
      SELECT 
        eu.*,
        u.name as "operatorName"
      FROM "EquipmentUsage" eu
      LEFT JOIN "User" u ON eu."operatorId" = u.id
      WHERE eu.id = $1
    `, [usageId])

    const usage = result.rows[0]

    return NextResponse.json({
      id: usage.id,
      jobId: usage.jobId,
      equipmentRateId: usage.equipmentRateId,
      equipmentName: usage.equipmentName,
      equipmentType: usage.equipmentType,
      operatorId: usage.operatorId,
      operatorName: usage.operatorName,
      usageDate: usage.usageDate,
      startTime: usage.startTime,
      endTime: usage.endTime,
      totalHours: parseFloat(usage.totalHours || 0),
      billableHours: parseFloat(usage.billableHours || 0),
      workingHours: parseFloat(usage.workingHours || 0),
      travelHours: parseFloat(usage.travelHours || 0),
      setupHours: parseFloat(usage.setupHours || 0),
      idleHours: parseFloat(usage.idleHours || 0),
      hourlyRate: parseFloat(usage.hourlyRate),
      appliedMultiplier: parseFloat(usage.appliedMultiplier || 1),
      baseCost: parseFloat(usage.baseCost || 0),
      travelCost: parseFloat(usage.travelCost || 0),
      setupCost: parseFloat(usage.setupCost || 0),
      operatorCost: parseFloat(usage.operatorCost || 0),
      totalCost: parseFloat(usage.totalCost || 0),
      status: usage.status,
      notes: usage.notes,
      mileage: usage.mileage ? parseFloat(usage.mileage) : null,
      fuelUsed: usage.fuelUsed ? parseFloat(usage.fuelUsed) : null,
      updatedAt: usage.updatedAt
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating equipment usage:', error)
    return NextResponse.json(
      { error: 'Failed to update equipment usage' },
      { status: 500 }
    )
  }
}