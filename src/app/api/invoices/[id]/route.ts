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
    const invoiceId = resolvedParams.id
    console.log('Fetching invoice:', invoiceId)

    // Get invoice with job and customer info
    const invoiceResult = await query(`
      SELECT 
        i.*,
        j."jobNumber",
        j.description as job_description,
        c."firstName",
        c."lastName",
        c.email,
        c."companyName"
      FROM "Invoice" i
      LEFT JOIN "Job" j ON i."jobId" = j.id
      LEFT JOIN "Customer" c ON i."customerId" = c.id
      WHERE i.id = $1
    `, [invoiceId])

    if (invoiceResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    const invoice = invoiceResult.rows[0]

    // Get line items for this invoice
    const lineItemsResult = await query(
      `SELECT * FROM "InvoiceLineItem" WHERE "invoiceId" = $1 ORDER BY "createdAt" ASC`,
      [invoiceId]
    )

    console.log('Found line items:', lineItemsResult.rows.length)

    // Transform the data
    const transformedInvoice = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      jobId: invoice.jobId,
      status: invoice.status,
      totalAmount: parseFloat(invoice.totalAmount),
      subtotalAmount: parseFloat(invoice.subtotalAmount),
      taxAmount: parseFloat(invoice.taxAmount),
      dueDate: invoice.dueDate,
      sentDate: invoice.sentDate,
      paidDate: invoice.paidDate,
      notes: invoice.notes,
      createdAt: invoice.createdAt,
      job: {
        id: invoice.jobId,
        jobNumber: invoice.jobNumber || 'N/A',
        description: invoice.job_description || 'No description'
      },
      customer: {
        firstName: invoice.firstName || 'Unknown',
        lastName: invoice.lastName || 'Customer',
        email: invoice.email || '',
        companyName: invoice.companyName || ''
      },
      lineItems: lineItemsResult.rows.map(item => ({
        id: item.id,
        type: item.type,
        description: item.description,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        totalPrice: parseFloat(item.totalPrice),
        materialId: item.materialId,
        laborRateId: item.laborRateId
      }))
    }

    return NextResponse.json(transformedInvoice)
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
    const invoiceId = resolvedParams.id
    const body = await request.json()
    console.log('PATCH invoice:', invoiceId, 'with data:', body)

    // Build update query dynamically based on provided fields
    const updateFields = []
    const updateParams = []
    let paramIndex = 1

    if (body.status) {
      updateFields.push(`status = $${paramIndex}`)
      updateParams.push(body.status)
      paramIndex++
    }

    if (body.sentDate) {
      updateFields.push(`"sentDate" = $${paramIndex}`)
      updateParams.push(new Date(body.sentDate))
      paramIndex++
    }

    if (body.paidDate) {
      updateFields.push(`"paidDate" = $${paramIndex}`)
      updateParams.push(new Date(body.paidDate))
      paramIndex++
    }

    if (body.dueDate) {
      updateFields.push(`"dueDate" = $${paramIndex}`)
      updateParams.push(new Date(body.dueDate))
      paramIndex++
    }

    if (body.notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`)
      updateParams.push(body.notes)
      paramIndex++
    }

    // Always update updatedAt
    updateFields.push(`"updatedAt" = $${paramIndex}`)
    updateParams.push(new Date())
    paramIndex++

    // Add invoice ID as last parameter
    updateParams.push(invoiceId)

    const updateQuery = `
      UPDATE "Invoice" 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    console.log('Update query:', updateQuery)
    console.log('Update params:', updateParams)

    const result = await query(updateQuery, updateParams)

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    console.log('Invoice updated successfully:', result.rows[0])
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error updating invoice:', error)
    return NextResponse.json(
      { error: 'Failed to update invoice', details: error instanceof Error ? error.message : 'Unknown error' },
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