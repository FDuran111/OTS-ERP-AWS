import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
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
    const result = await query(
      'SELECT * FROM "Material" WHERE id = $1',
      [resolvedParams.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Material not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(result.rows[0])
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

    // Build update fields dynamically
    const updateFields = []
    const updateValues = []
    let paramIndex = 1

    if (data.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`)
      updateValues.push(data.name)
    }
    if (data.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`)
      updateValues.push(data.description)
    }
    if (data.unit !== undefined) {
      updateFields.push(`unit = $${paramIndex++}`)
      updateValues.push(data.unit)
    }
    if (data.cost !== undefined) {
      updateFields.push(`cost = $${paramIndex++}`)
      updateValues.push(data.cost)
    }
    if (data.price !== undefined) {
      updateFields.push(`price = $${paramIndex++}`)
      updateValues.push(data.price)
    }
    if (data.markup !== undefined) {
      updateFields.push(`markup = $${paramIndex++}`)
      updateValues.push(data.markup)
    }
    if (data.category !== undefined) {
      updateFields.push(`category = $${paramIndex++}`)
      updateValues.push(data.category)
    }
    if (data.vendorId !== undefined) {
      updateFields.push(`"vendorId" = $${paramIndex++}`)
      updateValues.push(data.vendorId)
    }
    if (data.inStock !== undefined) {
      updateFields.push(`"inStock" = $${paramIndex++}`)
      updateValues.push(data.inStock)
    }
    if (data.minStock !== undefined) {
      updateFields.push(`"minStock" = $${paramIndex++}`)
      updateValues.push(data.minStock)
    }
    if (data.location !== undefined) {
      updateFields.push(`location = $${paramIndex++}`)
      updateValues.push(data.location)
    }
    if (data.active !== undefined) {
      updateFields.push(`active = $${paramIndex++}`)
      updateValues.push(data.active)
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Always update the updatedAt field
    updateFields.push(`"updatedAt" = $${paramIndex++}`)
    updateValues.push(new Date())
    updateValues.push(resolvedParams.id)

    const result = await query(
      `UPDATE "Material" SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      updateValues
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Material not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(result.rows[0])
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

// DELETE a material (soft delete if used, hard delete if not)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    // Check if material has been used in any jobs
    const usageResult = await query(
      'SELECT COUNT(*) as count FROM "MaterialUsage" WHERE "materialId" = $1',
      [resolvedParams.id]
    )

    const usageCount = parseInt(usageResult.rows[0].count)

    if (usageCount > 0) {
      // Soft delete if material has been used
      const result = await query(
        'UPDATE "Material" SET active = false, "updatedAt" = $1 WHERE id = $2 RETURNING *',
        [new Date(), resolvedParams.id]
      )

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Material not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Material deactivated (has usage history)',
        softDelete: true 
      })
    } else {
      // Hard delete if never used
      const result = await query(
        'DELETE FROM "Material" WHERE id = $1 RETURNING *',
        [resolvedParams.id]
      )

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Material not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Material deleted permanently',
        softDelete: false 
      })
    }
  } catch (error) {
    console.error('Error deleting material:', error)
    return NextResponse.json(
      { error: 'Failed to delete material' },
      { status: 500 }
    )
  }
}