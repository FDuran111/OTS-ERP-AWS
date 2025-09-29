import { NextRequest, NextResponse } from 'next/server'
import { query, withTransaction } from '@/lib/db'
import { z } from 'zod'
import { withRBAC } from '@/lib/rbac-middleware'
import { verifyToken } from '@/lib/auth'

const completeTransferSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    quantityTransferred: z.number().positive('Quantity must be positive'),
  })).min(1, 'At least one item is required'),
})

// POST complete transfer (moves inventory)
export const POST = withRBAC({
  requiredRoles: ['OWNER_ADMIN', 'FOREMAN']
})(async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const { id } = params
    const body = await request.json()
    const validatedData = completeTransferSchema.parse(body)

    // Get user ID from token
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userPayload = verifyToken(token)
    const userId = userPayload.id

    // Execute entire completion in a single transaction
    const result = await withTransaction(async (client) => {
      // Lock transfer row and get details
      const transferResult = await client.query(
        `SELECT * FROM "StockTransfer" WHERE id = $1 FOR UPDATE`,
        [id]
      )

      if (transferResult.rows.length === 0) {
        throw new Error('Transfer not found')
      }

      const transfer = transferResult.rows[0]

      // Verify transfer is not already completed or cancelled
      if (transfer.status === 'COMPLETED') {
        throw new Error('Transfer already completed')
      }

      if (transfer.status === 'CANCELLED') {
        throw new Error('Cannot complete cancelled transfer')
      }

      // Process each item
      for (const item of validatedData.items) {
        // Get transfer item details with lock
        const itemResult = await client.query(
          `SELECT * FROM "StockTransferItem" WHERE id = $1 AND "transferId" = $2 FOR UPDATE`,
          [item.id, id]
        )

        if (itemResult.rows.length === 0) {
          throw new Error(`Transfer item ${item.id} not found`)
        }

        const transferItem = itemResult.rows[0]

        // Verify quantity doesn't exceed requested
        if (item.quantityTransferred > parseFloat(transferItem.quantityRequested)) {
          throw new Error(`Quantity transferred (${item.quantityTransferred}) exceeds requested (${transferItem.quantityRequested})`)
        }

        // Lock source location stock and verify availability
        const sourceStockResult = await client.query(
          `SELECT * FROM "MaterialLocationStock" 
           WHERE "materialId" = $1 AND "storageLocationId" = $2
           FOR UPDATE`,
          [transferItem.materialId, transfer.sourceLocationId]
        )

        const sourceStock = sourceStockResult.rows[0]
        const currentQuantity = parseFloat(sourceStock?.quantity || '0')

        if (currentQuantity < item.quantityTransferred) {
          throw new Error(`Insufficient stock at source location for material ${transferItem.materialId}`)
        }

        // Atomically deduct from source location with safety check
        const deductResult = await client.query(
          `UPDATE "MaterialLocationStock"
           SET quantity = quantity - $1, "updatedAt" = NOW()
           WHERE "materialId" = $2 AND "storageLocationId" = $3 AND quantity >= $1
           RETURNING *`,
          [item.quantityTransferred, transferItem.materialId, transfer.sourceLocationId]
        )

        if (deductResult.rows.length === 0) {
          const concError = new Error('Failed to deduct stock - concurrent modification detected')
          ;(concError as any).statusCode = 409
          throw concError
        }

        // Upsert to destination location (atomic)
        await client.query(
          `INSERT INTO "MaterialLocationStock" 
           ("materialId", "storageLocationId", quantity)
           VALUES ($1, $2, $3)
           ON CONFLICT ("materialId", "storageLocationId") 
           DO UPDATE SET 
             quantity = "MaterialLocationStock".quantity + EXCLUDED.quantity,
             "updatedAt" = NOW()`,
          [transferItem.materialId, transfer.destLocationId, item.quantityTransferred]
        )

        // Create stock movement OUT from source
        await client.query(
          `INSERT INTO "StockMovement" 
           ("materialId", "storageLocationId", "userId", type, quantity, "referenceNumber", notes, "transferId")
           VALUES ($1, $2, $3, 'TRANSFER', $4, $5, $6, $7)`,
          [
            transferItem.materialId,
            transfer.sourceLocationId,
            userId,
            -item.quantityTransferred,
            transfer.transferNumber,
            `Transfer OUT to ${transfer.destLocationId}`,
            id,
          ]
        )

        // Create stock movement IN to destination
        await client.query(
          `INSERT INTO "StockMovement" 
           ("materialId", "storageLocationId", "userId", type, quantity, "referenceNumber", notes, "transferId")
           VALUES ($1, $2, $3, 'TRANSFER', $4, $5, $6, $7)`,
          [
            transferItem.materialId,
            transfer.destLocationId,
            userId,
            item.quantityTransferred,
            transfer.transferNumber,
            `Transfer IN from ${transfer.sourceLocationId}`,
            id,
          ]
        )

        // Update transfer item quantity transferred
        await client.query(
          `UPDATE "StockTransferItem"
           SET "quantityTransferred" = $1, "updatedAt" = NOW()
           WHERE id = $2`,
          [item.quantityTransferred, item.id]
        )
      }

      // Update transfer status to COMPLETED
      const updatedTransfer = await client.query(
        `UPDATE "StockTransfer"
         SET status = 'COMPLETED', 
             "completedDate" = NOW(),
             "approvedBy" = $1,
             "approvedAt" = NOW(),
             "updatedAt" = NOW()
         WHERE id = $2
         RETURNING *`,
        [userId, id]
      )

      return updatedTransfer.rows[0]
    })

    return NextResponse.json({
      message: 'Transfer completed successfully',
      transfer: result,
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    
    // Handle specific error codes from transaction
    if (error.statusCode === 409) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      )
    }
    
    console.error('Error completing transfer:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to complete transfer' },
      { status: 500 }
    )
  }
})
