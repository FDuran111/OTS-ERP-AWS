import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { withRBAC } from '@/lib/rbac-middleware'
import { stringify } from 'csv-stringify/sync'

// GET export materials to CSV
export const GET = withRBAC({
  requiredRoles: ['OWNER_ADMIN', 'FOREMAN']
})(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const lowStock = searchParams.get('lowStock') === 'true'
    const includeInactive = searchParams.get('includeInactive') === 'true'

    // Build WHERE conditions
    const conditions = []
    const params = []
    let paramIndex = 1

    if (!includeInactive) {
      conditions.push('m.active = TRUE')
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

    // Get materials with location stock details
    const result = await query(
      `SELECT 
        m.id,
        m.code,
        m.name,
        m.description,
        m.manufacturer,
        m.category,
        m.unit,
        m.cost,
        m.price,
        m.markup,
        m."inStock",
        m."minStock",
        m.location,
        m.active,
        v.name as "vendorName",
        v.code as "vendorCode",
        STRING_AGG(
          CONCAT(sl.name, ':', COALESCE(mls.quantity, 0)), 
          '; '
        ) as "locationStocks"
      FROM "Material" m
      LEFT JOIN "Vendor" v ON m."vendorId" = v.id
      LEFT JOIN "MaterialLocationStock" mls ON m.id = mls."materialId"
      LEFT JOIN "StorageLocation" sl ON mls."storageLocationId" = sl.id
      ${whereClause}
      GROUP BY m.id, v.name, v.code
      ORDER BY m.name ASC`,
      params
    )

    // Convert to CSV format
    const csvData = result.rows.map(row => ({
      'Code': row.code,
      'Name': row.name,
      'Description': row.description || '',
      'Manufacturer': row.manufacturer || '',
      'Category': row.category,
      'Unit': row.unit,
      'Cost': parseFloat(row.cost || 0).toFixed(2),
      'Price': parseFloat(row.price || 0).toFixed(2),
      'Markup': parseFloat(row.markup || 0).toFixed(2),
      'In Stock': row.inStock || 0,
      'Min Stock': row.minStock || 0,
      'Location': row.location || '',
      'Vendor': row.vendorName || '',
      'Vendor Code': row.vendorCode || '',
      'Location Stocks': row.locationStocks || '',
      'Active': row.active ? 'Yes' : 'No',
    }))

    const csv = stringify(csvData, {
      header: true,
      columns: [
        'Code', 'Name', 'Description', 'Manufacturer', 'Category', 'Unit',
        'Cost', 'Price', 'Markup', 'In Stock', 'Min Stock', 'Location',
        'Vendor', 'Vendor Code', 'Location Stocks', 'Active'
      ]
    })

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="materials-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error exporting materials:', error)
    return NextResponse.json(
      { error: 'Failed to export materials' },
      { status: 500 }
    )
  }
})
