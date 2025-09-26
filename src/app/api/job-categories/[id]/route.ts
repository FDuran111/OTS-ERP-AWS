import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const updateCategorySchema = z.object({
  categoryCode: z.string().min(1).max(20).optional(),
  categoryName: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  icon: z.string().optional(),
  active: z.boolean().optional(),
})

// PATCH update a specific category
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const data = updateCategorySchema.parse(body)
    const { id } = await params

    // Check if category exists
    const existingCategory = await query(
      'SELECT id FROM "JobCategory" WHERE id = $1',
      [id]
    )

    if (existingCategory.rows.length === 0) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    // Build update query dynamically
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (data.categoryCode !== undefined) {
      updates.push(`"categoryCode" = $${paramIndex++}`)
      values.push(data.categoryCode)
    }
    if (data.categoryName !== undefined) {
      updates.push(`"categoryName" = $${paramIndex++}`)
      values.push(data.categoryName)
    }
    if (data.description !== undefined) {
      updates.push(`"description" = $${paramIndex++}`)
      values.push(data.description)
    }
    if (data.color !== undefined) {
      updates.push(`"color" = $${paramIndex++}`)
      values.push(data.color)
    }
    if (data.icon !== undefined) {
      updates.push(`"icon" = $${paramIndex++}`)
      values.push(data.icon)
    }
    if (data.active !== undefined) {
      updates.push(`"active" = $${paramIndex++}`)
      values.push(data.active)
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    updates.push(`"updatedAt" = CURRENT_TIMESTAMP`)
    values.push(id)

    const result = await query(`
      UPDATE "JobCategory"
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values)

    const category = result.rows[0]

    return NextResponse.json({
      id: category.id,
      categoryCode: category.categoryCode,
      categoryName: category.categoryName,
      description: category.description,
      color: category.color,
      icon: category.icon,
      active: category.active,
      sortOrder: category.sortOrder,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating job category:', error)
    return NextResponse.json(
      { error: 'Failed to update job category' },
      { status: 500 }
    )
  }
}

// DELETE a specific category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if category has any associated jobs
    const jobCheck = await query(
      'SELECT COUNT(*) as count FROM "Job" WHERE "categoryId" = $1',
      [id]
    )

    if (parseInt(jobCheck.rows[0].count) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with existing jobs' },
        { status: 400 }
      )
    }

    // Delete the category
    const result = await query(
      'DELETE FROM "JobCategory" WHERE id = $1 RETURNING id',
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, deletedId: id })

  } catch (error) {
    console.error('Error deleting job category:', error)
    return NextResponse.json(
      { error: 'Failed to delete job category' },
      { status: 500 }
    )
  }
}