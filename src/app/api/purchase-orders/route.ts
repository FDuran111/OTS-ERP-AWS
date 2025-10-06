import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyToken } from '@/lib/auth'
import {
  createSimplePurchaseOrder,
  getSimplePurchaseOrders,
  getSimplePendingApprovals
} from '@/lib/purchase-orders-simple'

const createPOSchema = z.object({
  vendorId: z.string(),
  jobId: z.string().optional(),
  createdBy: z.string(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  requiredDate: z.string().optional(),
  subtotal: z.number().min(0),
  taxAmount: z.number().min(0).optional(),
  shippingAmount: z.number().min(0).optional(),
  discountAmount: z.number().min(0).optional(),
  shipToAddress: z.string().optional(),
  shipToCity: z.string().optional(),
  shipToState: z.string().optional(),
  shipToZip: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  items: z.array(z.object({
    materialId: z.string().optional(),
    itemCode: z.string().optional(),
    description: z.string(),
    quantity: z.number().positive(),
    unit: z.string(),
    unitPrice: z.number().min(0),
    taxRate: z.number().min(0).max(100).optional()
  })).optional()
})

// GET - List purchase orders with filters
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userPayload = verifyToken(token)
    const userId = userPayload.id
    const userRole = userPayload.role

    // All authenticated users can view POs
    // Employees see only their own, Admins see all

    const { searchParams } = new URL(request.url)

    const filters = {
      vendorId: searchParams.get('vendorId') || undefined,
      jobId: searchParams.get('jobId') || undefined,
      status: searchParams.get('status') || undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    }

    // Employees can only see their own POs
    if (userRole === 'EMPLOYEE') {
      filters.createdBy = userId
    }
    
    // Check if we want pending approvals specifically
    if (searchParams.get('pendingApprovals') === 'true') {
      const pendingCount = await getSimplePendingApprovals()
      return NextResponse.json({
        success: true,
        data: [],
        total: pendingCount
      })
    }
    
    const orders = await getSimplePurchaseOrders(filters)
    
    return NextResponse.json({
      success: true,
      data: orders,
      total: orders.length,
      filters
    })
    
  } catch (error) {
    console.error('Error fetching purchase orders:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch purchase orders' },
      { status: 500 }
    )
  }
}

// POST - Create new purchase order
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userPayload = verifyToken(token)
    const userId = userPayload.id
    const userRole = userPayload.role

    // All authenticated users can create POs
    // Employees create DRAFT, Admins can create any status

    const body = await request.json()
    const data = createPOSchema.parse(body)
    
    // Ensure createdBy matches authenticated user
    const createdBy = userId

    // Employees can only create DRAFT status
    let status = 'DRAFT'
    if (['OWNER_ADMIN', 'FOREMAN', 'ADMIN', 'MANAGER'].includes(userRole)) {
      // Admins can specify status or default to PENDING_APPROVAL
      status = body.status || 'PENDING_APPROVAL'
    }

    // Create the PO using simple version
    const po = await createSimplePurchaseOrder({
      vendorId: data.vendorId,
      jobId: data.jobId,
      createdBy,
      totalAmount: data.subtotal || 0,
      status
    })
    
    // Create line items if provided
    if (data.items && data.items.length > 0) {
      const { createPurchaseOrderItem } = await import('@/lib/purchase-orders')
      
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i]
        await createPurchaseOrderItem({
          purchaseOrderId: po.id,
          lineNumber: i + 1,
          ...item,
          taxRate: item.taxRate || 0,
          notes: undefined
        })
      }
      
      // Fetch the complete PO with items
      const { getPurchaseOrderById } = await import('@/lib/purchase-orders')
      const completeOrder = await getPurchaseOrderById(po.id)
      
      return NextResponse.json({
        success: true,
        data: completeOrder
      }, { status: 201 })
    }
    
    return NextResponse.json({
      success: true,
      data: po
    }, { status: 201 })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating purchase order:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create purchase order' },
      { status: 500 }
    )
  }
}