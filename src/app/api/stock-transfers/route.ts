import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'
import { withRBAC } from '@/lib/rbac-middleware'
import { verifyToken } from '@/lib/auth'

const createTransferSchema = z.object({
  sourceLocationId: z.string().min(1, 'Source location is required'),
  destLocationId: z.string().min(1, 'Destination location is required'),
  items: z.array(z.object({
    materialId: z.string().min(1, 'Material ID is required'),
    quantityRequested: z.number().positive('Quantity must be positive'),
  })).min(1, 'At least one item is required'),
  notes: z.string().optional(),
})

// GET all transfers
export const GET = withRBAC({
  requiredRoles: ['OWNER_ADMIN', 'FOREMAN', 'EMPLOYEE']
})(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const sourceLocationId = searchParams.get('sourceLocationId')
    const destLocationId = searchParams.get('destLocationId')

    // Build WHERE conditions
    const conditions = []
    const params = []
    let paramIndex = 1

    if (status) {
      conditions.push(`st.status = $${paramIndex}`)
      params.push(status)
      paramIndex++
    }

    if (sourceLocationId) {
      conditions.push(`st."sourceLocationId" = $${paramIndex}`)
      params.push(sourceLocationId)
      paramIndex++
    }

    if (destLocationId) {
      conditions.push(`st."destLocationId" = $${paramIndex}`)
      params.push(destLocationId)
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Get transfers with location and user details
    const result = await query(
      `SELECT 
        st.*,
        sl_source.name as "sourceLocationName",
        sl_source.code as "sourceLocationCode",
        sl_dest.name as "destLocationName",
        sl_dest.code as "destLocationCode",
        u_created.name as "createdByName",
        u_approved.name as "approvedByName",
        COUNT(sti.id)::int as "itemCount"
      FROM "StockTransfer" st
      LEFT JOIN "StorageLocation" sl_source ON st."sourceLocationId" = sl_source.id
      LEFT JOIN "StorageLocation" sl_dest ON st."destLocationId" = sl_dest.id
      LEFT JOIN "User" u_created ON st."createdBy" = u_created.id
      LEFT JOIN "User" u_approved ON st."approvedBy" = u_approved.id
      LEFT JOIN "StockTransferItem" sti ON st.id = sti."transferId"
      ${whereClause}
      GROUP BY st.id, sl_source.name, sl_source.code, sl_dest.name, sl_dest.code, u_created.name, u_approved.name
      ORDER BY st."createdAt" DESC`,
      params
    )

    const transfers = result.rows.map(row => ({
      id: row.id,
      transferNumber: row.transferNumber,
      sourceLocation: {
        id: row.sourceLocationId,
        name: row.sourceLocationName,
        code: row.sourceLocationCode,
      },
      destLocation: {
        id: row.destLocationId,
        name: row.destLocationName,
        code: row.destLocationCode,
      },
      status: row.status,
      transferDate: row.transferDate,
      completedDate: row.completedDate,
      notes: row.notes,
      itemCount: row.itemCount,
      createdBy: row.createdBy ? {
        id: row.createdBy,
        name: row.createdByName,
      } : null,
      approvedBy: row.approvedBy ? {
        id: row.approvedBy,
        name: row.approvedByName,
      } : null,
      approvedAt: row.approvedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }))

    return NextResponse.json(transfers)
  } catch (error) {
    console.error('Error fetching transfers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transfers' },
      { status: 500 }
    )
  }
})

// POST create new transfer
export const POST = withRBAC({
  requiredRoles: ['OWNER_ADMIN', 'FOREMAN']
})(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const validatedData = createTransferSchema.parse(body)

    // Get user ID from token
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userPayload = verifyToken(token)
    const userId = userPayload.id

    // Verify source and dest are different
    if (validatedData.sourceLocationId === validatedData.destLocationId) {
      return NextResponse.json(
        { error: 'Source and destination locations must be different' },
        { status: 400 }
      )
    }

    // Check stock availability at source location
    for (const item of validatedData.items) {
      const stockCheck = await query(
        `SELECT COALESCE(quantity, 0) as quantity
         FROM "MaterialLocationStock"
         WHERE "materialId" = $1 AND "storageLocationId" = $2`,
        [item.materialId, validatedData.sourceLocationId]
      )

      const available = parseFloat(stockCheck.rows[0]?.quantity || '0')
      if (available < item.quantityRequested) {
        const materialResult = await query(
          `SELECT name FROM "Material" WHERE id = $1`,
          [item.materialId]
        )
        return NextResponse.json(
          { 
            error: `Insufficient stock for ${materialResult.rows[0]?.name || 'material'}. Available: ${available}, Requested: ${item.quantityRequested}` 
          },
          { status: 400 }
        )
      }
    }

    // Generate transfer number
    const transferNumberResult = await query(
      `SELECT generate_transfer_number() as number`
    )
    const transferNumber = transferNumberResult.rows[0].number

    // Create transfer
    const transferResult = await query(
      `INSERT INTO "StockTransfer" 
        ("transferNumber", "sourceLocationId", "destLocationId", "createdBy", notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        transferNumber,
        validatedData.sourceLocationId,
        validatedData.destLocationId,
        userId,
        validatedData.notes || null,
      ]
    )

    const transfer = transferResult.rows[0]

    // Create transfer items
    for (const item of validatedData.items) {
      await query(
        `INSERT INTO "StockTransferItem" 
          ("transferId", "materialId", "quantityRequested")
         VALUES ($1, $2, $3)`,
        [transfer.id, item.materialId, item.quantityRequested]
      )
    }

    // Fetch complete transfer with items
    const completeTransferResult = await query(
      `SELECT 
        st.*,
        sl_source.name as "sourceLocationName",
        sl_source.code as "sourceLocationCode",
        sl_dest.name as "destLocationName",
        sl_dest.code as "destLocationCode"
      FROM "StockTransfer" st
      LEFT JOIN "StorageLocation" sl_source ON st."sourceLocationId" = sl_source.id
      LEFT JOIN "StorageLocation" sl_dest ON st."destLocationId" = sl_dest.id
      WHERE st.id = $1`,
      [transfer.id]
    )

    const itemsResult = await query(
      `SELECT 
        sti.*,
        m.code as "materialCode",
        m.name as "materialName",
        m.unit as "materialUnit"
      FROM "StockTransferItem" sti
      LEFT JOIN "Material" m ON sti."materialId" = m.id
      WHERE sti."transferId" = $1`,
      [transfer.id]
    )

    const completeTransfer = completeTransferResult.rows[0]

    return NextResponse.json({
      id: completeTransfer.id,
      transferNumber: completeTransfer.transferNumber,
      sourceLocation: {
        id: completeTransfer.sourceLocationId,
        name: completeTransfer.sourceLocationName,
        code: completeTransfer.sourceLocationCode,
      },
      destLocation: {
        id: completeTransfer.destLocationId,
        name: completeTransfer.destLocationName,
        code: completeTransfer.destLocationCode,
      },
      status: completeTransfer.status,
      transferDate: completeTransfer.transferDate,
      notes: completeTransfer.notes,
      items: itemsResult.rows.map(item => ({
        id: item.id,
        material: {
          id: item.materialId,
          code: item.materialCode,
          name: item.materialName,
          unit: item.materialUnit,
        },
        quantityRequested: parseFloat(item.quantityRequested),
        quantityTransferred: parseFloat(item.quantityTransferred || 0),
      })),
      createdAt: completeTransfer.createdAt,
      updatedAt: completeTransfer.updatedAt,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating transfer:', error)
    return NextResponse.json(
      { error: 'Failed to create transfer' },
      { status: 500 }
    )
  }
})
