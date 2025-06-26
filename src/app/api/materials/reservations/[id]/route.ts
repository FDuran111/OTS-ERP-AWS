import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET specific material reservation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const reservationResult = await query(`
      SELECT 
        mr.*,
        m.code as "materialCode",
        m.name as "materialName",
        m.unit as "materialUnit",
        m.category as "materialCategory",
        j."jobNumber",
        j.title as "jobTitle",
        COALESCE(c."companyName", CONCAT(c."firstName", ' ', c."lastName")) as "jobCustomer",
        u.name as "userName",
        u.email as "userEmail",
        u.role as "userRole"
      FROM "MaterialReservation" mr
      LEFT JOIN "Material" m ON mr."materialId" = m.id
      LEFT JOIN "Job" j ON mr."jobId" = j.id
      LEFT JOIN "Customer" c ON j."customerId" = c.id
      LEFT JOIN "User" u ON mr."userId" = u.id
      WHERE mr.id = $1
    `, [resolvedParams.id])

    if (reservationResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      )
    }

    const row = reservationResult.rows[0]
    const reservation = {
      id: row.id,
      materialId: row.materialId,
      jobId: row.jobId,
      userId: row.userId,
      quantityReserved: row.quantityReserved,
      fulfilledQuantity: row.fulfilledQuantity,
      reservationDate: row.reservationDate,
      needByDate: row.needByDate,
      status: row.status,
      priority: row.priority,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      material: {
        code: row.materialCode,
        name: row.materialName,
        unit: row.materialUnit,
        category: row.materialCategory
      },
      job: row.jobId ? {
        jobNumber: row.jobNumber,
        title: row.jobTitle,
        customer: row.jobCustomer
      } : null,
      user: row.userId ? {
        name: row.userName,
        email: row.userEmail,
        role: row.userRole
      } : null
    }

    return NextResponse.json(reservation)
  } catch (error) {
    console.error('Error fetching material reservation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch material reservation' },
      { status: 500 }
    )
  }
}

// PUT update material reservation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const body = await request.json()
    const {
      quantityReserved,
      fulfilledQuantity,
      reservationDate,
      needByDate,
      status,
      priority,
      notes
    } = body

    // Get current reservation to validate changes
    const currentResult = await query(
      'SELECT * FROM "MaterialReservation" WHERE id = $1',
      [resolvedParams.id]
    )

    if (currentResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      )
    }

    const currentReservation = currentResult.rows[0]

    // If updating quantity, check availability
    if (quantityReserved && quantityReserved !== currentReservation.quantityReserved) {
      const materialResult = await query(
        'SELECT "inStock", (SELECT COALESCE(SUM("quantityReserved" - COALESCE("fulfilledQuantity", 0)), 0) FROM "MaterialReservation" WHERE "materialId" = $1 AND status = \'ACTIVE\' AND id != $2) as "otherReserved" FROM "Material" WHERE id = $1',
        [currentReservation.materialId, resolvedParams.id]
      )

      if (materialResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Material not found' },
          { status: 404 }
        )
      }

      const material = materialResult.rows[0]
      const availableStock = material.inStock - material.otherReserved

      if (quantityReserved > availableStock) {
        return NextResponse.json(
          { error: `Insufficient stock. Available: ${availableStock}, Requested: ${quantityReserved}` },
          { status: 400 }
        )
      }
    }

    // Build update query dynamically
    const updateFields = []
    const updateParams = []
    let paramIndex = 1

    if (quantityReserved !== undefined) {
      updateFields.push(`"quantityReserved" = $${paramIndex}`)
      updateParams.push(quantityReserved)
      paramIndex++
    }

    if (fulfilledQuantity !== undefined) {
      updateFields.push(`"fulfilledQuantity" = $${paramIndex}`)
      updateParams.push(fulfilledQuantity)
      paramIndex++
    }

    if (reservationDate !== undefined) {
      updateFields.push(`"reservationDate" = $${paramIndex}`)
      updateParams.push(reservationDate)
      paramIndex++
    }

    if (needByDate !== undefined) {
      updateFields.push(`"needByDate" = $${paramIndex}`)
      updateParams.push(needByDate)
      paramIndex++
    }

    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex}`)
      updateParams.push(status)
      paramIndex++
    }

    if (priority !== undefined) {
      updateFields.push(`priority = $${paramIndex}`)
      updateParams.push(priority)
      paramIndex++
    }

    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`)
      updateParams.push(notes || null)
      paramIndex++
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Add updatedAt and id parameters
    updateFields.push(`"updatedAt" = NOW()`)
    updateParams.push(resolvedParams.id)

    const updateQuery = `
      UPDATE "MaterialReservation" 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const updateResult = await query(updateQuery, updateParams)
    
    // Get the full updated reservation data
    const fullReservationResult = await query(`
      SELECT 
        mr.*,
        m.code as "materialCode",
        m.name as "materialName",
        m.unit as "materialUnit",
        m.category as "materialCategory",
        j."jobNumber",
        j.title as "jobTitle",
        COALESCE(c."companyName", CONCAT(c."firstName", ' ', c."lastName")) as "jobCustomer",
        u.name as "userName",
        u.email as "userEmail",
        u.role as "userRole"
      FROM "MaterialReservation" mr
      LEFT JOIN "Material" m ON mr."materialId" = m.id
      LEFT JOIN "Job" j ON mr."jobId" = j.id
      LEFT JOIN "Customer" c ON j."customerId" = c.id
      LEFT JOIN "User" u ON mr."userId" = u.id
      WHERE mr.id = $1
    `, [resolvedParams.id])

    const row = fullReservationResult.rows[0]
    const updatedReservation = {
      id: row.id,
      materialId: row.materialId,
      jobId: row.jobId,
      userId: row.userId,
      quantityReserved: row.quantityReserved,
      fulfilledQuantity: row.fulfilledQuantity,
      reservationDate: row.reservationDate,
      needByDate: row.needByDate,
      status: row.status,
      priority: row.priority,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      material: {
        code: row.materialCode,
        name: row.materialName,
        unit: row.materialUnit,
        category: row.materialCategory
      },
      job: row.jobId ? {
        jobNumber: row.jobNumber,
        title: row.jobTitle,
        customer: row.jobCustomer
      } : null,
      user: row.userId ? {
        name: row.userName,
        email: row.userEmail,
        role: row.userRole
      } : null
    }

    return NextResponse.json(updatedReservation)
  } catch (error) {
    console.error('Error updating material reservation:', error)
    return NextResponse.json(
      { error: 'Failed to update material reservation' },
      { status: 500 }
    )
  }
}

// DELETE material reservation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const deleteResult = await query(
      'DELETE FROM "MaterialReservation" WHERE id = $1 RETURNING *',
      [resolvedParams.id]
    )

    if (deleteResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting material reservation:', error)
    return NextResponse.json(
      { error: 'Failed to delete material reservation' },
      { status: 500 }
    )
  }
}