import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const updateReservationSchema = z.object({
  quantityReserved: z.number().positive().optional(),
  neededBy: z.string().optional(),
  expiresAt: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  notes: z.string().optional(),
  status: z.enum(['ACTIVE', 'FULFILLED', 'EXPIRED', 'CANCELLED']).optional(),
  fulfilledQuantity: z.number().min(0).optional(),
})

// GET /api/reservations/[id] - Get specific reservation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const result = await query(`
      SELECT 
        mr.*,
        m.code as "materialCode",
        m.name as "materialName",
        m.unit as "materialUnit",
        m.cost as "materialCost",
        m."inStock" as "materialInStock",
        j.title as "jobTitle",
        j."customerName",
        jp.name as "phaseName",
        u.name as "userName",
        ma.available_stock as "availableStock",
        ma.total_reserved as "totalReserved",
        (mr."quantityReserved" - COALESCE(mr."fulfilledQuantity", 0)) as "remainingQuantity"
      FROM "MaterialReservation" mr
      INNER JOIN "Material" m ON mr."materialId" = m.id
      INNER JOIN "Job" j ON mr."jobId" = j.id
      LEFT JOIN "JobPhase" jp ON mr."phaseId" = jp.id
      LEFT JOIN "User" u ON mr."userId" = u.id
      LEFT JOIN "MaterialAvailability" ma ON mr."materialId" = ma.id
      WHERE mr.id = $1
    `, [resolvedParams.id])

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      )
    }

    const row = result.rows[0]
    const reservation = {
      id: row.id,
      jobId: row.jobId,
      jobTitle: row.jobTitle,
      customerName: row.customerName,
      materialId: row.materialId,
      materialCode: row.materialCode,
      materialName: row.materialName,
      materialUnit: row.materialUnit,
      materialCost: parseFloat(row.materialCost || 0),
      materialInStock: parseFloat(row.materialInStock || 0),
      availableStock: parseFloat(row.availableStock || 0),
      totalReserved: parseFloat(row.totalReserved || 0),
      phaseId: row.phaseId,
      phaseName: row.phaseName,
      userId: row.userId,
      userName: row.userName,
      quantityReserved: parseFloat(row.quantityReserved),
      remainingQuantity: parseFloat(row.remainingQuantity || 0),
      fulfilledQuantity: parseFloat(row.fulfilledQuantity || 0),
      reservedAt: row.reservedAt,
      neededBy: row.neededBy,
      expiresAt: row.expiresAt,
      status: row.status,
      fulfilledAt: row.fulfilledAt,
      priority: row.priority,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }

    return NextResponse.json(reservation)
  } catch (error) {
    console.error('Error fetching reservation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reservation' },
      { status: 500 }
    )
  }
}

// PUT /api/reservations/[id] - Update reservation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const body = await request.json()
    const data = updateReservationSchema.parse(body)

    // If updating quantity, check availability
    if (data.quantityReserved !== undefined) {
      const availabilityCheck = await query(
        'SELECT check_material_availability($1, $2, $3) as available',
        [
          (await query('SELECT "materialId" FROM "MaterialReservation" WHERE id = $1', [resolvedParams.id])).rows[0]?.materialId,
          data.quantityReserved,
          resolvedParams.id
        ]
      )

      if (!availabilityCheck.rows[0].available) {
        return NextResponse.json(
          { error: 'Insufficient stock available for updated quantity' },
          { status: 400 }
        )
      }
    }

    // Build update query dynamically
    const updateFields: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (data.quantityReserved !== undefined) {
      updateFields.push(`"quantityReserved" = $${paramIndex}`)
      values.push(data.quantityReserved)
      paramIndex++
    }

    if (data.neededBy !== undefined) {
      updateFields.push(`"neededBy" = $${paramIndex}`)
      values.push(data.neededBy ? new Date(data.neededBy) : null)
      paramIndex++
    }

    if (data.expiresAt !== undefined) {
      updateFields.push(`"expiresAt" = $${paramIndex}`)
      values.push(data.expiresAt ? new Date(data.expiresAt) : null)
      paramIndex++
    }

    if (data.priority !== undefined) {
      updateFields.push(`priority = $${paramIndex}`)
      values.push(data.priority)
      paramIndex++
    }

    if (data.notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`)
      values.push(data.notes)
      paramIndex++
    }

    if (data.status !== undefined) {
      updateFields.push(`status = $${paramIndex}`)
      values.push(data.status)
      paramIndex++

      // If marking as fulfilled, set fulfilled timestamp
      if (data.status === 'FULFILLED') {
        updateFields.push(`"fulfilledAt" = NOW()`)
      }
    }

    if (data.fulfilledQuantity !== undefined) {
      updateFields.push(`"fulfilledQuantity" = $${paramIndex}`)
      values.push(data.fulfilledQuantity)
      paramIndex++
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Add updated timestamp
    updateFields.push(`"updatedAt" = NOW()`)
    values.push(resolvedParams.id)

    const result = await query(`
      UPDATE "MaterialReservation" 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values)

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error updating reservation:', error)
    return NextResponse.json(
      { error: 'Failed to update reservation' },
      { status: 500 }
    )
  }
}

// DELETE /api/reservations/[id] - Cancel/delete reservation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const result = await query(
      'UPDATE "MaterialReservation" SET status = \'CANCELLED\', "updatedAt" = NOW() WHERE id = $1 RETURNING *',
      [resolvedParams.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'Reservation cancelled successfully' })
  } catch (error) {
    console.error('Error cancelling reservation:', error)
    return NextResponse.json(
      { error: 'Failed to cancel reservation' },
      { status: 500 }
    )
  }
}