import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET /api/materials/on-order - Get on-order quantities for all materials
export async function GET(request: NextRequest) {
  try {
    const result = await query(
      `SELECT 
        poi."materialId",
        SUM(poi.quantity - COALESCE(poi."receivedQuantity", 0)) as "onOrderQty"
      FROM "PurchaseOrderItem" poi
      JOIN "PurchaseOrder" po ON poi."purchaseOrderId" = po.id
      WHERE po.status IN ('PENDING', 'PARTIAL')
        AND poi.quantity > COALESCE(poi."receivedQuantity", 0)
      GROUP BY poi."materialId"`
    )

    // Convert to map for easier consumption
    const onOrderMap: Record<string, number> = {}
    result.rows.forEach(row => {
      onOrderMap[row.materialId] = parseFloat(row.onOrderQty)
    })

    return NextResponse.json(onOrderMap)
  } catch (error) {
    console.error('Error fetching on-order quantities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch on-order quantities' },
      { status: 500 }
    )
  }
}
