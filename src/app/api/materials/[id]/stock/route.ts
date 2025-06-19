import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const stockUpdateSchema = z.object({
  quantity: z.number(),
  type: z.enum(['ADD', 'REMOVE', 'SET']),
  reason: z.string().optional(),
  userId: z.string().optional(),
  storageLocationId: z.string().optional(),
  jobId: z.string().optional(),
  referenceNumber: z.string().optional(),
})

// PATCH update material stock
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const body = await request.json()
    const data = stockUpdateSchema.parse(body)

    // Get current material
    const materialResult = await query(
      'SELECT * FROM "Material" WHERE id = $1',
      [resolvedParams.id]
    )
    const material = materialResult.rows[0]

    if (!material) {
      return NextResponse.json(
        { error: 'Material not found' },
        { status: 404 }
      )
    }

    let newStock: number

    switch (data.type) {
      case 'ADD':
        newStock = material.inStock + data.quantity
        break
      case 'REMOVE':
        newStock = Math.max(0, material.inStock - data.quantity)
        break
      case 'SET':
        newStock = data.quantity
        break
      default:
        throw new Error('Invalid stock update type')
    }

    // Determine movement type
    let movementType: string
    switch (data.type) {
      case 'ADD':
        movementType = 'ADJUSTMENT_IN'
        break
      case 'REMOVE':
        movementType = 'ADJUSTMENT_OUT'
        break
      case 'SET':
        movementType = newStock > material.inStock ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT'
        break
      default:
        movementType = 'AUDIT_CORRECTION'
    }

    const quantityChanged = newStock - material.inStock
    const totalValue = Math.abs(quantityChanged) * (material.cost || 0)

    // Start transaction
    await query('BEGIN')

    try {
      // Update the material stock
      const updateResult = await query(
        'UPDATE "Material" SET "inStock" = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING *',
        [newStock, resolvedParams.id]
      )
      const updatedMaterial = updateResult.rows[0]

      // Create stock movement record
      await query(
        `INSERT INTO "StockMovement" (
          "materialId", "storageLocationId", "jobId", "userId",
          type, "quantityBefore", "quantityChanged", "quantityAfter",
          "unitCost", "totalValue", reason, "referenceNumber"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          resolvedParams.id,
          data.storageLocationId,
          data.jobId,
          data.userId,
          movementType,
          material.inStock,
          quantityChanged,
          newStock,
          material.cost || 0,
          totalValue,
          data.reason || `Manual ${data.type.toLowerCase()} adjustment`,
          data.referenceNumber
        ]
      )

      await query('COMMIT')

      // Get vendor information if exists
      if (updatedMaterial.vendorId) {
        const vendorResult = await query(
          'SELECT id, name, code FROM "Vendor" WHERE id = $1',
          [updatedMaterial.vendorId]
        )
        updatedMaterial.vendor = vendorResult.rows[0] || null
      }

      return NextResponse.json({
        material: updatedMaterial,
        oldStock: material.inStock,
        newStock: newStock,
        change: newStock - material.inStock,
      })
    } catch (transactionError) {
      await query('ROLLBACK')
      throw transactionError
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error updating material stock:', error)
    return NextResponse.json(
      { error: 'Failed to update material stock' },
      { status: 500 }
    )
  }
}