import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'
import { withRBAC } from '@/lib/rbac-middleware'

export const GET = withRBAC({ requiredRoles: ['OWNER_ADMIN', 'FOREMAN'] })(
async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month' // month, quarter, year
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    // Calculate date range based on period
    let dateStart: Date
    let dateEnd: Date
    
    if (startDate && endDate) {
      dateStart = new Date(startDate)
      dateEnd = new Date(endDate)
    } else {
      const now = new Date()
      switch (period) {
        case 'year':
          dateStart = new Date(now.getFullYear(), 0, 1)
          dateEnd = new Date(now.getFullYear(), 11, 31)
          break
        case 'quarter':
          const currentQuarter = Math.floor(now.getMonth() / 3)
          dateStart = new Date(now.getFullYear(), currentQuarter * 3, 1)
          dateEnd = endOfMonth(new Date(now.getFullYear(), currentQuarter * 3 + 2, 1))
          break
        case 'month':
        default:
          dateStart = startOfMonth(now)
          dateEnd = endOfMonth(now)
      }
    }

    // Get material usage summary
    const materialSummaryResult = await query(`
      SELECT 
        m.id,
        m.name,
        m.category,
        m.unit,
        m.cost,
        m."inStock",
        m."minStock",
        SUM(mu.quantity) as total_used,
        COUNT(DISTINCT mu."jobId") as jobs_used_in,
        SUM(mu.quantity * COALESCE(mu."unitCost", m.cost)) as total_cost,
        AVG(mu.quantity) as avg_quantity_per_job
      FROM "Material" m
      LEFT JOIN "MaterialUsage" mu ON m.id = mu."materialId"
      LEFT JOIN "Job" j ON mu."jobId" = j.id
      WHERE (mu."usedAt" >= $1 AND mu."usedAt" <= $2) OR mu."usedAt" IS NULL
      GROUP BY m.id, m.name, m.category, m.unit, m.cost, m."inStock", m."minStock"
      ORDER BY total_cost DESC NULLS LAST
    `, [dateStart, dateEnd])

    // Get material usage by category
    const usageByCategoryResult = await query(`
      SELECT 
        m.category,
        COUNT(DISTINCT m.id) as material_count,
        SUM(mu.quantity) as total_quantity,
        SUM(mu.quantity * COALESCE(mu."unitCost", m.cost)) as total_cost,
        COUNT(DISTINCT mu."jobId") as jobs_count
      FROM "Material" m
      INNER JOIN "MaterialUsage" mu ON m.id = mu."materialId"
      WHERE mu."usedAt" >= $1 AND mu."usedAt" <= $2
      GROUP BY m.category
      ORDER BY total_cost DESC
    `, [dateStart, dateEnd])

    // Get material usage by job type
    const usageByJobTypeResult = await query(`
      SELECT 
        j.type,
        COUNT(DISTINCT mu."materialId") as material_types_used,
        SUM(mu.quantity * COALESCE(mu."unitCost", m.cost)) as total_cost,
        COUNT(DISTINCT mu."jobId") as job_count,
        AVG(mu.quantity * COALESCE(mu."unitCost", m.cost)) as avg_material_cost_per_job
      FROM "Job" j
      INNER JOIN "MaterialUsage" mu ON j.id = mu."jobId"
      INNER JOIN "Material" m ON mu."materialId" = m.id
      WHERE mu."usedAt" >= $1 AND mu."usedAt" <= $2
      GROUP BY j.type
      ORDER BY total_cost DESC
    `, [dateStart, dateEnd])

    // Get top consumed materials
    const topMaterialsResult = await query(`
      SELECT 
        m.id,
        m.name,
        m.category,
        m.unit,
        SUM(mu.quantity) as total_quantity,
        SUM(mu.quantity * COALESCE(mu."unitCost", m.cost)) as total_cost,
        COUNT(DISTINCT mu."jobId") as usage_count
      FROM "Material" m
      INNER JOIN "MaterialUsage" mu ON m.id = mu."materialId"
      WHERE mu."usedAt" >= $1 AND mu."usedAt" <= $2
      GROUP BY m.id, m.name, m.category, m.unit
      ORDER BY total_cost DESC
      LIMIT 10
    `, [dateStart, dateEnd])

    // Get monthly usage trend
    const monthlyTrendResult = await query(`
      SELECT 
        TO_CHAR(mu."usedAt", 'YYYY-MM') as month,
        COUNT(DISTINCT mu."materialId") as unique_materials,
        SUM(mu.quantity * COALESCE(mu."unitCost", m.cost)) as total_cost,
        COUNT(DISTINCT mu."jobId") as jobs_count
      FROM "MaterialUsage" mu
      INNER JOIN "Material" m ON mu."materialId" = m.id
      WHERE mu."usedAt" >= $1
      GROUP BY TO_CHAR(mu."usedAt", 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 12
    `, [subMonths(new Date(), 11)])

    // Get low stock materials
    const lowStockResult = await query(`
      SELECT 
        m.id,
        m.name,
        m.category,
        m."inStock",
        m."minStock",
        m.cost,
        COALESCE(recent_usage.avg_daily_usage, 0) as avg_daily_usage,
        CASE 
          WHEN COALESCE(recent_usage.avg_daily_usage, 0) > 0 
          THEN m."inStock" / recent_usage.avg_daily_usage
          ELSE NULL
        END as days_of_stock
      FROM "Material" m
      LEFT JOIN (
        SELECT 
          mu."materialId",
          SUM(mu.quantity) / 30.0 as avg_daily_usage
        FROM "MaterialUsage" mu
        WHERE mu."usedAt" >= $1
        GROUP BY mu."materialId"
      ) recent_usage ON m.id = recent_usage."materialId"
      WHERE m."inStock" <= m."minStock" * 1.5
      ORDER BY days_of_stock ASC NULLS LAST
      LIMIT 20
    `, [subMonths(new Date(), 1)])

    // Get overall statistics
    const overallStatsResult = await query(`
      SELECT 
        COUNT(DISTINCT m.id) as total_materials,
        COUNT(DISTINCT mu."materialId") as materials_used,
        SUM(mu.quantity * COALESCE(mu."unitCost", m.cost)) as total_cost,
        COUNT(DISTINCT mu."jobId") as jobs_with_materials,
        AVG(mu.quantity * COALESCE(mu."unitCost", m.cost)) as avg_cost_per_usage
      FROM "Material" m
      LEFT JOIN "MaterialUsage" mu ON m.id = mu."materialId"
      WHERE mu."usedAt" >= $1 AND mu."usedAt" <= $2
    `, [dateStart, dateEnd])

    const overallStats = overallStatsResult.rows[0] || {
      total_materials: 0,
      materials_used: 0,
      total_cost: 0,
      jobs_with_materials: 0,
      avg_cost_per_usage: 0
    }

    return NextResponse.json({
      period: {
        start: dateStart,
        end: dateEnd,
        label: period
      },
      summary: {
        totalMaterials: parseInt(overallStats.total_materials),
        materialsUsed: parseInt(overallStats.materials_used),
        totalCost: parseFloat(overallStats.total_cost) || 0,
        jobsWithMaterials: parseInt(overallStats.jobs_with_materials),
        avgCostPerUsage: parseFloat(overallStats.avg_cost_per_usage) || 0
      },
      materials: materialSummaryResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        category: row.category,
        unit: row.unit,
        unitCost: parseFloat(row.cost) || 0,
        quantityInStock: parseFloat(row.inStock) || 0,
        reorderLevel: parseFloat(row.minStock) || 0,
        totalUsed: parseFloat(row.total_used) || 0,
        jobsUsedIn: parseInt(row.jobs_used_in) || 0,
        totalCost: parseFloat(row.total_cost) || 0,
        avgQuantityPerJob: parseFloat(row.avg_quantity_per_job) || 0,
        stockStatus: row.inStock <= row.minStock ? 'low' : 'normal'
      })),
      usageByCategory: usageByCategoryResult.rows.map(row => ({
        category: row.category,
        materialCount: parseInt(row.material_count),
        totalQuantity: parseFloat(row.total_quantity) || 0,
        totalCost: parseFloat(row.total_cost) || 0,
        jobsCount: parseInt(row.jobs_count)
      })),
      usageByJobType: usageByJobTypeResult.rows.map(row => ({
        type: row.type,
        materialTypesUsed: parseInt(row.material_types_used),
        totalCost: parseFloat(row.total_cost) || 0,
        jobCount: parseInt(row.job_count),
        avgMaterialCostPerJob: parseFloat(row.avg_material_cost_per_job) || 0
      })),
      topMaterials: topMaterialsResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        category: row.category,
        unit: row.unit,
        totalQuantity: parseFloat(row.total_quantity) || 0,
        totalCost: parseFloat(row.total_cost) || 0,
        usageCount: parseInt(row.usage_count)
      })),
      monthlyTrend: monthlyTrendResult.rows.reverse().map(row => ({
        month: row.month,
        uniqueMaterials: parseInt(row.unique_materials),
        totalCost: parseFloat(row.total_cost) || 0,
        jobsCount: parseInt(row.jobs_count)
      })),
      lowStockMaterials: lowStockResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        category: row.category,
        quantityInStock: parseFloat(row.inStock) || 0,
        reorderLevel: parseFloat(row.minStock) || 0,
        unitCost: parseFloat(row.cost) || 0,
        avgDailyUsage: parseFloat(row.avg_daily_usage) || 0,
        daysOfStock: row.days_of_stock ? parseFloat(row.days_of_stock) : null
      }))
    })
  } catch (error) {
    console.error('Error generating material usage report:', error)
    return NextResponse.json(
      { error: 'Failed to generate material usage report' },
      { status: 500 }
    )
  }
})