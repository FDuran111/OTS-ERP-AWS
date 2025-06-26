import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { 
  getPurchaseOrderById, 
  updatePurchaseOrder,
  approvePurchaseOrder,
  rejectPurchaseOrder
} from '@/lib/purchase-orders'

const updatePOSchema = z.object({
  vendorId: z.string().optional(),
  jobId: z.string().optional(),
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SENT', 'RECEIVED', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  requiredDate: z.string().optional(),
  subtotal: z.number().min(0).optional(),
  taxAmount: z.number().min(0).optional(),
  shippingAmount: z.number().min(0).optional(),
  discountAmount: z.number().min(0).optional(),
  shipToAddress: z.string().optional(),
  shipToCity: z.string().optional(),
  shipToState: z.string().optional(),
  shipToZip: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional()
})

const approvalSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  approverId: z.string(),
  comments: z.string().optional(),
  reason: z.string().optional()
})

// GET - Get specific purchase order
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const po = await getPurchaseOrderById(params.id)
    
    if (!po) {
      return NextResponse.json(
        { success: false, error: 'Purchase order not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: po
    })
    
  } catch (error) {
    console.error('Error fetching purchase order:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch purchase order' },
      { status: 500 }
    )
  }
}

// PUT - Update purchase order
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    // Check if this is an approval action
    if (body.action && ['APPROVE', 'REJECT'].includes(body.action)) {
      const approvalData = approvalSchema.parse(body)
      
      let updatedPO
      if (approvalData.action === 'APPROVE') {
        updatedPO = await approvePurchaseOrder(
          params.id, 
          approvalData.approverId, 
          approvalData.comments
        )
      } else {
        updatedPO = await rejectPurchaseOrder(
          params.id, 
          approvalData.approverId, 
          approvalData.reason || 'No reason provided'
        )
      }
      
      if (!updatedPO) {
        return NextResponse.json(
          { success: false, error: 'Purchase order not found' },
          { status: 404 }
        )
      }
      
      return NextResponse.json({
        success: true,
        data: updatedPO,
        message: `Purchase order ${approvalData.action.toLowerCase()}d successfully`
      })
    }
    
    // Regular update
    const data = updatePOSchema.parse(body)
    
    // Convert date strings to Date objects
    const updates = {
      ...data,
      requiredDate: data.requiredDate ? new Date(data.requiredDate) : undefined
    }
    
    const updatedPO = await updatePurchaseOrder(params.id, updates)
    
    if (!updatedPO) {
      return NextResponse.json(
        { success: false, error: 'Purchase order not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: updatedPO
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error updating purchase order:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update purchase order' },
      { status: 500 }
    )
  }
}

// DELETE - Cancel purchase order (set status to CANCELLED)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updatedPO = await updatePurchaseOrder(params.id, { 
      status: 'CANCELLED' 
    })
    
    if (!updatedPO) {
      return NextResponse.json(
        { success: false, error: 'Purchase order not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: updatedPO,
      message: 'Purchase order cancelled successfully'
    })
    
  } catch (error) {
    console.error('Error cancelling purchase order:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to cancel purchase order' },
      { status: 500 }
    )
  }
}