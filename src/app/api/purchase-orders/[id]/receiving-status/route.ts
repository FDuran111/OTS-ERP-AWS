import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Get PO receiving status using the view
    const result = await query(`
      SELECT 
        "purchaseOrderId",
        "poNumber",
        json_agg(
          json_build_object(
            'poItemId', "poItemId",
            'materialId', "materialId",
            'materialCode', "materialCode",
            'materialName', "materialName",
            'orderedQty', "orderedQty",
            'receivedQty', "receivedQty",
            'remainingQty', "remainingQty",
            'receivingStatus', "receivingStatus"
          )
        ) as items
      FROM "PurchaseOrderReceivingStatus"
      WHERE "purchaseOrderId" = $1
      GROUP BY "purchaseOrderId", "poNumber"
    `, [id])

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      )
    }

    const poStatus = result.rows[0]
    
    // Calculate overall status
    const items = poStatus.items || []
    const allComplete = items.every((item: any) => item.receivingStatus === 'COMPLETE')
    const anyReceived = items.some((item: any) => item.receivingStatus !== 'NOT_RECEIVED')
    
    let overallStatus = 'NOT_RECEIVED'
    if (allComplete) {
      overallStatus = 'COMPLETE'
    } else if (anyReceived) {
      overallStatus = 'PARTIAL'
    }

    return NextResponse.json({
      purchaseOrderId: poStatus.purchaseOrderId,
      poNumber: poStatus.poNumber,
      overallStatus,
      items: items.map((item: any) => ({
        poItemId: item.poItemId,
        materialId: item.materialId,
        materialCode: item.materialCode,
        materialName: item.materialName,
        orderedQty: parseFloat(item.orderedQty || 0),
        receivedQty: parseFloat(item.receivedQty || 0),
        remainingQty: parseFloat(item.remainingQty || 0),
        receivingStatus: item.receivingStatus
      }))
    })

  } catch (error) {
    console.error('Error fetching PO receiving status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch receiving status' },
      { status: 500 }
    )
  }
}
