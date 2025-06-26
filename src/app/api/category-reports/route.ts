import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET category performance reports and analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const categoryId = searchParams.get('categoryId')
    const reportType = searchParams.get('reportType') || 'summary'

    // Base date filter
    let dateFilter = ''
    const params: any[] = []
    let paramIndex = 1

    if (dateFrom && dateTo) {
      dateFilter = `AND j."createdAt" BETWEEN $${paramIndex} AND $${paramIndex + 1}`
      params.push(dateFrom, dateTo)
      paramIndex += 2
    } else if (dateFrom) {
      dateFilter = `AND j."createdAt" >= $${paramIndex}`
      params.push(dateFrom)
      paramIndex++
    } else if (dateTo) {
      dateFilter = `AND j."createdAt" <= $${paramIndex}`
      params.push(dateTo)
      paramIndex++
    }

    if (reportType === 'summary') {
      // Category performance summary
      const categoryPerformance = await query(`
        SELECT * FROM "CategoryPerformanceView"
        WHERE "categoryId" IS NOT NULL
        ORDER BY "totalRevenue" DESC
      `)

      // Sector breakdown
      const sectorBreakdown = await query(`
        SELECT 
          j.sector,
          COUNT(*) as "jobCount",
          SUM(j."billedAmount") as "totalRevenue",
          AVG(j."billedAmount") as "avgJobValue",
          COUNT(CASE WHEN j.status = 'COMPLETED' THEN 1 END) as "completedJobs"
        FROM "Job" j
        WHERE j.sector IS NOT NULL ${dateFilter}
        GROUP BY j.sector
        ORDER BY "totalRevenue" DESC
      `, params)

      // Complexity analysis
      const complexityAnalysis = await query(`
        SELECT 
          j.complexity,
          COUNT(*) as "jobCount",
          SUM(j."billedAmount") as "totalRevenue",
          AVG(j."actualHours") as "avgHours",
          AVG(CASE WHEN j."estimatedHours" > 0 AND j."actualHours" > 0 THEN 
            (j."actualHours" / j."estimatedHours") * 100 ELSE NULL END) as "timeAccuracy"
        FROM "Job" j
        WHERE j.complexity IS NOT NULL ${dateFilter}
        GROUP BY j.complexity
        ORDER BY "totalRevenue" DESC
      `, params)

      // Monthly trends
      const monthlyTrends = await query(`
        SELECT 
          DATE_TRUNC('month', j."createdAt") as "month",
          jc."categoryName",
          jc."color",
          COUNT(j.id) as "jobCount",
          SUM(j."billedAmount") as "revenue"
        FROM "Job" j
        LEFT JOIN "JobCategory" jc ON j."categoryId" = jc.id
        WHERE j."createdAt" >= CURRENT_DATE - INTERVAL '12 months' ${dateFilter}
        GROUP BY DATE_TRUNC('month', j."createdAt"), jc."categoryName", jc."color"
        ORDER BY "month" DESC, "revenue" DESC
      `, params)

      return NextResponse.json({
        categoryPerformance: categoryPerformance.rows.map(row => ({
          categoryId: row.categoryId,
          categoryCode: row.categoryCode,
          categoryName: row.categoryName,
          color: row.color,
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
        })),
        
        sectorBreakdown: sectorBreakdown.rows.map(row => ({
          sector: row.sector,
          jobCount: parseInt(row.jobCount),
          totalRevenue: parseFloat(row.totalRevenue || 0),
          avgJobValue: parseFloat(row.avgJobValue || 0),
          completedJobs: parseInt(row.completedJobs || 0)
        })),
        
        complexityAnalysis: complexityAnalysis.rows.map(row => ({
          complexity: row.complexity,
          jobCount: parseInt(row.jobCount),
          totalRevenue: parseFloat(row.totalRevenue || 0),
          avgHours: parseFloat(row.avgHours || 0),
          timeAccuracy: parseFloat(row.timeAccuracy || 0)
        })),
        
        monthlyTrends: monthlyTrends.rows.map(row => ({
          month: row.month,
          categoryName: row.categoryName,
          color: row.color,
          jobCount: parseInt(row.jobCount),
          revenue: parseFloat(row.revenue || 0)
        }))
      })
    }

    if (reportType === 'detailed' && categoryId) {
      // Detailed category analysis
      const categoryDetails = await query(`
        SELECT 
          jc.*,
          COUNT(j.id) as "totalJobs",
          SUM(j."billedAmount") as "totalRevenue",
          AVG(j."billedAmount") as "avgJobValue"
        FROM "JobCategory" jc
        LEFT JOIN "Job" j ON jc.id = j."categoryId" ${dateFilter}
        WHERE jc.id = $${paramIndex}
        GROUP BY jc.id, jc."categoryCode", jc."categoryName", jc."description", jc."color", jc."icon"
      `, [...params, categoryId])

      // Sub-category breakdown for this category
      const subCategoryBreakdown = await query(`
        SELECT 
          jsc.*,
          COUNT(j.id) as "jobCount",
          SUM(j."billedAmount") as "revenue",
          AVG(j."actualHours") as "avgHours"
        FROM "JobSubCategory" jsc
        LEFT JOIN "Job" j ON jsc.id = j."subCategoryId" ${dateFilter}
        WHERE jsc."categoryId" = $${paramIndex} AND jsc.active = true
        GROUP BY jsc.id, jsc."subCategoryCode", jsc."subCategoryName", jsc."description", 
                 jsc."defaultLaborRate", jsc."estimatedHours"
        ORDER BY "revenue" DESC
      `, [...params, categoryId])

      // Recent jobs in this category
      const recentJobs = await query(`
        SELECT 
          j.id,
          j."jobNumber",
          j.description,
          j.status,
          j."billedAmount",
          j."actualHours",
          j."createdAt",
          COALESCE(c."companyName", CONCAT(c."firstName", ' ', c."lastName")) as "customerName"
        FROM "Job" j
        LEFT JOIN "Customer" c ON j."customerId" = c.id
        WHERE j."categoryId" = $${paramIndex} ${dateFilter}
        ORDER BY j."createdAt" DESC
        LIMIT 20
      `, [...params, categoryId])

      return NextResponse.json({
        categoryDetails: categoryDetails.rows[0] ? {
          id: categoryDetails.rows[0].id,
          categoryCode: categoryDetails.rows[0].categoryCode,
          categoryName: categoryDetails.rows[0].categoryName,
          description: categoryDetails.rows[0].description,
          color: categoryDetails.rows[0].color,
          icon: categoryDetails.rows[0].icon,
          totalJobs: parseInt(categoryDetails.rows[0].totalJobs || 0),
          totalRevenue: parseFloat(categoryDetails.rows[0].totalRevenue || 0),
          avgJobValue: parseFloat(categoryDetails.rows[0].avgJobValue || 0)
        } : null,
        
        subCategoryBreakdown: subCategoryBreakdown.rows.map(row => ({
          id: row.id,
          subCategoryCode: row.subCategoryCode,
          subCategoryName: row.subCategoryName,
          description: row.description,
          defaultLaborRate: row.defaultLaborRate ? parseFloat(row.defaultLaborRate) : null,
          estimatedHours: row.estimatedHours ? parseFloat(row.estimatedHours) : null,
          jobCount: parseInt(row.jobCount || 0),
          revenue: parseFloat(row.revenue || 0),
          avgHours: parseFloat(row.avgHours || 0)
        })),
        
        recentJobs: recentJobs.rows.map(row => ({
          id: row.id,
          jobNumber: row.jobNumber,
          description: row.description,
          status: row.status,
          billedAmount: parseFloat(row.billedAmount || 0),
          actualHours: parseFloat(row.actualHours || 0),
          customerName: row.customerName,
          createdAt: row.createdAt
        }))
      })
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })

  } catch (error) {
    console.error('Error generating category reports:', error)
    return NextResponse.json(
      { error: 'Failed to generate category reports' },
      { status: 500 }
    )
  }
}