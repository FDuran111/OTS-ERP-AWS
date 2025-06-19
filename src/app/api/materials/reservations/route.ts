import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET material reservations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const materialId = searchParams.get('materialId')
    const jobId = searchParams.get('jobId')
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')
    const includeCompleted = searchParams.get('includeCompleted') === 'true'

    // Build WHERE conditions
    const conditions = []
    const params = []
    let paramIndex = 1

    if (materialId) {
      conditions.push(`mr."materialId" = $${paramIndex}`)
      params.push(materialId)
      paramIndex++
    }

    if (jobId) {
      conditions.push(`mr."jobId" = $${paramIndex}`)
      params.push(jobId)
      paramIndex++
    }

    if (userId) {
      conditions.push(`mr."userId" = $${paramIndex}`)
      params.push(userId)
      paramIndex++
    }

    if (status) {
      conditions.push(`mr.status = $${paramIndex}`)
      params.push(status)
      paramIndex++
    } else if (!includeCompleted) {
      // By default, exclude completed/cancelled reservations
      conditions.push(`mr.status IN ('ACTIVE', 'PARTIAL')`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const reservationsResult = await query(`
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
      ${whereClause}
      ORDER BY mr."createdAt" DESC
    `, params)

    // Transform the data to include nested objects
    const reservations = reservationsResult.rows.map(row => ({
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
    }))

    return NextResponse.json(reservations)
  } catch (error) {
    console.error('Error fetching material reservations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch material reservations' },
      { status: 500 }
    )
  }
}

// POST new material reservation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      materialId,
      jobId,
      userId,
      quantityReserved,
      reservationDate,
      needByDate,
      priority = 'MEDIUM',
      notes,
      status = 'ACTIVE'
    } = body

    // Validate required fields
    if (!materialId || !quantityReserved || !reservationDate || !needByDate) {
      return NextResponse.json(
        { error: 'Missing required fields: materialId, quantityReserved, reservationDate, needByDate' },
        { status: 400 }
      )
    }

    if (!jobId && !userId) {
      return NextResponse.json(
        { error: 'Either jobId or userId must be provided' },
        { status: 400 }
      )
    }

    if (quantityReserved <= 0) {
      return NextResponse.json(
        { error: 'Quantity reserved must be greater than 0' },
        { status: 400 }
      )
    }

    // Check material availability
    const materialResult = await query(
      'SELECT "inStock", (SELECT COALESCE(SUM("quantityReserved" - COALESCE("fulfilledQuantity", 0)), 0) FROM "MaterialReservation" WHERE "materialId" = $1 AND status = \'ACTIVE\') as "totalReserved" FROM "Material" WHERE id = $1',
      [materialId]
    )

    if (materialResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Material not found' },
        { status: 404 }
      )
    }

    const material = materialResult.rows[0]
    const availableStock = material.inStock - material.totalReserved

    if (quantityReserved > availableStock) {
      return NextResponse.json(
        { error: `Insufficient stock. Available: ${availableStock}, Requested: ${quantityReserved}` },
        { status: 400 }
      )
    }

    // Create the reservation
    const insertResult = await query(`
      INSERT INTO "MaterialReservation" 
      ("materialId", "jobId", "userId", "quantityReserved", "fulfilledQuantity", "reservationDate", "needByDate", "status", "priority", "notes", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, 0, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `, [
      materialId,
      jobId || null,
      userId || null,
      quantityReserved,
      reservationDate,
      needByDate,
      status,
      priority,
      notes || null
    ])

    const reservation = insertResult.rows[0]

    // Get the full reservation data with related information
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
    `, [reservation.id])

    const fullReservation = fullReservationResult.rows[0]

    const responseData = {
      id: fullReservation.id,
      materialId: fullReservation.materialId,
      jobId: fullReservation.jobId,
      userId: fullReservation.userId,
      quantityReserved: fullReservation.quantityReserved,
      fulfilledQuantity: fullReservation.fulfilledQuantity,
      reservationDate: fullReservation.reservationDate,
      needByDate: fullReservation.needByDate,
      status: fullReservation.status,
      priority: fullReservation.priority,
      notes: fullReservation.notes,
      createdAt: fullReservation.createdAt,
      updatedAt: fullReservation.updatedAt,
      material: {
        code: fullReservation.materialCode,
        name: fullReservation.materialName,
        unit: fullReservation.materialUnit,
        category: fullReservation.materialCategory
      },
      job: fullReservation.jobId ? {
        jobNumber: fullReservation.jobNumber,
        title: fullReservation.jobTitle,
        customer: fullReservation.jobCustomer
      } : null,
      user: fullReservation.userId ? {
        name: fullReservation.userName,
        email: fullReservation.userEmail,
        role: fullReservation.userRole
      } : null
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Error creating material reservation:', error)
    return NextResponse.json(
      { error: 'Failed to create material reservation' },
      { status: 500 }
    )
  }
}