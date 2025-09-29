import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'
import { withRBAC } from '@/lib/rbac-middleware'
import { verifyToken } from '@/lib/auth'

const updateTransferSchema = z.object({
  status: z.enum(['PENDING', 'IN_TRANSIT']).optional(),
  notes: z.string().optional(),
})

// GET single transfer
export const GET = withRBAC({
  requiredRoles: ['OWNER_ADMIN', 'FOREMAN', 'EMPLOYEE']
})(async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const { id } = params

    // Get transfer with location and user details
    const transferResult = await query(
      `SELECT 
        st.*,
        sl_source.name as "sourceLocationName",
        sl_source.code as "sourceLocationCode",
        sl_dest.name as "destLocationName",
        sl_dest.code as "destLocationCode",
        u_created.name as "createdByName",
        u_approved.name as "approvedByName"
      FROM "StockTransfer" st
      LEFT JOIN "StorageLocation" sl_source ON st."sourceLocationId" = sl_source.id
      LEFT JOIN "StorageLocation" sl_dest ON st."destLocationId" = sl_dest.id
      LEFT JOIN "User" u_created ON st."createdBy" = u_created.id
      LEFT JOIN "User" u_approved ON st."approvedBy" = u_approved.id
      WHERE st.id = $1`,
      [id]
    )

    if (transferResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Transfer not found' },
        { status: 404 }
      )
    }

    // Get transfer items with material details and stock availability
    const itemsResult = await query(
      `SELECT 
        sti.*,
        m.code as "materialCode",
        m.name as "materialName",
        m.unit as "materialUnit",
        COALESCE(mls.quantity, 0) as "availableAtSource"
      FROM "StockTransferItem" sti
      LEFT JOIN "Material" m ON sti."materialId" = m.id
      LEFT JOIN "MaterialLocationStock" mls 
        ON sti."materialId" = mls."materialId" 
        AND mls."storageLocationId" = $2
      WHERE sti."transferId" = $1
      ORDER BY m.name`,
      [id, transferResult.rows[0].sourceLocationId]
    )

    const transfer = transferResult.rows[0]

    return NextResponse.json({
      id: transfer.id,
      transferNumber: transfer.transferNumber,
      sourceLocation: {
        id: transfer.sourceLocationId,
        name: transfer.sourceLocationName,
        code: transfer.sourceLocationCode,
      },
      destLocation: {
        id: transfer.destLocationId,
        name: transfer.destLocationName,
        code: transfer.destLocationCode,
      },
      status: transfer.status,
      transferDate: transfer.transferDate,
      completedDate: transfer.completedDate,
      notes: transfer.notes,
      createdBy: transfer.createdBy ? {
        id: transfer.createdBy,
        name: transfer.createdByName,
      } : null,
      approvedBy: transfer.approvedBy ? {
        id: transfer.approvedBy,
        name: transfer.approvedByName,
      } : null,
      approvedAt: transfer.approvedAt,
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
        availableAtSource: parseFloat(item.availableAtSource || 0),
      })),
      createdAt: transfer.createdAt,
      updatedAt: transfer.updatedAt,
    })
  } catch (error) {
    console.error('Error fetching transfer:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transfer' },
      { status: 500 }
    )
  }
})

// PATCH update transfer
export const PATCH = withRBAC({
  requiredRoles: ['OWNER_ADMIN', 'FOREMAN']
})(async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const { id } = params
    const body = await request.json()
    const validatedData = updateTransferSchema.parse(body)

    // Get user ID from token
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userPayload = verifyToken(token)
    const userId = userPayload.id

    // Check if transfer exists
    const existingTransfer = await query(
      `SELECT * FROM "StockTransfer" WHERE id = $1`,
      [id]
    )

    if (existingTransfer.rows.length === 0) {
      return NextResponse.json(
        { error: 'Transfer not found' },
        { status: 404 }
      )
    }

    const currentStatus = existingTransfer.rows[0].status

    // Prevent updates to completed or cancelled transfers
    if (currentStatus === 'COMPLETED' || currentStatus === 'CANCELLED') {
      return NextResponse.json(
        { error: `Cannot update ${currentStatus.toLowerCase()} transfer` },
        { status: 400 }
      )
    }

    // Only allow PENDING -> IN_TRANSIT transition via PATCH
    // Use POST /complete for COMPLETED and DELETE for CANCELLED
    if (validatedData.status && validatedData.status !== 'PENDING' && validatedData.status !== 'IN_TRANSIT') {
      return NextResponse.json(
        { error: 'Use POST /complete to complete transfer or DELETE to cancel' },
        { status: 400 }
      )
    }

    // Build update query dynamically
    const updates = []
    const values = []
    let paramIndex = 1

    if (validatedData.status !== undefined) {
      updates.push(`status = $${paramIndex}`)
      values.push(validatedData.status)
      paramIndex++

      // Set approved by and approved at if transitioning to IN_TRANSIT
      if (validatedData.status === 'IN_TRANSIT') {
        updates.push(`"approvedBy" = $${paramIndex}`)
        values.push(userId)
        paramIndex++
        updates.push(`"approvedAt" = NOW()`)
      }
    }

    if (validatedData.notes !== undefined) {
      updates.push(`notes = $${paramIndex}`)
      values.push(validatedData.notes)
      paramIndex++
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided' },
        { status: 400 }
      )
    }

    // Add transfer ID as last parameter
    values.push(id)

    // Update transfer
    const result = await query(
      `UPDATE "StockTransfer" 
       SET ${updates.join(', ')}, "updatedAt" = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    )

    return NextResponse.json(result.rows[0])
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating transfer:', error)
    return NextResponse.json(
      { error: 'Failed to update transfer' },
      { status: 500 }
    )
  }
})

// DELETE cancel transfer
export const DELETE = withRBAC({
  requiredRoles: ['OWNER_ADMIN', 'FOREMAN']
})(async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const { id } = params

    // Check if transfer exists
    const existingTransfer = await query(
      `SELECT * FROM "StockTransfer" WHERE id = $1`,
      [id]
    )

    if (existingTransfer.rows.length === 0) {
      return NextResponse.json(
        { error: 'Transfer not found' },
        { status: 404 }
      )
    }

    const currentStatus = existingTransfer.rows[0].status

    // Only allow cancelling pending or in-transit transfers
    if (currentStatus === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cannot cancel completed transfer' },
        { status: 400 }
      )
    }

    if (currentStatus === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Transfer already cancelled' },
        { status: 400 }
      )
    }

    // Update status to CANCELLED
    await query(
      `UPDATE "StockTransfer" 
       SET status = 'CANCELLED', "updatedAt" = NOW()
       WHERE id = $1`,
      [id]
    )

    return NextResponse.json({ message: 'Transfer cancelled successfully' })
  } catch (error) {
    console.error('Error cancelling transfer:', error)
    return NextResponse.json(
      { error: 'Failed to cancel transfer' },
      { status: 500 }
    )
  }
})
