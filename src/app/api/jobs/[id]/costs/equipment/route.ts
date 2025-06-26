import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const equipmentCostSchema = z.object({
  equipmentName: z.string().min(1),
  equipmentType: z.enum(['BUCKET_TRUCK', 'CRANE', 'GENERATOR', 'COMPRESSOR', 'TRAILER', 'TOOLS', 'VEHICLE', 'OTHER']),
  hourlyRate: z.number().positive(),
  hoursUsed: z.number().positive(),
  usageDate: z.string(),
  operatorId: z.string().uuid().optional(),
  notes: z.string().optional(),
})

// POST add equipment cost entry
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const data = equipmentCostSchema.parse(body)

    // Verify job exists
    const jobCheck = await query('SELECT id FROM "Job" WHERE id = $1', [params.id])
    if (jobCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Verify operator exists if provided
    if (data.operatorId) {
      const operatorCheck = await query('SELECT id FROM "User" WHERE id = $1', [data.operatorId])
      if (operatorCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'Operator not found' },
          { status: 404 }
        )
      }
    }

    const totalCost = data.hourlyRate * data.hoursUsed

    // Insert equipment cost record
    const result = await query(`
      INSERT INTO "JobEquipmentCost" (
        "jobId", "equipmentName", "equipmentType", "hourlyRate",
        "hoursUsed", "totalCost", "usageDate", "operatorId", "notes"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      params.id,
      data.equipmentName,
      data.equipmentType,
      data.hourlyRate,
      data.hoursUsed,
      totalCost,
      data.usageDate,
      data.operatorId || null,
      data.notes || null
    ])

    const equipmentCost = result.rows[0]

    // Get operator name if provided
    let operatorName = null
    if (data.operatorId) {
      const operatorResult = await query('SELECT name FROM "User" WHERE id = $1', [data.operatorId])
      operatorName = operatorResult.rows[0]?.name
    }

    return NextResponse.json({
      id: equipmentCost.id,
      jobId: equipmentCost.jobId,
      equipmentName: equipmentCost.equipmentName,
      equipmentType: equipmentCost.equipmentType,
      hourlyRate: parseFloat(equipmentCost.hourlyRate),
      hoursUsed: parseFloat(equipmentCost.hoursUsed),
      totalCost: parseFloat(equipmentCost.totalCost),
      usageDate: equipmentCost.usageDate,
      operatorId: equipmentCost.operatorId,
      operatorName,
      notes: equipmentCost.notes,
      createdAt: equipmentCost.createdAt
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error adding equipment cost:', error)
    return NextResponse.json(
      { error: 'Failed to add equipment cost' },
      { status: 500 }
    )
  }
}

// GET equipment costs for job
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await query(`
      SELECT 
        jec.*,
        u.name as "operatorName"
      FROM "JobEquipmentCost" jec
      LEFT JOIN "User" u ON jec."operatorId" = u.id
      WHERE jec."jobId" = $1
      ORDER BY jec."usageDate" DESC, jec."createdAt" DESC
    `, [params.id])

    const equipmentCosts = result.rows.map(row => ({
      id: row.id,
      equipmentName: row.equipmentName,
      equipmentType: row.equipmentType,
      hourlyRate: parseFloat(row.hourlyRate),
      hoursUsed: parseFloat(row.hoursUsed),
      totalCost: parseFloat(row.totalCost),
      usageDate: row.usageDate,
      operatorId: row.operatorId,
      operatorName: row.operatorName,
      notes: row.notes,
      createdAt: row.createdAt
    }))

    return NextResponse.json(equipmentCosts)

  } catch (error) {
    console.error('Error fetching equipment costs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch equipment costs' },
      { status: 500 }
    )
  }
}

// DELETE equipment cost entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const costId = searchParams.get('costId')

    if (!costId) {
      return NextResponse.json(
        { error: 'Cost ID is required' },
        { status: 400 }
      )
    }

    // Verify the cost entry belongs to this job
    const verifyResult = await query(`
      SELECT id FROM "JobEquipmentCost" 
      WHERE id = $1 AND "jobId" = $2
    `, [costId, params.id])

    if (verifyResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Equipment cost entry not found' },
        { status: 404 }
      )
    }

    // Delete the cost entry
    await query('DELETE FROM "JobEquipmentCost" WHERE id = $1', [costId])

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting equipment cost:', error)
    return NextResponse.json(
      { error: 'Failed to delete equipment cost' },
      { status: 500 }
    )
  }
}