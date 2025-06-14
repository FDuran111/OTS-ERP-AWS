import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createMaterialSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
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
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const lowStock = searchParams.get('lowStock') === 'true'

    const whereClause: any = {
      active: true
    }

    if (search) {
      whereClause.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (category) {
      whereClause.category = category
    }

    if (lowStock) {
      whereClause.inStock = { lte: prisma.material.fields.minStock }
    }

    const materials = await prisma.material.findMany({
      where: whereClause,
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            code: true,
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Transform data for frontend
    const transformedMaterials = materials.map(material => {
      const stockStatus = material.inStock === 0 
        ? 'Out of Stock' 
        : material.inStock <= material.minStock 
          ? 'Low Stock' 
          : 'In Stock'

      return {
        id: material.id,
        code: material.code,
        name: material.name,
        description: material.description,
        category: material.category,
        unit: material.unit,
        cost: material.cost,
        price: material.price,
        markup: material.markup,
        inStock: material.inStock,
        minStock: material.minStock,
        location: material.location || 'Not Set',
        vendor: material.vendor,
        status: stockStatus,
        active: material.active,
        createdAt: material.createdAt,
        updatedAt: material.updatedAt,
      }
    })

    return NextResponse.json(transformedMaterials)
  } catch (error) {
    console.error('Error fetching materials:', error)
    return NextResponse.json(
      { error: 'Failed to fetch materials' },
      { status: 500 }
    )
  }
}

// POST create a new material
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createMaterialSchema.parse(body)

    // Check if code already exists
    const existingMaterial = await prisma.material.findUnique({
      where: { code: data.code }
    })

    if (existingMaterial) {
      return NextResponse.json(
        { error: 'Material code already exists' },
        { status: 400 }
      )
    }

    const material = await prisma.material.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        unit: data.unit,
        cost: data.cost,
        price: data.price,
        markup: data.markup,
        category: data.category,
        vendorId: data.vendorId,
        inStock: data.inStock,
        minStock: data.minStock,
        location: data.location,
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            code: true,
          }
        }
      }
    })

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
}