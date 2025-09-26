import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const reservationSchema = z.object({
  jobId: z.string(),
  materialId: z.string(),
  phaseId: z.string().optional(),
  userId: z.string().optional(),
  quantityReserved: z.number().positive(),
  neededBy: z.string().optional(),
  expiresAt: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  notes: z.string().optional(),
})

// GET /api/reservations - List all reservations with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    const materialId = searchParams.get('materialId')
    const status = searchParams.get('status') || 'ACTIVE'
    const includeExpired = searchParams.get('includeExpired') === 'true'

    let whereClause = 'WHERE 1=1'
    const params: any[] = []
    let paramIndex = 1

    if (jobId) {
      whereClause += ` AND mr."jobId" = $${paramIndex}`
      params.push(jobId)
      paramIndex++
    }

    if (materialId) {
      whereClause += ` AND mr."materialId" = $${paramIndex}`
      params.push(materialId)
      paramIndex++
    }

    if (status !== 'ALL') {
      whereClause += ` AND mr.status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    if (!includeExpired) {
      whereClause += ` AND (mr."expiresAt" IS NULL OR mr."expiresAt" > NOW())`
    }

    const result = await query(`
      SELECT 
        mr.*,
        m.code as "materialCode",
        m.name as "materialName",
        m.unit as "materialUnit",
        m.cost as "materialCost",
        m."inStock" as "materialInStock",
        j."jobNumber" as "jobNumber",
        j.description as "jobTitle",
        c."companyName" as "customerName",
        jp.name as "phaseName",
        u.name as "userName",
        -- Calculate remaining quantity to reserve
        (mr."quantityReserved" - COALESCE(mr."fulfilledQuantity", 0)) as "remainingQuantity",
        -- Check if material has sufficient stock
        ma."availableQuantity" as "availableStock",
        ma."reservedQuantity" as "totalReserved"
      FROM "MaterialReservation" mr
      INNER JOIN "Material" m ON mr."materialId" = m.id
      INNER JOIN "Job" j ON mr."jobId" = j.id
      INNER JOIN "Customer" c ON j."customerId" = c.id
      LEFT JOIN "JobPhase" jp ON mr."phaseId" = jp.id
      LEFT JOIN "User" u ON mr."userId" = u.id
      LEFT JOIN "MaterialAvailability" ma ON mr."materialId" = ma.id
      ${whereClause}
      ORDER BY 
        CASE mr.priority 
          WHEN 'URGENT' THEN 1
          WHEN 'HIGH' THEN 2
          WHEN 'MEDIUM' THEN 3
          WHEN 'LOW' THEN 4
        END,
        mr."neededBy" ASC NULLS LAST,
        mr."reservedAt" DESC
    `, params)

    const reservations = result.rows.map(row => ({
      id: row.id,
      jobId: row.jobId,
      jobNumber: row.jobNumber,
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
    }))

    return NextResponse.json(reservations)
  } catch (error) {
    console.error('Error fetching reservations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reservations' },
      { status: 500 }
    )
  }
}

// POST /api/reservations - Create new reservation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = reservationSchema.parse(body)

    // Check if sufficient stock is available
    const availabilityCheck = await query(
      'SELECT check_material_availability($1, $2) as available',
      [data.materialId, data.quantityReserved]
    )

    if (!availabilityCheck.rows[0].available) {
      // Get current availability info for error message
      const stockInfo = await query(
        'SELECT "totalQuantity", "reservedQuantity", "availableQuantity" FROM "MaterialAvailability" WHERE id = $1',
        [data.materialId]
      )

      const stock = stockInfo.rows[0]
      return NextResponse.json(
        {
          error: 'Insufficient stock available',
          details: {
            requested: data.quantityReserved,
            totalStock: parseFloat(stock?.totalQuantity || 0),
            reserved: parseFloat(stock?.reservedQuantity || 0),
            available: parseFloat(stock?.availableQuantity || 0)
          }
        },
        { status: 400 }
      )
    }

    // Create the reservation
    const result = await query(`
      INSERT INTO "MaterialReservation" (
        "jobId", "materialId", "phaseId", "userId",
        "quantityReserved", "neededBy", "expiresAt", 
        priority, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      data.jobId,
      data.materialId,
      data.phaseId || null,
      data.userId || null,
      data.quantityReserved,
      data.neededBy ? new Date(data.neededBy) : null,
      data.expiresAt ? new Date(data.expiresAt) : null,
      data.priority,
      data.notes || null
    ])

    const reservation = result.rows[0]

    // Return the created reservation with material details
    const detailedResult = await query(`
      SELECT 
        mr.*,
        m.code as "materialCode",
        m.name as "materialName",
        m.unit as "materialUnit",
        j."jobNumber" as "jobNumber",
        j.description as "jobTitle"
      FROM "MaterialReservation" mr
      INNER JOIN "Material" m ON mr."materialId" = m.id
      INNER JOIN "Job" j ON mr."jobId" = j.id
      WHERE mr.id = $1
    `, [reservation.id])

    return NextResponse.json(detailedResult.rows[0], { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating reservation:', error)
    return NextResponse.json(
      { error: 'Failed to create reservation' },
      { status: 500 }
    )
  }
}