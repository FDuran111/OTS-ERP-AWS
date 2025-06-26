import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const jobSubCategorySchema = z.object({
  categoryId: z.string().uuid(),
  subCategoryCode: z.string().min(1).max(20),
  subCategoryName: z.string().min(1).max(100),
  description: z.string().optional(),
  defaultLaborRate: z.number().optional(),
  estimatedHours: z.number().optional(),
  requiresCertification: z.boolean().optional(),
  requiredSkillLevel: z.enum(['APPRENTICE', 'HELPER', 'TECH_L1', 'TECH_L2', 'JOURNEYMAN', 'FOREMAN', 'LOW_VOLTAGE', 'CABLING', 'INSTALL']).optional(),
  sortOrder: z.number().optional(),
})

// GET job sub-categories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const active = searchParams.get('active') !== 'false'

    let whereClause = active ? 'WHERE jsc.active = true' : 'WHERE 1=1'
    const params: any[] = []

    if (categoryId) {
      whereClause += ` AND jsc."categoryId" = $1`
      params.push(categoryId)
    }

    const result = await query(`
      SELECT 
        jsc.*,
        jc."categoryCode",
        jc."categoryName",
        jc."color" as "categoryColor"
      FROM "JobSubCategory" jsc
      LEFT JOIN "JobCategory" jc ON jsc."categoryId" = jc.id
      ${whereClause}
      ORDER BY jc."sortOrder", jsc."sortOrder", jsc."subCategoryName"
    `, params)

    const subCategories = result.rows.map(row => ({
      id: row.id,
      categoryId: row.categoryId,
      categoryCode: row.categoryCode,
      categoryName: row.categoryName,
      categoryColor: row.categoryColor,
      subCategoryCode: row.subCategoryCode,
      subCategoryName: row.subCategoryName,
      description: row.description,
      defaultLaborRate: row.defaultLaborRate ? parseFloat(row.defaultLaborRate) : null,
      estimatedHours: row.estimatedHours ? parseFloat(row.estimatedHours) : null,
      requiresCertification: row.requiresCertification,
      requiredSkillLevel: row.requiredSkillLevel,
      active: row.active,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }))

    return NextResponse.json(subCategories)

  } catch (error) {
    console.error('Error fetching job sub-categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job sub-categories' },
      { status: 500 }
    )
  }
}

// POST create new job sub-category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = jobSubCategorySchema.parse(body)

    // Verify category exists
    const categoryCheck = await query(
      'SELECT id FROM "JobCategory" WHERE id = $1 AND active = true',
      [data.categoryId]
    )

    if (categoryCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Category not found or inactive' },
        { status: 404 }
      )
    }

    // Check if sub-category code already exists within this category
    const existingSubCategory = await query(
      'SELECT id FROM "JobSubCategory" WHERE "categoryId" = $1 AND "subCategoryCode" = $2',
      [data.categoryId, data.subCategoryCode]
    )

    if (existingSubCategory.rows.length > 0) {
      return NextResponse.json(
        { error: 'Sub-category code already exists in this category' },
        { status: 409 }
      )
    }

    const result = await query(`
      INSERT INTO "JobSubCategory" (
        "categoryId", "subCategoryCode", "subCategoryName", "description",
        "defaultLaborRate", "estimatedHours", "requiresCertification", 
        "requiredSkillLevel", "sortOrder"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      data.categoryId,
      data.subCategoryCode,
      data.subCategoryName,
      data.description || null,
      data.defaultLaborRate || null,
      data.estimatedHours || null,
      data.requiresCertification || false,
      data.requiredSkillLevel || null,
      data.sortOrder || 0
    ])

    const subCategory = result.rows[0]

    return NextResponse.json({
      id: subCategory.id,
      categoryId: subCategory.categoryId,
      subCategoryCode: subCategory.subCategoryCode,
      subCategoryName: subCategory.subCategoryName,
      description: subCategory.description,
      defaultLaborRate: subCategory.defaultLaborRate ? parseFloat(subCategory.defaultLaborRate) : null,
      estimatedHours: subCategory.estimatedHours ? parseFloat(subCategory.estimatedHours) : null,
      requiresCertification: subCategory.requiresCertification,
      requiredSkillLevel: subCategory.requiredSkillLevel,
      active: subCategory.active,
      sortOrder: subCategory.sortOrder,
      createdAt: subCategory.createdAt,
      updatedAt: subCategory.updatedAt
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating job sub-category:', error)
    return NextResponse.json(
      { error: 'Failed to create job sub-category' },
      { status: 500 }
    )
  }
}