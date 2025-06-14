import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createInvoiceSchema = z.object({
  jobId: z.string(),
  dueDate: z.string().transform((str) => new Date(str)),
  notes: z.string().optional(),
  lineItems: z.array(z.object({
    type: z.enum(['LABOR', 'MATERIAL', 'OTHER']),
    description: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
    materialId: z.string().optional(),
    laborRateId: z.string().optional(),
  })),
})

// GET all invoices
export async function GET(request: NextRequest) {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        job: {
          select: {
            jobNumber: true,
            description: true,
          }
        },
        customer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        lineItems: {
          include: {
            material: {
              select: {
                code: true,
                name: true,
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(invoices)
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}

// POST create new invoice
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createInvoiceSchema.parse(body)

    // Mock invoice creation for now
    const year = new Date().getFullYear()
    const nextNumber = Math.floor(Math.random() * 900) + 100 // Random 3-digit number
    const invoiceNumber = `INV-${year}-${nextNumber.toString().padStart(3, '0')}`

    // Calculate totals
    let subtotalAmount = 0
    data.lineItems.forEach(item => {
      subtotalAmount += item.quantity * item.unitPrice
    })

    const taxAmount = subtotalAmount * 0.08 // 8% tax rate
    const totalAmount = subtotalAmount + taxAmount

    // Mock created invoice response
    const mockInvoice = {
      id: Math.random().toString(36).substr(2, 9),
      invoiceNumber,
      status: 'DRAFT',
      totalAmount,
      subtotalAmount,
      taxAmount,
      dueDate: data.dueDate.toISOString(),
      sentDate: null,
      paidDate: null,
      notes: data.notes,
      createdAt: new Date().toISOString(),
      job: {
        jobNumber: '25-005-E90',
        description: 'Sample Job Description',
      },
      customer: {
        firstName: 'Sample',
        lastName: 'Customer',
        email: 'sample@example.com',
      },
      lineItems: data.lineItems.map(item => ({
        id: Math.random().toString(36).substr(2, 9),
        ...item,
        totalPrice: item.quantity * item.unitPrice,
      }))
    }

    return NextResponse.json(mockInvoice, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating invoice:', error)
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    )
  }
}