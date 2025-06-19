import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET real-time material availability
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const materialId = searchParams.get('materialId')
    const criticalOnly = searchParams.get('criticalOnly') === 'true'
    const category = searchParams.get('category')

    // Build WHERE conditions
    const conditions = ['m.active = TRUE']
    const params = []
    let paramIndex = 1

    if (materialId) {
      conditions.push(`m.id = $${paramIndex}`)
      params.push(materialId)
      paramIndex++
    }

    if (category) {
      conditions.push(`m.category = $${paramIndex}`)
      params.push(category)
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Get material availability with real-time reservation calculations
    const availabilityResult = await query(`
      SELECT 
        m.id,
        m.code,
        m.name,
        m.unit,
        m."inStock",
        m."minStock",
        m.category,
        COALESCE(mr.total_reserved, 0) as "totalReserved",
        (m."inStock" - COALESCE(mr.total_reserved, 0)) as "availableStock"
      FROM "Material" m
      LEFT JOIN (
        SELECT 
          "materialId",
          SUM("quantityReserved" - COALESCE("fulfilledQuantity", 0)) as total_reserved
        FROM "MaterialReservation"
        WHERE status = 'ACTIVE'
        GROUP BY "materialId"
      ) mr ON m.id = mr."materialId"
      ${whereClause}
      ORDER BY 
        CASE 
          WHEN (m."inStock" - COALESCE(mr.total_reserved, 0)) <= 0 THEN 1
          WHEN m."inStock" <= m."minStock" THEN 2
          ELSE 3
        END,
        m.name ASC
    `, params)

    let materials = availabilityResult.rows.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      unit: row.unit,
      inStock: parseInt(row.inStock) || 0,
      minStock: parseInt(row.minStock) || 0,
      totalReserved: parseInt(row.totalReserved) || 0,
      availableStock: parseInt(row.availableStock) || 0,
      category: row.category
    }))

    // Filter critical items if requested
    if (criticalOnly) {
      materials = materials.filter(material => 
        material.availableStock <= 0 || 
        material.inStock <= material.minStock * 0.5
      )
    }

    return NextResponse.json(materials)
  } catch (error) {
    console.error('Error fetching material availability:', error)
    return NextResponse.json(
      { error: 'Failed to fetch material availability' },
      { status: 500 }
    )
  }
}