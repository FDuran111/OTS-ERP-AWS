import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'
import { permissions, stripPricingFromArray } from '@/lib/permissions'
import { verifyToken } from '@/lib/auth'
import { withRBAC } from '@/lib/rbac-middleware'

console.log('Invoice route file loaded')

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
export const GET = withRBAC({
  requiredRoles: ['OWNER_ADMIN', 'FOREMAN', 'EMPLOYEE']
})(async (request: NextRequest) => {
  try {
    // Get invoices with job and customer info
    const invoicesResult = await query(`
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
      ORDER BY i."createdAt" DESC
    `)

    // Get line items for all invoices
    const invoiceIds = invoicesResult.rows.map(inv => inv.id)
    let lineItemsResult: { rows: any[] } = { rows: [] }
    
    if (invoiceIds.length > 0) {
      const placeholders = invoiceIds.map((_, i) => `$${i + 1}`).join(',')
      lineItemsResult = await query(
        `SELECT * FROM "InvoiceLineItem" WHERE "invoiceId" IN (${placeholders}) ORDER BY "createdAt" ASC`,
        invoiceIds
      )
    }

    // Group line items by invoice
    const lineItemsByInvoice = lineItemsResult.rows.reduce((acc, item) => {
      if (!acc[item.invoiceId]) {
        acc[item.invoiceId] = []
      }
      acc[item.invoiceId].push({
        id: item.id,
        type: item.type,
        description: item.description,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        totalPrice: parseFloat(item.totalPrice),
        materialId: item.materialId,
        laborRateId: item.laborRateId
      })
      return acc
    }, {} as Record<string, any[]>)

    // Transform the data
    const transformedInvoices = invoicesResult.rows.map(invoice => ({
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
      lineItems: lineItemsByInvoice[invoice.id] || []
    }))

    // Get user role to determine pricing visibility
    const token = request.cookies.get('auth-token')?.value
    if (token) {
      try {
        const userPayload = verifyToken(token)
        const userRole = userPayload.role
        
        // Strip pricing data if user is EMPLOYEE
        if (!permissions.canViewInvoiceAmounts(userRole)) {
          const pricingFields = ['totalAmount', 'subtotalAmount', 'taxAmount']
          const strippedInvoices = stripPricingFromArray(transformedInvoices, userRole, pricingFields)
          
          // Also strip line item pricing
          return NextResponse.json(strippedInvoices.map(invoice => ({
            ...invoice,
            lineItems: invoice.lineItems.map((item: any) => {
              const { unitPrice, totalPrice, ...rest } = item
              return rest
            })
          })))
        }
      } catch (error) {
        console.error('Error verifying token:', error)
      }
    }

    return NextResponse.json(transformedInvoices)
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
})

// POST create new invoice
export const POST = withRBAC({
  requiredRoles: ['OWNER_ADMIN', 'FOREMAN']
})(async (request: NextRequest) => {
  console.log('=== Invoice POST endpoint called ===')
  try {
    const body = await request.json()
    console.log('Invoice creation request body:', JSON.stringify(body, null, 2))
    
    let data
    try {
      data = createInvoiceSchema.parse(body)
    } catch (validationError) {
      console.error('Validation error:', validationError)
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid data', details: validationError.errors },
          { status: 400 }
        )
      }
      throw validationError
    }

    // Get job info with simpler query
    let job = null
    try {
      const jobResult = await query(
        'SELECT id, "jobNumber", "customerId", description FROM "Job" WHERE id = $1',
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
      job.customer_id = job.customerId // Ensure consistent naming
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

    // Create line items in a single batch insert for better performance
    const lineItems = []
    if (data.lineItems.length > 0) {
      console.log('Creating line items for invoice:', invoice.id)
      console.log('Line items to create:', data.lineItems)
      
      // Build values for batch insert
      const lineItemValues = []
      const lineItemParams = []
      let paramIndex = 1
      
      for (let i = 0; i < data.lineItems.length; i++) {
        const item = data.lineItems[i]
        const totalPrice = item.quantity * item.unitPrice
        const id = `ili_${Date.now()}_${i}_${Math.random().toString(36).substring(7)}`
        
        lineItemValues.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5}, $${paramIndex+6}, $${paramIndex+7}, $${paramIndex+8}, $${paramIndex+9}, $${paramIndex+10})`)
        lineItemParams.push(
          id,
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
        )
        paramIndex += 11
        
        lineItems.push({
          id,
          type: item.type,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice
        })
      }
      
      console.log('Line item SQL values:', lineItemValues)
      console.log('Line item params:', lineItemParams)
      
      // Execute batch insert
      try {
        const insertQuery = `INSERT INTO "InvoiceLineItem" (
          id, "invoiceId", type, description, quantity, "unitPrice", "totalPrice",
          "materialId", "laborRateId", "createdAt", "updatedAt"
        ) VALUES ${lineItemValues.join(', ')}`
        
        console.log('Executing line items insert query')
        await query(insertQuery, lineItemParams)
        console.log('Line items created successfully')
      } catch (lineItemError) {
        console.error('Error creating line items:', lineItemError)
        // Rollback - delete the invoice
        await query('DELETE FROM "Invoice" WHERE id = $1', [invoice.id])
        throw lineItemError
      }
    } else {
      console.log('No line items to create')
    }

    // Return simplified response without additional queries
    const responseInvoice = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
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
        id: job.id,
        jobNumber: job.jobNumber,
        description: job.description
      },
      customer: {
        id: job.customer_id,
        firstName: 'Customer',
        lastName: 'Name'
      },
      lineItems: lineItems
    }

    return NextResponse.json(responseInvoice, { status: 201 })
  } catch (error) {
    console.error('Invoice creation error:', error)
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
})