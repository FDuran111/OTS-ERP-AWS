import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { 
  createPurchaseOrderItem,
  deletePurchaseOrderItem
} from '@/lib/purchase-orders'

const createItemSchema = z.object({
  materialId: z.string().optional(),
  itemCode: z.string().optional(),
  description: z.string(),
  quantity: z.number().positive(),
  unit: z.string(),
  unitPrice: z.number().min(0),
  taxRate: z.number().min(0).max(100).optional(),
  notes: z.string().optional()
})

// POST - Add item to purchase order
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const body = await request.json()
    const data = createItemSchema.parse(body)
    
    const item = await createPurchaseOrderItem({
      purchaseOrderId: resolvedParams.id,
      lineNumber: 0, // Will be auto-generated
      ...data,
      taxRate: data.taxRate || 0
    })
    
    return NextResponse.json({
      success: true,
      data: item
    }, { status: 201 })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error adding purchase order item:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to add purchase order item' },
      { status: 500 }
    )
  }
}

// DELETE - Remove item from purchase order
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')
    
    if (!itemId) {
      return NextResponse.json(
        { success: false, error: 'Item ID is required' },
        { status: 400 }
      )
    }
    
    const deleted = await deletePurchaseOrderItem(itemId)
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Purchase order item not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Purchase order item deleted successfully'
    })
    
  } catch (error) {
    console.error('Error deleting purchase order item:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete purchase order item' },
      { status: 500 }
    )
  }
}