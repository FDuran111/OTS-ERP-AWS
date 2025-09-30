import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

interface ReceiveItemRequest {
  poItemId: string
  quantityReceived: number
  unitCost?: number
  notes?: string
}

interface ReceivePORequest {
  items: ReceiveItemRequest[]
  storageLocationId?: string
  notes?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: purchaseOrderId } = params
    const body: ReceivePORequest = await request.json()
    const { items, storageLocationId, notes } = body

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Items to receive are required' },
        { status: 400 }
      )
    }

    // Get user from session/auth (placeholder - adjust based on your auth)
    const userId = request.headers.get('x-user-id') || 'system'

    // Generate receipt number using the database function
    const receiptNumberResult = await query('SELECT generate_receipt_number() as receipt_number')
    const receiptNumber = receiptNumberResult.rows[0]?.receipt_number

    const receiptId = uuidv4()

    // Start transaction
    await query('BEGIN')

    try {
      // Create Purchase Order Receipt
      await query(`
        INSERT INTO "PurchaseOrderReceipt" (
          id, "receiptNumber", "purchaseOrderId", "storageLocationId",
          "receivedAt", "receivedBy", notes, status, "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, 'COMPLETED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [receiptId, receiptNumber, purchaseOrderId, storageLocationId || null, userId, notes || null])

      // Create Receipt Items
      const receiptItems = []
      for (const item of items) {
        const { poItemId, quantityReceived, unitCost, notes: itemNotes } = item

        // Validate quantity
        if (quantityReceived <= 0) {
          throw new Error(`Quantity must be greater than 0 for item ${poItemId}`)
        }

        // Get material ID from PO item AND verify it belongs to this PO
        const poItemResult = await query(`
          SELECT "materialId", "unitCost" as "poUnitCost"
          FROM "PurchaseOrderItem"
          WHERE id = $1 AND "purchaseOrderId" = $2
          FOR UPDATE
        `, [poItemId, purchaseOrderId])

        if (poItemResult.rows.length === 0) {
          throw new Error(`PO item ${poItemId} not found or does not belong to this purchase order`)
        }

        const materialId = poItemResult.rows[0].materialId
        const cost = unitCost || parseFloat(poItemResult.rows[0].poUnitCost || 0)

        const itemId = uuidv4()
        
        // Insert receipt item - triggers will handle stock updates
        await query(`
          INSERT INTO "ReceiptItem" (
            id, "receiptId", "poItemId", "materialId", "quantityReceived",
            "unitCost", notes, "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [itemId, receiptId, poItemId, materialId, quantityReceived, cost, itemNotes || null])

        receiptItems.push({
          id: itemId,
          poItemId,
          materialId,
          quantityReceived,
          unitCost: cost
        })
      }

      // Update PO status based on receiving completion
      const statusCheckResult = await query(`
        SELECT 
          COUNT(*) as total_items,
          SUM(CASE WHEN "receivingStatus" = 'COMPLETE' THEN 1 ELSE 0 END) as complete_items,
          SUM(CASE WHEN "receivingStatus" != 'NOT_RECEIVED' THEN 1 ELSE 0 END) as received_items
        FROM "PurchaseOrderReceivingStatus"
        WHERE "purchaseOrderId" = $1
      `, [purchaseOrderId])

      const statusCheck = statusCheckResult.rows[0]
      const totalItems = parseInt(statusCheck.total_items || 0)
      const completeItems = parseInt(statusCheck.complete_items || 0)
      const receivedItems = parseInt(statusCheck.received_items || 0)

      let poStatus = 'PENDING'
      if (completeItems === totalItems) {
        poStatus = 'RECEIVED'
      } else if (receivedItems > 0) {
        poStatus = 'PARTIAL'
      }

      await query(`
        UPDATE "PurchaseOrder"
        SET status = $1, "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [poStatus, purchaseOrderId])

      // Commit transaction
      await query('COMMIT')

      // Fetch the complete receipt with items
      const receiptResult = await query(`
        SELECT 
          r.*,
          json_agg(
            json_build_object(
              'id', ri.id,
              'poItemId', ri."poItemId",
              'materialId', ri."materialId",
              'materialCode', m.code,
              'materialName', m.name,
              'quantityReceived', ri."quantityReceived",
              'unitCost', ri."unitCost",
              'notes', ri.notes
            )
          ) as items
        FROM "PurchaseOrderReceipt" r
        LEFT JOIN "ReceiptItem" ri ON r.id = ri."receiptId"
        LEFT JOIN "Material" m ON ri."materialId" = m.id
        WHERE r.id = $1
        GROUP BY r.id
      `, [receiptId])

      const receipt = receiptResult.rows[0]

      return NextResponse.json({
        success: true,
        receipt: {
          id: receipt.id,
          receiptNumber: receipt.receiptNumber,
          purchaseOrderId: receipt.purchaseOrderId,
          storageLocationId: receipt.storageLocationId,
          receivedAt: receipt.receivedAt,
          receivedBy: receipt.receivedBy,
          status: receipt.status,
          notes: receipt.notes,
          items: receipt.items || []
        },
        updatedPOStatus: poStatus
      }, { status: 201 })

    } catch (error) {
      await query('ROLLBACK')
      throw error
    }

  } catch (error) {
    console.error('Error receiving PO:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to receive purchase order' },
      { status: 500 }
    )
  }
}
