import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateMaterialSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().optional(),
  cost: z.number().min(0).optional(),
  price: z.number().min(0).optional(),
  markup: z.number().min(0).optional(),
  category: z.string().optional(),
  vendorId: z.string().optional().nullable(),
  inStock: z.number().int().min(0).optional(),
  minStock: z.number().int().min(0).optional(),
  location: z.string().optional(),
  active: z.boolean().optional(),
})

// GET a specific material
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const material = await prisma.material.findUnique({
      where: { id: resolvedParams.id },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            code: true,
          }
        },
        usage: {
          include: {
            job: {
              select: {
                id: true,
                jobNumber: true,
                description: true,
              }
            }
          },
          orderBy: {
            usedAt: 'desc'
          },
          take: 10
        }
      }
    })

    if (!material) {
      return NextResponse.json(
        { error: 'Material not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(material)
  } catch (error) {
    console.error('Error fetching material:', error)
    return NextResponse.json(
      { error: 'Failed to fetch material' },
      { status: 500 }
    )
  }
}

// PATCH update a material
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const body = await request.json()
    const data = updateMaterialSchema.parse(body)

    const material = await prisma.material.update({
      where: { id: resolvedParams.id },
      data: {
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
        active: data.active,
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

    return NextResponse.json(material)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error updating material:', error)
    return NextResponse.json(
      { error: 'Failed to update material' },
      { status: 500 }
    )
  }
}

// DELETE a material (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    // Check if material has been used in any jobs
    const usageCount = await prisma.materialUsage.count({
      where: { materialId: resolvedParams.id }
    })

    if (usageCount > 0) {
      // Soft delete if material has been used
      await prisma.material.update({
        where: { id: resolvedParams.id },
        data: { active: false }
      })
    } else {
      // Hard delete if never used
      await prisma.material.delete({
        where: { id: resolvedParams.id }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting material:', error)
    return NextResponse.json(
      { error: 'Failed to delete material' },
      { status: 500 }
    )
  }
}