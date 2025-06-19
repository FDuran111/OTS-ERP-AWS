import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET combined materials data (materials + stats in one request)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const lowStock = searchParams.get('lowStock') === 'true'

    // Build WHERE conditions for materials
    const conditions = ['m.active = TRUE']
    const params = []
    let paramIndex = 1

    if (search) {
      conditions.push(`(
        m.code ILIKE $${paramIndex} OR 
        m.name ILIKE $${paramIndex} OR 
        m.description ILIKE $${paramIndex}
      )`)
      params.push(`%${search}%`)
      paramIndex++
    }

    if (category) {
      conditions.push(`m.category = $${paramIndex}`)
      params.push(category)
      paramIndex++
    }

    if (lowStock) {
      conditions.push(`m."inStock" <= m."minStock"`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Execute all queries in parallel
    const [
      materialsResult,
      totalCountResult,
      lowStockCountResult,
      outOfStockCountResult,
      categoryBreakdownResult,
      reservationStatsResult
    ] = await Promise.all([
      // Get materials with reservation data
      query(
        `SELECT 
          m.*,
          ma.total_reserved,
          ma.available_stock
        FROM "Material" m
        LEFT JOIN "MaterialAvailability" ma ON m.id = ma.id
        ${whereClause} 
        ORDER BY name ASC`,
        params
      ),
      // Get total count
      query('SELECT COUNT(*) as count FROM "Material" WHERE active = TRUE'),
      // Get low stock count
      query('SELECT COUNT(*) as count FROM "Material" WHERE active = TRUE AND "inStock" <= "minStock"'),
      // Get out of stock count
      query('SELECT COUNT(*) as count FROM "Material" WHERE active = TRUE AND "inStock" = 0'),
      // Get category breakdown
      query(`
        SELECT 
          category, 
          COUNT(*) as count 
        FROM "Material" 
        WHERE active = TRUE 
        GROUP BY category 
        ORDER BY count DESC
      `),
      // Get reservation statistics
      query(`
        SELECT 
          COUNT(*) as "totalReservations",
          COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as "activeReservations",
          SUM(CASE WHEN status = 'ACTIVE' THEN "quantityReserved" - COALESCE("fulfilledQuantity", 0) ELSE 0 END) as "totalReservedQuantity"
        FROM "MaterialReservation"
      `)
    ])

    // Transform materials data
    const materials = materialsResult.rows.map(material => {
      const inStockNum = parseInt(material.inStock) || 0
      const minStockNum = parseInt(material.minStock) || 0
      const totalReserved = parseFloat(material.total_reserved) || 0
      const availableStock = parseFloat(material.available_stock) || 0
      
      const stockStatus = inStockNum === 0 
        ? 'Out of Stock' 
        : inStockNum <= minStockNum 
          ? 'Low Stock' 
          : 'In Stock'

      return {
        id: material.id,
        code: material.code,
        name: material.name,
        description: material.description || '',
        manufacturer: material.manufacturer || null,
        category: material.category,
        unit: material.unit,
        cost: parseFloat(material.cost) || 0,
        price: parseFloat(material.price) || 0,
        markup: parseFloat(material.markup) || 0,
        inStock: inStockNum,
        minStock: minStockNum,
        totalReserved: totalReserved,
        availableStock: availableStock,
        location: material.location || 'Not Set',
        vendor: material.vendorId ? {
          id: material.vendorId,
          name: 'Unknown Vendor',
          code: ''
        } : null,
        status: stockStatus,
        active: material.active === true || material.active === 'TRUE',
        stockLocations: [],
        createdAt: material.createdAt,
        updatedAt: material.updatedAt,
      }
    })

    // Build stats including reservation data
    const reservationData = reservationStatsResult.rows[0]
    const stats = [
      {
        title: 'Total Materials',
        value: totalCountResult.rows[0].count.toString(),
        icon: 'inventory',
        color: '#3498db',
      },
      {
        title: 'Low Stock Items',
        value: lowStockCountResult.rows[0].count.toString(),
        icon: 'warning',
        color: '#f1c40f',
      },
      {
        title: 'Out of Stock',
        value: outOfStockCountResult.rows[0].count.toString(),
        icon: 'error',
        color: '#e74c3c',
      },
      {
        title: 'Active Reservations',
        value: reservationData.activeReservations?.toString() || '0',
        icon: 'bookmark',
        color: '#9b59b6',
      },
    ]

    return NextResponse.json({
      materials,
      stats,
      categories: categoryBreakdownResult.rows,
      reservationSummary: {
        totalReservations: parseInt(reservationData.totalReservations || 0),
        activeReservations: parseInt(reservationData.activeReservations || 0),
        totalReservedQuantity: parseFloat(reservationData.totalReservedQuantity || 0)
      }
    })
  } catch (error) {
    console.error('Error fetching combined materials data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch materials data' },
      { status: 500 }
    )
  }
}