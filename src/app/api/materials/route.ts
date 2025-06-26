import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'
import { withRBAC } from '@/lib/rbac-middleware'

const createMaterialSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  manufacturer: z.string().optional(),
  unit: z.string().min(1, 'Unit is required'),
  cost: z.number().min(0, 'Cost must be positive'),
  price: z.number().min(0, 'Price must be positive'),
  markup: z.number().min(0, 'Markup must be positive').default(1.5),
  category: z.string().min(1, 'Category is required'),
  vendorId: z.string().optional(),
  inStock: z.number().int().min(0, 'Stock must be non-negative').default(0),
  minStock: z.number().int().min(0, 'Min stock must be non-negative').default(0),
  location: z.string().optional(),
})

// GET all materials
export const GET = withRBAC({
  requiredRoles: ['OWNER_ADMIN', 'FOREMAN', 'EMPLOYEE']
})(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const lowStock = searchParams.get('lowStock') === 'true'

    // Build WHERE conditions
    const conditions = ['active = TRUE']
    const params = []
    let paramIndex = 1

    if (search) {
      conditions.push(`(
        code ILIKE $${paramIndex} OR 
        name ILIKE $${paramIndex} OR 
        description ILIKE $${paramIndex}
      )`)
      params.push(`%${search}%`)
      paramIndex++
    }

    if (category) {
      conditions.push(`category = $${paramIndex}`)
      params.push(category)
      paramIndex++
    }

    if (lowStock) {
      conditions.push(`"inStock" <= "minStock"`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Get materials first - simplified query
    const result = await query(
      `SELECT * FROM "Material" ${whereClause} ORDER BY name ASC`,
      params
    )

    // Transform data for frontend
    const materials = result.rows.map(material => {
      const inStockNum = parseInt(material.inStock) || 0
      const minStockNum = parseInt(material.minStock) || 0
      
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

    return NextResponse.json(materials)
  } catch (error) {
    console.error('Error fetching materials:', error)
    
    // Check if it's a database connection error
    if (error instanceof Error) {
      if (error.message.includes('Can\'t reach database server') || error.message.includes('ECONNREFUSED')) {
        return NextResponse.json(
          { 
            error: 'Database connection failed', 
            details: 'Unable to connect to database. The Supabase instance may be paused or there may be a connectivity issue.',
            suggestion: 'Please check the Supabase dashboard to ensure the project is active.'
          },
          { status: 503 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch materials', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
})

// POST create a new material
export const POST = withRBAC({
  requiredRoles: ['OWNER_ADMIN', 'FOREMAN']
})(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const data = createMaterialSchema.parse(body)

    // Check if code already exists
    const existingResult = await query(
      'SELECT id FROM "Material" WHERE code = $1',
      [data.code]
    )

    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'Material code already exists' },
        { status: 400 }
      )
    }

    // Insert new material
    const result = await query(
      `INSERT INTO "Material" (
        id, code, name, description, manufacturer, unit, cost, price, markup,
        category, "vendorId", "inStock", "minStock", location, active,
        "createdAt", "updatedAt"
      ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        data.code,
        data.name,
        data.description || null,
        data.manufacturer || null,
        data.unit,
        data.cost,
        data.price,
        data.markup,
        data.category,
        data.vendorId || null,
        data.inStock,
        data.minStock,
        data.location || null,
        true,
        new Date(),
        new Date()
      ]
    )

    const material = result.rows[0]

    // Get vendor info if exists
    if (material.vendorId) {
      const vendorResult = await query(
        'SELECT id, name, code FROM "Vendor" WHERE id = $1',
        [material.vendorId]
      )
      if (vendorResult.rows.length > 0) {
        material.vendor = vendorResult.rows[0]
      }
    }

    return NextResponse.json(material, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating material:', error)
    return NextResponse.json(
      { error: 'Failed to create material' },
      { status: 500 }
    )
  }
})