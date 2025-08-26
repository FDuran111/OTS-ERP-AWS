import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const lineItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  quantity: z.number(),
  unit: z.string(),
  unitPrice: z.number(),
  totalPrice: z.number()
})

const bidSheetSchema = z.object({
  jobNumber: z.string(),
  jobDescription: z.string(),
  customerName: z.string(),
  customerAddress: z.string(),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
  bidDate: z.string(),
  validUntil: z.string(),
  projectType: z.string(),
  priority: z.string(),
  scopeOfWork: z.string(),
  laborDescription: z.string().optional(),
  materialDescription: z.string().optional(),
  lineItems: z.array(lineItemSchema),
  subtotal: z.number(),
  taxRate: z.number(),
  taxAmount: z.number(),
  totalAmount: z.number(),
  paymentTerms: z.string(),
  warrantyTerms: z.string(),
  notes: z.string().optional(),
  createdBy: z.string().optional(),
  createdAt: z.string()
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let user
    try {
      user = verifyToken(token)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const jobId = resolvedParams.id

    // Verify job exists
    const jobCheck = await query('SELECT id, "jobNumber" FROM "Job" WHERE id = $1', [jobId])
    if (jobCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const bidSheetData = bidSheetSchema.parse({
      ...body,
      createdBy: user.id,
      createdAt: new Date().toISOString()
    })

    // Save bid sheet to database
    const result = await query(`
      INSERT INTO "BidSheet" (
        "jobId", "jobNumber", "jobDescription", "customerName", "customerAddress",
        "contactPerson", "contactPhone", "contactEmail", "bidDate", "validUntil",
        "projectType", "priority", "scopeOfWork", "laborDescription", "materialDescription",
        "lineItems", "subtotal", "taxRate", "taxAmount", "totalAmount",
        "paymentTerms", "warrantyTerms", "notes", "createdBy", "createdAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25
      )
      RETURNING *
    `, [
      jobId,
      bidSheetData.jobNumber,
      bidSheetData.jobDescription,
      bidSheetData.customerName,
      bidSheetData.customerAddress,
      bidSheetData.contactPerson || null,
      bidSheetData.contactPhone || null,
      bidSheetData.contactEmail || null,
      bidSheetData.bidDate,
      bidSheetData.validUntil,
      bidSheetData.projectType,
      bidSheetData.priority,
      bidSheetData.scopeOfWork,
      bidSheetData.laborDescription || null,
      bidSheetData.materialDescription || null,
      JSON.stringify(bidSheetData.lineItems),
      bidSheetData.subtotal,
      bidSheetData.taxRate,
      bidSheetData.taxAmount,
      bidSheetData.totalAmount,
      bidSheetData.paymentTerms,
      bidSheetData.warrantyTerms,
      bidSheetData.notes || null,
      user.id,
      bidSheetData.createdAt
    ])

    const savedBidSheet = result.rows[0]

    return NextResponse.json({
      success: true,
      bidSheet: {
        id: savedBidSheet.id,
        jobId: savedBidSheet.jobId,
        ...bidSheetData,
        lineItems: JSON.parse(savedBidSheet.lineItems)
      }
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid bid sheet data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error saving bid sheet:', error)
    return NextResponse.json(
      { error: 'Failed to save bid sheet' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const jobId = resolvedParams.id

    const result = await query(`
      SELECT bs.*, u."firstName", u."lastName"
      FROM "BidSheet" bs
      LEFT JOIN "User" u ON bs."createdBy" = u.id
      WHERE bs."jobId" = $1
      ORDER BY bs."createdAt" DESC
    `, [jobId])

    const bidSheets = result.rows.map(row => ({
      id: row.id,
      jobId: row.jobId,
      jobNumber: row.jobNumber,
      jobDescription: row.jobDescription,
      customerName: row.customerName,
      customerAddress: row.customerAddress,
      contactPerson: row.contactPerson,
      contactPhone: row.contactPhone,
      contactEmail: row.contactEmail,
      bidDate: row.bidDate,
      validUntil: row.validUntil,
      projectType: row.projectType,
      priority: row.priority,
      scopeOfWork: row.scopeOfWork,
      laborDescription: row.laborDescription,
      materialDescription: row.materialDescription,
      lineItems: JSON.parse(row.lineItems || '[]'),
      subtotal: row.subtotal,
      taxRate: row.taxRate,
      taxAmount: row.taxAmount,
      totalAmount: row.totalAmount,
      paymentTerms: row.paymentTerms,
      warrantyTerms: row.warrantyTerms,
      notes: row.notes,
      createdBy: row.createdBy,
      createdByName: row.firstName && row.lastName ? `${row.firstName} ${row.lastName}` : 'Unknown',
      createdAt: row.createdAt
    }))

    return NextResponse.json(bidSheets)

  } catch (error) {
    console.error('Error fetching bid sheets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bid sheets' },
      { status: 500 }
    )
  }
}