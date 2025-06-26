import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET comprehensive job classification data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    const categoryId = searchParams.get('categoryId')
    const sector = searchParams.get('sector')
    const complexity = searchParams.get('complexity')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50

    let whereClause = 'WHERE 1=1'
    const params: any[] = []
    let paramIndex = 1

    if (jobId) {
      whereClause += ` AND "jobId" = $${paramIndex}`
      params.push(jobId)
      paramIndex++
    }

    if (categoryId) {
      whereClause += ` AND "categoryId" = $${paramIndex}`
      params.push(categoryId)
      paramIndex++
    }

    if (sector) {
      whereClause += ` AND sector = $${paramIndex}`
      params.push(sector)
      paramIndex++
    }

    if (complexity) {
      whereClause += ` AND complexity = $${paramIndex}`
      params.push(complexity)
      paramIndex++
    }

    const result = await query(`
      SELECT * FROM "JobClassificationView"
      ${whereClause}
      ORDER BY "createdAt" DESC
      LIMIT $${paramIndex}
    `, [...params, limit])

    const jobs = result.rows.map(row => ({
      jobId: row.jobId,
      jobNumber: row.jobNumber,
      jobDescription: row.jobDescription,
      status: row.status,
      jobType: row.jobType,
      sector: row.sector,
      complexity: row.complexity,
      
      category: row.categoryId ? {
        id: row.categoryId,
        code: row.categoryCode,
        name: row.categoryName,
        color: row.categoryColor,
        icon: row.categoryIcon
      } : null,
      
      subCategory: row.subCategoryId ? {
        id: row.subCategoryId,
        code: row.subCategoryCode,
        name: row.subCategoryName,
        defaultLaborRate: row.defaultLaborRate ? parseFloat(row.defaultLaborRate) : null,
        estimatedHours: row.estimatedHours ? parseFloat(row.estimatedHours) : null,
        requiresCertification: row.requiresCertification,
        requiredSkillLevel: row.requiredSkillLevel
      } : null,
      
      serviceType: row.serviceTypeId ? {
        id: row.serviceTypeId,
        code: row.serviceCode,
        name: row.serviceName,
        standardRate: row.standardRate ? parseFloat(row.standardRate) : null,
        estimatedDuration: row.estimatedDuration ? parseFloat(row.estimatedDuration) : null,
        requiredEquipment: row.requiredEquipment,
        permitRequired: row.permitRequired
      } : null,
      
      customer: {
        name: row.customerName,
        firstName: row.customerFirstName,
        lastName: row.customerLastName,
        company: row.customerCompany
      },
      
      financial: {
        estimatedCost: row.estimatedCost ? parseFloat(row.estimatedCost) : null,
        actualCost: row.actualCost ? parseFloat(row.actualCost) : null,
        billedAmount: row.billedAmount ? parseFloat(row.billedAmount) : null,
        estimatedHours: row.jobEstimatedHours ? parseFloat(row.jobEstimatedHours) : null,
        actualHours: row.jobActualHours ? parseFloat(row.jobActualHours) : null
      },
      
      dates: {
        scheduled: row.scheduledDate,
        started: row.startDate,
        completed: row.completedDate,
        created: row.createdAt
      },
      
      tags: row.tags || []
    }))

    return NextResponse.json(jobs)

  } catch (error) {
    console.error('Error fetching job classification data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job classification data' },
      { status: 500 }
    )
  }
}

// POST suggest category for job description
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobDescription, action } = body

    if (action === 'suggest') {
      if (!jobDescription) {
        return NextResponse.json(
          { error: 'Job description is required for suggestions' },
          { status: 400 }
        )
      }

      const result = await query(`
        SELECT * FROM suggest_job_category($1)
      `, [jobDescription])

      const suggestions = result.rows.map(row => ({
        categoryId: row.category_id,
        categoryName: row.category_name,
        confidenceScore: parseFloat(row.confidence_score)
      }))

      return NextResponse.json({
        jobDescription,
        suggestions
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error processing classification request:', error)
    return NextResponse.json(
      { error: 'Failed to process classification request' },
      { status: 500 }
    )
  }
}