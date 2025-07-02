import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const materialUsageSchema = z.object({
  materialId: z.string(),
  phaseId: z.string().optional(),
  quantity: z.number().positive(),
  usageType: z.enum(['CONSUMED', 'WASTED', 'RETURNED', 'TRANSFERRED']).default('CONSUMED'),
  notes: z.string().optional(),
  usedBy: z.string().optional(),
})

// GET materials used on a job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const result = await query(
      `SELECT 
        mu.*,
        m.code as "materialCode",
        m.name as "materialName",
        m.unit as "materialUnit",
        m.category as "materialCategory",
        jp.name as "phaseName",
        u.name as "userName"
      FROM "MaterialUsage" mu
      INNER JOIN "Material" m ON mu."materialId" = m.id
      LEFT JOIN "JobPhase" jp ON mu."phaseId" = jp.id
      LEFT JOIN "User" u ON mu."usedBy" = u.id
      WHERE mu."jobId" = $1
      ORDER BY mu."usedAt" DESC`,
      [resolvedParams.id]
    )

    const materialUsage = result.rows.map(row => ({
      id: row.id,
      jobId: row.jobId,
      materialId: row.materialId,
      materialCode: row.materialCode,
      materialName: row.materialName,
      materialUnit: row.materialUnit,
      materialCategory: row.materialCategory,
      phaseId: row.phaseId,
      phaseName: row.phaseName,
      userId: row.usedBy,
      userName: row.userName,
      quantityUsed: parseFloat(row.quantity || 0),
      unitCost: parseFloat(row.unitCost || 0),
      totalCost: parseFloat(row.totalCost || 0),
      usageType: row.usageType || 'CONSUMED',
      notes: row.notes,
      usedAt: row.usedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt || row.createdAt,
    }))

    // Calculate totals by material
    const materialSummary = materialUsage.reduce((acc, usage) => {
      const key = usage.materialId
      if (!acc[key]) {
        acc[key] = {
          materialId: usage.materialId,
          materialCode: usage.materialCode,
          materialName: usage.materialName,
          materialUnit: usage.materialUnit,
          totalQuantity: 0,
          totalCost: 0,
          usageCount: 0
        }
      }
      acc[key].totalQuantity += usage.quantityUsed
      acc[key].totalCost += usage.totalCost
      acc[key].usageCount += 1
      return acc
    }, {} as Record<string, any>)

    return NextResponse.json({
      usage: materialUsage,
      summary: Object.values(materialSummary),
      totalCost: materialUsage.reduce((sum, usage) => sum + usage.totalCost, 0)
    })
  } catch (error) {
    console.error('Error fetching job material usage:', error)
    return NextResponse.json(
      { error: 'Failed to fetch material usage' },
      { status: 500 }
    )
  }
}

// POST - Record material usage on a job
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const body = await request.json()
    const data = materialUsageSchema.parse(body)

    // Verify job exists
    const jobCheck = await query(
      'SELECT id FROM "Job" WHERE id = $1',
      [resolvedParams.id]
    )
    if (jobCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Get material info
    const materialResult = await query(
      'SELECT id, code, name, unit, cost, "inStock" FROM "Material" WHERE id = $1',
      [data.materialId]
    )
    if (materialResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Material not found' },
        { status: 404 }
      )
    }

    const material = materialResult.rows[0]
    const unitCost = material.cost || 0
    const totalCost = data.quantity * unitCost

    // Check if enough stock is available
    if (data.usageType === 'CONSUMED' && material.inStock < data.quantity) {
      return NextResponse.json(
        { 
          error: 'Insufficient stock', 
          available: material.inStock,
          requested: data.quantity 
        },
        { status: 400 }
      )
    }

    // Start transaction
    await query('BEGIN')

    try {
      // Record material usage
      const usageResult = await query(
        `INSERT INTO "MaterialUsage" (
          "jobId", "materialId", "phaseId", "usedBy",
          "quantity", "unitCost", "totalCost", "usedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *`,
        [
          resolvedParams.id, data.materialId, data.phaseId, data.usedBy,
          data.quantity, unitCost, totalCost
        ]
      )

      // Update material stock
      let stockChange = -data.quantity // Default: consume stock
      if (data.usageType === 'RETURNED') {
        stockChange = data.quantity // Return increases stock
      }

      if (stockChange !== 0) {
        const newStock = Math.max(0, material.inStock + stockChange)
        await query(
          'UPDATE "Material" SET "inStock" = $1, "updatedAt" = NOW() WHERE id = $2',
          [newStock, data.materialId]
        )

        // Create stock movement record
        const movementType = data.usageType === 'RETURNED' ? 'RETURN' : 'JOB_USAGE'
        await query(
          `INSERT INTO "StockMovement" (
            "materialId", "jobId", "usedBy", type,
            "quantityBefore", "quantityChanged", "quantityAfter",
            "unitCost", "totalValue", reason
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            data.materialId, resolvedParams.id, data.usedBy, movementType,
            material.inStock, stockChange, newStock,
            unitCost, Math.abs(stockChange) * unitCost,
            `Material ${data.usageType.toLowerCase()} for job usage`
          ]
        )
      }

      await query('COMMIT')

      return NextResponse.json(usageResult.rows[0], { status: 201 })
    } catch (error) {
      await query('ROLLBACK')
      throw error
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error recording material usage:', error)
    return NextResponse.json(
      { error: 'Failed to record material usage' },
      { status: 500 }
    )
  }
}