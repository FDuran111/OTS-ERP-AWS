import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
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
    // Simplified query - just get invoices first
    const invoicesResult = await query(`
      SELECT * FROM "Invoice" ORDER BY "createdAt" DESC
    `)

    // Simplified response - just return invoices without complex joins for now
    const transformedInvoices = invoicesResult.rows.map(invoice => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber || 'N/A',
      status: invoice.status || 'DRAFT',
      totalAmount: parseFloat(invoice.totalAmount || 0),
      subtotalAmount: parseFloat(invoice.subtotalAmount || 0),
      taxAmount: parseFloat(invoice.taxAmount || 0),
      dueDate: invoice.dueDate,
      sentDate: invoice.sentDate,
      paidDate: invoice.paidDate,
      notes: invoice.notes,
      createdAt: invoice.createdAt,
      job: {
        jobNumber: 'Unknown Job',
        description: 'Job details unavailable'
      },
      customer: {
        firstName: 'Unknown',
        lastName: 'Customer',
        email: '',
        companyName: ''
      },
      lineItems: []
    }))

    return NextResponse.json(transformedInvoices)
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
    console.log('Invoice creation request body:', body)
    const data = createInvoiceSchema.parse(body)

    // Get job and customer info - handle if no jobs exist
    let job = null
    try {
      const jobResult = await query(
        `SELECT j.*, c.id as customer_id 
         FROM "Job" j 
         INNER JOIN "Customer" c ON j."customerId" = c.id 
         WHERE j.id = $1`,
        [data.jobId]
      )

      console.log('Job query result:', jobResult.rows)

      if (jobResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        )
      }

      job = jobResult.rows[0]
    } catch (jobError) {
      console.error('Error fetching job:', jobError)
      return NextResponse.json(
        { error: 'Failed to fetch job information', details: jobError instanceof Error ? jobError.message : 'Unknown error' },
        { status: 500 }
      )
    }

    // Generate invoice number
    const year = new Date().getFullYear()
    const lastInvoiceResult = await query(
      `SELECT "invoiceNumber" FROM "Invoice" 
       WHERE "invoiceNumber" LIKE $1 
       ORDER BY "invoiceNumber" DESC 
       LIMIT 1`,
      [`INV-${year}-%`]
    )

    let nextNumber = 1
    if (lastInvoiceResult.rows.length > 0) {
      const lastNumber = parseInt(lastInvoiceResult.rows[0].invoiceNumber.split('-')[2])
      nextNumber = lastNumber + 1
    }

    const invoiceNumber = `INV-${year}-${nextNumber.toString().padStart(3, '0')}`

    // Calculate totals
    let subtotalAmount = 0
    data.lineItems.forEach(item => {
      subtotalAmount += item.quantity * item.unitPrice
    })

    const taxAmount = subtotalAmount * 0.08 // 8% tax rate
    const totalAmount = subtotalAmount + taxAmount

    // Create the invoice
    let invoiceResult
    try {
      console.log('Creating invoice with data:', {
        invoiceNumber,
        jobId: data.jobId,
        customerId: job.customer_id,
        subtotalAmount,
        taxAmount,
        totalAmount,
        dueDate: data.dueDate
      })

      invoiceResult = await query(
        `INSERT INTO "Invoice" (
          id, "invoiceNumber", "jobId", "customerId", status,
          "subtotalAmount", "taxAmount", "totalAmount", "dueDate", notes,
          "createdAt", "updatedAt"
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          invoiceNumber,
          data.jobId,
          job.customer_id,
          'DRAFT',
          subtotalAmount,
          taxAmount,
          totalAmount,
          data.dueDate,
          data.notes || null,
          new Date(),
          new Date()
        ]
      )
    } catch (invoiceError) {
      console.error('Error creating invoice:', invoiceError)
      return NextResponse.json(
        { error: 'Failed to create invoice', details: invoiceError instanceof Error ? invoiceError.message : 'Unknown error' },
        { status: 500 }
      )
    }

    const invoice = invoiceResult.rows[0]

    // Create line items
    const lineItems = []
    for (const item of data.lineItems) {
      const totalPrice = item.quantity * item.unitPrice
      const lineItemResult = await query(
        `INSERT INTO "InvoiceLineItem" (
          id, "invoiceId", type, description, quantity, "unitPrice", "totalPrice",
          "materialId", "laborRateId", "createdAt", "updatedAt"
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          invoice.id,
          item.type,
          item.description,
          item.quantity,
          item.unitPrice,
          totalPrice,
          item.materialId || null,
          item.laborRateId || null,
          new Date(),
          new Date()
        ]
      )
      lineItems.push(lineItemResult.rows[0])
    }

    // Get complete invoice with job and customer info
    const completeInvoiceResult = await query(
      `SELECT 
        i.*,
        j."jobNumber",
        j.description as job_description,
        c."firstName",
        c."lastName",
        c.email,
        c."companyName"
      FROM "Invoice" i
      INNER JOIN "Job" j ON i."jobId" = j.id
      INNER JOIN "Customer" c ON i."customerId" = c.id
      WHERE i.id = $1`,
      [invoice.id]
    )

    const completeInvoice = completeInvoiceResult.rows[0]

    const responseInvoice = {
      id: completeInvoice.id,
      invoiceNumber: completeInvoice.invoiceNumber,
      status: completeInvoice.status,
      totalAmount: parseFloat(completeInvoice.totalAmount),
      subtotalAmount: parseFloat(completeInvoice.subtotalAmount),
      taxAmount: parseFloat(completeInvoice.taxAmount),
      dueDate: completeInvoice.dueDate,
      sentDate: completeInvoice.sentDate,
      paidDate: completeInvoice.paidDate,
      notes: completeInvoice.notes,
      createdAt: completeInvoice.createdAt,
      job: {
        jobNumber: completeInvoice.jobNumber,
        description: completeInvoice.job_description
      },
      customer: {
        firstName: completeInvoice.firstName,
        lastName: completeInvoice.lastName,
        email: completeInvoice.email,
        companyName: completeInvoice.companyName
      },
      lineItems: lineItems.map(item => ({
        id: item.id,
        type: item.type,
        description: item.description,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        totalPrice: parseFloat(item.totalPrice)
      }))
    }

    return NextResponse.json(responseInvoice, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors)
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating invoice:', error)
    return NextResponse.json(
      { error: 'Failed to create invoice', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}