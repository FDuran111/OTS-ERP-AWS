import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const threshold = parseFloat(searchParams.get('threshold') || '100') // Default 100% means at or below minStock
    const limit = parseInt(searchParams.get('limit') || '50')

    // Query for materials that are at or below their minimum stock levels
    const result = await query(
      `SELECT 
        id,
        code,
        name,
        "inStock",
        "minStock",
        unit,
        category,
        manufacturer,
        cost,
        CASE 
          WHEN "minStock" > 0 THEN ("inStock" / "minStock") * 100
          ELSE 
            CASE 
              WHEN "inStock" = 0 THEN 0
              ELSE 100
            END
        END as "stockPercentage"
      FROM "Material"
      WHERE 
        active = TRUE AND
        (
          ("minStock" > 0 AND "inStock" <= ("minStock" * ($1 / 100))) OR
          ("minStock" = 0 AND "inStock" = 0)
        )
      ORDER BY 
        CASE 
          WHEN "minStock" > 0 THEN ("inStock" / "minStock") * 100
          ELSE 0
        END ASC,
        "inStock" ASC
      LIMIT $2`,
      [threshold, limit]
    )

    const items = result.rows.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      inStock: parseFloat(row.inStock || 0),
      minStock: parseFloat(row.minStock || 0),
      unit: row.unit,
      category: row.category,
      manufacturer: row.manufacturer,
      cost: parseFloat(row.cost || 0),
      stockPercentage: parseFloat(row.stockPercentage || 0)
    }))

    // Categorize items by urgency
    const critical = items.filter(item => item.stockPercentage <= 25)
    const urgent = items.filter(item => item.stockPercentage > 25 && item.stockPercentage <= 50)
    const low = items.filter(item => item.stockPercentage > 50 && item.stockPercentage <= 100)

    return NextResponse.json({
      items,
      summary: {
        total: items.length,
        critical: critical.length,
        urgent: urgent.length,
        low: low.length
      },
      categories: {
        critical,
        urgent,
        low
      }
    })
  } catch (error) {
    console.error('Error fetching low stock items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch low stock items' },
      { status: 500 }
    )
  }
}