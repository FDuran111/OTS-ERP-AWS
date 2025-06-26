import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const materialCostSchema = z.object({
  materialId: z.string().uuid(),
  quantityUsed: z.number().positive(),
  usageDate: z.string(),
  unitCost: z.number().min(0).optional(),
  markup: z.number().min(0).max(100).optional(),
  reservationId: z.string().uuid().optional(),
})

// POST add material cost entry
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const data = materialCostSchema.parse(body)

    // Verify job exists
    const jobCheck = await query('SELECT id FROM "Job" WHERE id = $1', [params.id])
    if (jobCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Get material details
    const materialResult = await query(`
      SELECT id, code, name, unit, cost 
      FROM "Material" 
      WHERE id = $1
    `, [data.materialId])

    if (materialResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Material not found' },
        { status: 404 }
      )
    }

    const material = materialResult.rows[0]
    const unitCost = data.unitCost !== undefined ? data.unitCost : parseFloat(material.cost || 0)
    const markup = data.markup !== undefined ? data.markup : 25.0 // Default 25% markup
    
    const totalCost = data.quantityUsed * unitCost
    const markupAmount = totalCost * (markup / 100)
    const billedAmount = totalCost + markupAmount

    // Insert material cost record
    const result = await query(`
      INSERT INTO "JobMaterialCost" (
        "jobId", "materialId", "quantityUsed", "unitCost",
        "totalCost", "markup", "markupAmount", "billedAmount",
        "usageDate", "reservationId"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      params.id,
      data.materialId,
      data.quantityUsed,
      unitCost,
      totalCost,
      markup,
      markupAmount,
      billedAmount,
      data.usageDate,
      data.reservationId || null
    ])

    const materialCost = result.rows[0]

    return NextResponse.json({
      id: materialCost.id,
      jobId: materialCost.jobId,
      materialId: materialCost.materialId,
      materialCode: material.code,
      materialName: material.name,
      materialUnit: material.unit,
      quantityUsed: parseFloat(materialCost.quantityUsed),
      unitCost: parseFloat(materialCost.unitCost),
      totalCost: parseFloat(materialCost.totalCost),
      markup: parseFloat(materialCost.markup),
      markupAmount: parseFloat(materialCost.markupAmount),
      billedAmount: parseFloat(materialCost.billedAmount),
      usageDate: materialCost.usageDate,
      reservationId: materialCost.reservationId,
      createdAt: materialCost.createdAt
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error adding material cost:', error)
    return NextResponse.json(
      { error: 'Failed to add material cost' },
      { status: 500 }
    )
  }
}

// GET material costs for job
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await query(`
      SELECT 
        jmc.*,
        m.code as "materialCode",
        m.name as "materialName",
        m.unit as "materialUnit",
        m.category as "materialCategory"
      FROM "JobMaterialCost" jmc
      LEFT JOIN "Material" m ON jmc."materialId" = m.id
      WHERE jmc."jobId" = $1
      ORDER BY jmc."usageDate" DESC, jmc."createdAt" DESC
    `, [params.id])

    const materialCosts = result.rows.map(row => ({
      id: row.id,
      materialId: row.materialId,
      materialCode: row.materialCode,
      materialName: row.materialName,
      materialUnit: row.materialUnit,
      materialCategory: row.materialCategory,
      quantityUsed: parseFloat(row.quantityUsed),
      unitCost: parseFloat(row.unitCost),
      totalCost: parseFloat(row.totalCost),
      markup: parseFloat(row.markup || 0),
      markupAmount: parseFloat(row.markupAmount || 0),
      billedAmount: parseFloat(row.billedAmount || 0),
      usageDate: row.usageDate,
      reservationId: row.reservationId,
      createdAt: row.createdAt
    }))

    return NextResponse.json(materialCosts)

  } catch (error) {
    console.error('Error fetching material costs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch material costs' },
      { status: 500 }
    )
  }
}

// DELETE material cost entry
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
      SELECT id FROM "JobMaterialCost" 
      WHERE id = $1 AND "jobId" = $2
    `, [costId, params.id])

    if (verifyResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Material cost entry not found' },
        { status: 404 }
      )
    }

    // Delete the cost entry
    await query('DELETE FROM "JobMaterialCost" WHERE id = $1', [costId])

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting material cost:', error)
    return NextResponse.json(
      { error: 'Failed to delete material cost' },
      { status: 500 }
    )
  }
}