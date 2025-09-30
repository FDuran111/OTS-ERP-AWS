import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

interface ReorderItem {
  materialId: string
  quantity: number
  unitCost?: number
}

interface CreatePORequest {
  vendorId: string
  items: ReorderItem[]
  expectedDeliveryDate?: string
  notes?: string
  storageLocationId?: string
}

async function generatePONumber(): Promise<string> {
  const result = await query('SELECT generate_po_number() as po_number')
  return result.rows[0]?.po_number || 'PO-000001'
}

export async function POST(request: NextRequest) {
  try {
    const body: CreatePORequest = await request.json()
    const { vendorId, items, expectedDeliveryDate, notes, storageLocationId } = body

    if (!vendorId || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Vendor and items are required' },
        { status: 400 }
      )
    }

    // Get user from session/auth (placeholder - adjust based on your auth)
    const userId = request.headers.get('x-user-id') || 'system'

    // Generate PO number
    const poNumber = await generatePONumber()
    const poId = uuidv4()
    
    // Start transaction
    await query('BEGIN')

    try {
      // Create Purchase Order
      const createPOResult = await query(`
        INSERT INTO "PurchaseOrder" (
          id, "poNumber", "vendorId", "orderDate", "expectedDeliveryDate",
          "totalCost", status, notes, "createdBy", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, 0, 'PENDING', $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `, [poId, poNumber, vendorId, expectedDeliveryDate || null, notes || null, userId])

      const purchaseOrder = createPOResult.rows[0]

      // Create PO Items and calculate total
      let totalCost = 0
      const poItems = []

      for (const item of items) {
        const { materialId, quantity, unitCost } = item
        
        // Get material details if unit cost not provided
        let cost = unitCost
        if (!cost) {
          const materialResult = await query(`
            SELECT cost FROM "Material" WHERE id = $1
          `, [materialId])
          cost = parseFloat(materialResult.rows[0]?.cost || 0)
        }

        const itemTotal = quantity * cost
        totalCost += itemTotal

        const itemId = uuidv4()
        const itemResult = await query(`
          INSERT INTO "PurchaseOrderItem" (
            id, "purchaseOrderId", "materialId", quantity, "unitCost", "totalCost"
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [itemId, poId, materialId, quantity, cost, itemTotal])

        poItems.push(itemResult.rows[0])
      }

      // Update PO total cost
      await query(`
        UPDATE "PurchaseOrder"
        SET "totalCost" = $1, "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [totalCost, poId])

      // Commit transaction
      await query('COMMIT')

      // Fetch complete PO with items for response
      const completePOResult = await query(`
        SELECT 
          po.*,
          json_agg(
            json_build_object(
              'id', poi.id,
              'materialId', poi."materialId",
              'materialCode', m.code,
              'materialName', m.name,
              'quantity', poi.quantity,
              'unitCost', poi."unitCost",
              'totalCost', poi."totalCost"
            )
          ) as items
        FROM "PurchaseOrder" po
        LEFT JOIN "PurchaseOrderItem" poi ON po.id = poi."purchaseOrderId"
        LEFT JOIN "Material" m ON poi."materialId" = m.id
        WHERE po.id = $1
        GROUP BY po.id
      `, [poId])

      const completePO = completePOResult.rows[0]

      return NextResponse.json({
        success: true,
        purchaseOrder: {
          id: completePO.id,
          poNumber: completePO.poNumber,
          vendorId: completePO.vendorId,
          orderDate: completePO.orderDate,
          expectedDeliveryDate: completePO.expectedDeliveryDate,
          totalCost: parseFloat(completePO.totalCost),
          status: completePO.status,
          notes: completePO.notes,
          items: completePO.items || []
        }
      }, { status: 201 })

    } catch (error) {
      await query('ROLLBACK')
      throw error
    }

  } catch (error) {
    console.error('Error creating PO from reorder:', error)
    return NextResponse.json(
      { error: 'Failed to create purchase order' },
      { status: 500 }
    )
  }
}
