import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const fulfillReservationSchema = z.object({
  quantityFulfilled: z.number().positive(),
  userId: z.string().optional(),
  notes: z.string().optional(),
})

// POST /api/reservations/[id]/fulfill - Fulfill a reservation (consume materials)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const body = await request.json()
    const data = fulfillReservationSchema.parse(body)

    // Start transaction
    await query('BEGIN')

    try {
      // Get reservation details
      const reservationResult = await query(`
        SELECT 
          mr.*,
          m.cost as "materialCost",
          m."inStock" as "materialInStock"
        FROM "MaterialReservation" mr
        INNER JOIN "Material" m ON mr."materialId" = m.id
        WHERE mr.id = $1 AND mr.status = 'ACTIVE'
      `, [resolvedParams.id])

      if (reservationResult.rows.length === 0) {
        await query('ROLLBACK')
        return NextResponse.json(
          { error: 'Reservation not found or not active' },
          { status: 404 }
        )
      }

      const reservation = reservationResult.rows[0]
      const remainingToFulfill = parseFloat(reservation.quantityReserved) - parseFloat(reservation.fulfilledQuantity || 0)

      // Validate quantity
      if (data.quantityFulfilled > remainingToFulfill) {
        await query('ROLLBACK')
        return NextResponse.json(
          { 
            error: 'Cannot fulfill more than remaining quantity',
            remaining: remainingToFulfill,
            requested: data.quantityFulfilled
          },
          { status: 400 }
        )
      }

      // Check if material has sufficient stock
      if (parseFloat(reservation.materialInStock) < data.quantityFulfilled) {
        await query('ROLLBACK')
        return NextResponse.json(
          { 
            error: 'Insufficient material stock',
            available: parseFloat(reservation.materialInStock),
            requested: data.quantityFulfilled
          },
          { status: 400 }
        )
      }

      // Calculate costs
      const unitCost = parseFloat(reservation.materialCost || 0)
      const totalCost = data.quantityFulfilled * unitCost

      // Create material usage record
      await query(`
        INSERT INTO "MaterialUsage" (
          "jobId", "materialId", "phaseId", "userId",
          "quantity", "unitCost", "totalCost", "usedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [
        reservation.jobId,
        reservation.materialId,
        reservation.phaseId,
        data.userId || reservation.userId,
        data.quantityFulfilled,
        unitCost,
        totalCost
      ])

      // Update material stock
      const newStock = parseFloat(reservation.materialInStock) - data.quantityFulfilled
      await query(
        'UPDATE "Material" SET "inStock" = $1, "updatedAt" = NOW() WHERE id = $2',
        [newStock, reservation.materialId]
      )

      // Create stock movement record
      await query(`
        INSERT INTO "StockMovement" (
          "materialId", "jobId", "userId", type,
          "quantityBefore", "quantityChanged", "quantityAfter",
          "unitCost", "totalValue", reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        reservation.materialId,
        reservation.jobId,
        data.userId || reservation.userId,
        'RESERVATION_FULFILLED',
        parseFloat(reservation.materialInStock),
        -data.quantityFulfilled,
        newStock,
        unitCost,
        totalCost,
        `Material reservation fulfilled: ${data.notes || 'No notes'}`
      ])

      // Update reservation fulfillment
      const newFulfilledQuantity = parseFloat(reservation.fulfilledQuantity || 0) + data.quantityFulfilled
      const isFullyFulfilled = newFulfilledQuantity >= parseFloat(reservation.quantityReserved)

      await query(`
        UPDATE "MaterialReservation" 
        SET 
          "fulfilledQuantity" = $1,
          status = $2,
          "fulfilledAt" = CASE WHEN $3 THEN NOW() ELSE "fulfilledAt" END,
          "updatedAt" = NOW()
        WHERE id = $4
      `, [
        newFulfilledQuantity,
        isFullyFulfilled ? 'FULFILLED' : 'ACTIVE',
        isFullyFulfilled,
        resolvedParams.id
      ])

      await query('COMMIT')

      // Return updated reservation details
      const updatedResult = await query(`
        SELECT 
          mr.*,
          m.code as "materialCode",
          m.name as "materialName",
          m.unit as "materialUnit",
          m."inStock" as "materialInStock",
          j.title as "jobTitle",
          (mr."quantityReserved" - mr."fulfilledQuantity") as "remainingQuantity"
        FROM "MaterialReservation" mr
        INNER JOIN "Material" m ON mr."materialId" = m.id
        INNER JOIN "Job" j ON mr."jobId" = j.id
        WHERE mr.id = $1
      `, [resolvedParams.id])

      return NextResponse.json({
        message: isFullyFulfilled ? 'Reservation fully fulfilled' : 'Reservation partially fulfilled',
        reservation: updatedResult.rows[0],
        fulfillment: {
          quantityFulfilled: data.quantityFulfilled,
          totalCost,
          remainingStock: newStock
        }
      })

    } catch (error) {
      await query('ROLLBACK')
      throw error
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error fulfilling reservation:', error)
    return NextResponse.json(
      { error: 'Failed to fulfill reservation' },
      { status: 500 }
    )
  }
}