import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const materialId = searchParams.get('materialId')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    let whereClause = 'WHERE 1=1'
    let queryParams: any[] = []
    let paramCount = 1

    if (materialId) {
      whereClause += ` AND sm."materialId" = $${paramCount}`
      queryParams.push(materialId)
      paramCount++
    }

    if (type) {
      whereClause += ` AND sm.type = $${paramCount}`
      queryParams.push(type)
      paramCount++
    }

    if (dateFrom) {
      whereClause += ` AND sm."createdAt" >= $${paramCount}`
      queryParams.push(new Date(dateFrom))
      paramCount++
    }

    if (dateTo) {
      whereClause += ` AND sm."createdAt" <= $${paramCount}`
      queryParams.push(new Date(dateTo))
      paramCount++
    }

    // Get total count for pagination
    const countResult = await query(
      `SELECT COUNT(*) as total FROM "StockMovement" sm ${whereClause}`,
      queryParams
    )
    const total = parseInt(countResult.rows[0].total)

    // Get movements with enriched data
    queryParams.push(limit, offset)
    const movementsResult = await query(
      `SELECT 
        sm.*,
        m.code as "materialCode",
        m.name as "materialName", 
        m.unit as "materialUnit",
        sl.name as "locationName",
        u.name as "userName",
        j."jobNumber"
      FROM "StockMovement" sm
      LEFT JOIN "Material" m ON sm."materialId" = m.id
      LEFT JOIN "StorageLocation" sl ON sm."storageLocationId" = sl.id
      LEFT JOIN "User" u ON sm."userId" = u.id
      LEFT JOIN "Job" j ON sm."jobId" = j.id
      ${whereClause}
      ORDER BY sm."createdAt" DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      queryParams
    )

    const movements = movementsResult.rows.map(row => ({
      id: row.id,
      materialId: row.materialId,
      materialCode: row.materialCode,
      materialName: row.materialName,
      materialUnit: row.materialUnit,
      storageLocationId: row.storageLocationId,
      locationName: row.locationName,
      jobId: row.jobId,
      jobNumber: row.jobNumber,
      userId: row.userId,
      userName: row.userName,
      type: row.type,
      quantityBefore: parseFloat(row.quantityBefore || 0),
      quantityChanged: parseFloat(row.quantityChanged || 0),
      quantityAfter: parseFloat(row.quantityAfter || 0),
      unitCost: row.unitCost ? parseFloat(row.unitCost) : null,
      totalValue: row.totalValue ? parseFloat(row.totalValue) : null,
      reason: row.reason,
      referenceNumber: row.referenceNumber,
      metadata: row.metadata,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }))

    return NextResponse.json({
      movements,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit),
        currentPage: Math.floor(offset / limit) + 1
      }
    })
  } catch (error) {
    console.error('Error fetching stock movements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock movements' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      materialId,
      storageLocationId,
      jobId,
      userId,
      type,
      quantityChanged,
      unitCost,
      reason,
      referenceNumber,
      metadata
    } = await request.json()

    if (!materialId || !type || quantityChanged === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: materialId, type, quantityChanged' },
        { status: 400 }
      )
    }

    // Get current material stock
    const materialResult = await query(
      'SELECT "inStock", cost FROM "Material" WHERE id = $1',
      [materialId]
    )

    if (materialResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Material not found' },
        { status: 404 }
      )
    }

    const material = materialResult.rows[0]
    const quantityBefore = parseFloat(material.inStock || 0)
    const quantityAfter = Math.max(0, quantityBefore + parseFloat(quantityChanged))
    const costPerUnit = unitCost || material.cost || 0
    const totalValue = Math.abs(parseFloat(quantityChanged)) * costPerUnit

    // Start transaction
    await query('BEGIN')

    try {
      // Update material stock
      await query(
        'UPDATE "Material" SET "inStock" = $1, "updatedAt" = NOW() WHERE id = $2',
        [quantityAfter, materialId]
      )

      // Create stock movement record
      const result = await query(
        `INSERT INTO "StockMovement" (
          "materialId", "storageLocationId", "jobId", "userId",
          type, "quantityBefore", "quantityChanged", "quantityAfter",
          "unitCost", "totalValue", reason, "referenceNumber", metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          materialId, storageLocationId, jobId, userId,
          type, quantityBefore, quantityChanged, quantityAfter,
          costPerUnit, totalValue, reason, referenceNumber, metadata
        ]
      )

      await query('COMMIT')

      return NextResponse.json(result.rows[0], { status: 201 })
    } catch (error) {
      await query('ROLLBACK')
      throw error
    }
  } catch (error) {
    console.error('Error creating stock movement:', error)
    return NextResponse.json(
      { error: 'Failed to create stock movement' },
      { status: 500 }
    )
  }
}