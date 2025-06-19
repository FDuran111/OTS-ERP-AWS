import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const updateInvoiceSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  dueDate: z.string().transform((str) => new Date(str)).optional(),
  notes: z.string().optional(),
  sentDate: z.string().transform((str) => new Date(str)).optional(),
  paidDate: z.string().transform((str) => new Date(str)).optional(),
  lineItems: z.array(z.object({
    id: z.string().optional(),
    type: z.enum(['LABOR', 'MATERIAL', 'OTHER']),
    description: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
    materialId: z.string().optional(),
    laborRateId: z.string().optional(),
  })).optional(),
  subtotalAmount: z.number().optional(),
  taxAmount: z.number().optional(),
  totalAmount: z.number().optional(),
})

// GET specific invoice
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    // Mock specific invoice data with line items
    const mockInvoice = {
      id: resolvedParams.id,
      invoiceNumber: 'INV-2025-001',
      status: 'DRAFT',
      totalAmount: 2450.00,
      subtotalAmount: 2268.52,
      taxAmount: 181.48,
      dueDate: '2025-06-15T00:00:00.000Z',
      sentDate: null,
      paidDate: null,
      notes: 'Sample invoice notes',
      createdAt: '2025-05-15T00:00:00.000Z',
      job: {
        jobNumber: '25-001-A12',
        description: 'Panel upgrade and rewiring',
        address: '123 Main St',
      },
      customer: {
        firstName: 'John',
        lastName: 'Johnson',
        email: 'john@example.com',
        phone: '555-1234',
        address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zip: '12345',
      },
      lineItems: [
        {
          id: '1',
          type: 'LABOR',
          description: 'Electrical panel installation',
          quantity: 8,
          unitPrice: 85,
          totalPrice: 680,
          materialId: null,
          laborRateId: '3',
        },
        {
          id: '2',
          type: 'MATERIAL',
          description: '200A Main Panel',
          quantity: 1,
          unitPrice: 425,
          totalPrice: 425,
          materialId: 'MAT002',
          laborRateId: null,
        },
        {
          id: '3',
          type: 'MATERIAL',
          description: '12 AWG Wire',
          quantity: 250,
          unitPrice: 0.68,
          totalPrice: 170,
          materialId: 'MAT001',
          laborRateId: null,
        }
      ]
    }

    return NextResponse.json(mockInvoice)
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    )
  }
}

// PATCH update invoice
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const body = await request.json()
    const data = updateInvoiceSchema.parse(body)

    // Mock successful update response
    const mockUpdatedInvoice = {
      id: resolvedParams.id,
      invoiceNumber: 'INV-2025-001',
      status: data.status || 'DRAFT',
      totalAmount: data.totalAmount || 2450.00,
      subtotalAmount: data.subtotalAmount || 2268.52,
      taxAmount: data.taxAmount || 181.48,
      dueDate: data.dueDate?.toISOString() || '2025-06-15T00:00:00.000Z',
      sentDate: data.sentDate?.toISOString() || null,
      paidDate: data.paidDate?.toISOString() || null,
      notes: data.notes || null,
      createdAt: '2025-05-15T00:00:00.000Z',
      job: {
        jobNumber: '25-001-A12',
        description: 'Panel upgrade and rewiring',
      },
      customer: {
        firstName: 'John',
        lastName: 'Johnson',
        email: 'john@example.com',
      },
      lineItems: data.lineItems?.map(item => ({
        id: item.id || Math.random().toString(36).substr(2, 9),
        ...item,
        totalPrice: item.quantity * item.unitPrice,
      })) || []
    }

    return NextResponse.json(mockUpdatedInvoice)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error updating invoice:', error)
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    )
  }
}

// DELETE invoice
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    // Delete invoice line items first
    await query(
      'DELETE FROM "InvoiceLineItem" WHERE "invoiceId" = $1',
      [resolvedParams.id]
    )

    // Delete the invoice
    const result = await query(
      'DELETE FROM "Invoice" WHERE id = $1 RETURNING *',
      [resolvedParams.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Invoice deleted successfully' 
    })
  } catch (error) {
    console.error('Error deleting invoice:', error)
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    )
  }
}