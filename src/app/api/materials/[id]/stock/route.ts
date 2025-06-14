import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const stockUpdateSchema = z.object({
  quantity: z.number(),
  type: z.enum(['ADD', 'REMOVE', 'SET']),
  reason: z.string().optional(),
  userId: z.string().optional(),
})

// PATCH update material stock
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const body = await request.json()
    const data = stockUpdateSchema.parse(body)

    // Get current material
    const material = await prisma.material.findUnique({
      where: { id: resolvedParams.id }
    })

    if (!material) {
      return NextResponse.json(
        { error: 'Material not found' },
        { status: 404 }
      )
    }

    let newStock: number

    switch (data.type) {
      case 'ADD':
        newStock = material.inStock + data.quantity
        break
      case 'REMOVE':
        newStock = Math.max(0, material.inStock - data.quantity)
        break
      case 'SET':
        newStock = data.quantity
        break
      default:
        throw new Error('Invalid stock update type')
    }

    // Update the material stock
    const updatedMaterial = await prisma.material.update({
      where: { id: resolvedParams.id },
      data: { inStock: newStock },
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

    // TODO: Log the stock change for audit trail
    // This could be stored in a separate StockMovement table

    return NextResponse.json({
      material: updatedMaterial,
      oldStock: material.inStock,
      newStock: newStock,
      change: newStock - material.inStock,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error updating material stock:', error)
    return NextResponse.json(
      { error: 'Failed to update material stock' },
      { status: 500 }
    )
  }
}