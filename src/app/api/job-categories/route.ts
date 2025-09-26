import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const jobCategorySchema = z.object({
  categoryCode: z.string().min(1).max(20),
  categoryName: z.string().min(1).max(100),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  icon: z.string().optional(),
  sortOrder: z.number().optional(),
})

// GET all job categories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active') !== 'false'
    const includeStats = searchParams.get('includeStats') === 'true'

    if (includeStats) {
      // Get categories with performance statistics
      const result = await query(`
        SELECT * FROM "CategoryPerformanceView"
        ${active ? 'WHERE "categoryId" IN (SELECT id FROM "JobCategory" WHERE active = true)' : ''}
        ORDER BY "totalRevenue" DESC
      `)

      const categoriesWithStats = result.rows.map(row => ({
        id: row.categoryId,
        categoryCode: row.categoryCode,
        categoryName: row.categoryName,
        color: row.color,
        stats: {
          totalJobs: parseInt(row.totalJobs || 0),
          completedJobs: parseInt(row.completedJobs || 0),
          activeJobs: parseInt(row.activeJobs || 0),
          scheduledJobs: parseInt(row.scheduledJobs || 0),
          totalRevenue: parseFloat(row.totalRevenue || 0),
          avgJobValue: parseFloat(row.avgJobValue || 0),
          totalCosts: parseFloat(row.totalCosts || 0),
          totalProfit: parseFloat(row.totalProfit || 0),
          avgMargin: parseFloat(row.avgMargin || 0),
          totalHours: parseFloat(row.totalHours || 0),
          avgHoursPerJob: parseFloat(row.avgHoursPerJob || 0),
          avgTimeAccuracy: parseFloat(row.avgTimeAccuracy || 0),
          simpleJobs: parseInt(row.simpleJobs || 0),
          standardJobs: parseInt(row.standardJobs || 0),
          complexJobs: parseInt(row.complexJobs || 0),
          criticalJobs: parseInt(row.criticalJobs || 0),
          completionRate: parseFloat(row.completionRate || 0),
          profitMargin: parseFloat(row.profitMargin || 0),
          firstJob: row.firstJob,
          lastJob: row.lastJob
        }
      }))

      return NextResponse.json(categoriesWithStats)
    }

    // Get basic categories
    const whereClause = active ? 'WHERE active = true' : ''
    const result = await query(`
      SELECT * FROM "JobCategory"
      ${whereClause}
      ORDER BY "sortOrder", "categoryName"
    `)

    const categories = result.rows.map(row => ({
      id: row.id,
      categoryCode: row.categoryCode,
      categoryName: row.categoryName,
      description: row.description,
      color: row.color,
      icon: row.icon,
      active: row.active,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }))

    return NextResponse.json(categories)

  } catch (error) {
    console.error('Error fetching job categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job categories' },
      { status: 500 }
    )
  }
}

// POST create new job category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = jobCategorySchema.parse(body)

    // Check if category code already exists
    const existingCategory = await query(
      'SELECT id FROM "JobCategory" WHERE "categoryCode" = $1',
      [data.categoryCode]
    )

    if (existingCategory.rows.length > 0) {
      return NextResponse.json(
        { error: 'Category code already exists' },
        { status: 409 }
      )
    }

    const result = await query(`
      INSERT INTO "JobCategory" (
        "categoryCode", "categoryName", "description", "color", "icon", "sortOrder"
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      data.categoryCode,
      data.categoryName,
      data.description || null,
      data.color || '#1976d2',
      data.icon || 'work',
      data.sortOrder || 0
    ])

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
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating job category:', error)
    return NextResponse.json(
      { error: 'Failed to create job category' },
      { status: 500 }
    )
  }
}

// PUT update category order
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { categories } = body

    if (!Array.isArray(categories)) {
      return NextResponse.json(
        { error: 'Categories must be an array' },
        { status: 400 }
      )
    }

    // Update sort order for each category
    for (let i = 0; i < categories.length; i++) {
      await query(
        'UPDATE "JobCategory" SET "sortOrder" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2',
        [i + 1, categories[i].id]
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating category order:', error)
    return NextResponse.json(
      { error: 'Failed to update category order' },
      { status: 500 }
    )
  }
}