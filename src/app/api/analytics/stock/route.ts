import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30' // days
    const categoryFilter = searchParams.get('category')

    // Stock level distribution
    const stockLevelsResult = await query(`
      SELECT 
        stock_level,
        count,
        total_value
      FROM (
        SELECT 
          CASE 
            WHEN "inStock" = 0 THEN 'Out of Stock'
            WHEN "inStock" <= "minStock" * 0.5 THEN 'Critical'
            WHEN "inStock" <= "minStock" THEN 'Low'
            WHEN "inStock" <= "minStock" * 1.5 THEN 'Adequate'
            ELSE 'High'
          END as stock_level,
          COUNT(*) as count,
          SUM("inStock" * cost) as total_value
        FROM "Material"
        WHERE active = TRUE 
          ${categoryFilter ? 'AND category = $1' : ''}
        GROUP BY 
          CASE 
            WHEN "inStock" = 0 THEN 'Out of Stock'
            WHEN "inStock" <= "minStock" * 0.5 THEN 'Critical'
            WHEN "inStock" <= "minStock" THEN 'Low'
            WHEN "inStock" <= "minStock" * 1.5 THEN 'Adequate'
            ELSE 'High'
          END
      ) AS stock_summary
      ORDER BY 
        CASE 
          WHEN stock_level = 'Out of Stock' THEN 1
          WHEN stock_level = 'Critical' THEN 2
          WHEN stock_level = 'Low' THEN 3
          WHEN stock_level = 'Adequate' THEN 4
          ELSE 5
        END
    `, categoryFilter ? [categoryFilter] : [])

    // Stock movement trends (last 30 days)
    const movementTrendsResult = await query(`
      SELECT 
        DATE(sm."createdAt") as date,
        sm.type,
        COUNT(*) as transaction_count,
        SUM(ABS(sm."quantityChanged")) as total_quantity,
        SUM(ABS(sm."totalValue")) as total_value
      FROM "StockMovement" sm
      INNER JOIN "Material" m ON sm."materialId" = m.id
      WHERE sm."createdAt" >= NOW() - INTERVAL '${period} days'
        ${categoryFilter ? 'AND m.category = $1' : ''}
      GROUP BY DATE(sm."createdAt"), sm.type
      ORDER BY date DESC, sm.type
    `, categoryFilter ? [categoryFilter] : [])

    // Top materials by value
    const topMaterialsByValueResult = await query(`
      SELECT 
        id,
        code,
        name,
        category,
        "inStock",
        cost,
        ("inStock" * cost) as total_value,
        "minStock",
        CASE 
          WHEN "minStock" > 0 THEN ("inStock" / "minStock") * 100
          ELSE 100
        END as stock_percentage
      FROM "Material"
      WHERE active = TRUE AND "inStock" > 0
        ${categoryFilter ? 'AND category = $1' : ''}
      ORDER BY total_value DESC
      LIMIT 20
    `, categoryFilter ? [categoryFilter] : [])

    // Most used materials (by job usage)
    const mostUsedMaterialsResult = await query(`
      SELECT 
        m.id,
        m.code,
        m.name,
        m.category,
        m.unit,
        SUM(mu."quantity") as total_used,
        COUNT(DISTINCT mu."jobId") as jobs_used_on,
        SUM(mu."totalCost") as total_cost,
        AVG(mu."quantity") as avg_usage_per_job
      FROM "MaterialUsage" mu
      INNER JOIN "Material" m ON mu."materialId" = m.id
      WHERE mu."createdAt" >= NOW() - INTERVAL '${period} days'
        ${categoryFilter ? 'AND m.category = $1' : ''}
      GROUP BY m.id, m.code, m.name, m.category, m.unit
      ORDER BY total_used DESC
      LIMIT 15
    `, categoryFilter ? [categoryFilter] : [])

    // Stock turnover analysis
    const turnoverAnalysisResult = await query(`
      WITH usage_stats AS (
        SELECT 
          m.id,
          m.code,
          m.name,
          m.category,
          m."inStock",
          m.cost,
          COALESCE(SUM(mu."quantity"), 0) as total_used_period,
          COUNT(mu.id) as usage_transactions
        FROM "Material" m
        LEFT JOIN "MaterialUsage" mu ON m.id = mu."materialId" 
          AND mu."createdAt" >= NOW() - INTERVAL '${period} days'
        WHERE m.active = TRUE
          ${categoryFilter ? 'AND m.category = $1' : ''}
        GROUP BY m.id, m.code, m.name, m.category, m."inStock", m.cost
      )
      SELECT 
        *,
        CASE 
          WHEN "inStock" > 0 AND total_used_period > 0 
          THEN ("inStock" / (total_used_period / (${period}::float / 30))) -- Days of stock remaining
          ELSE 999
        END as days_of_stock,
        CASE 
          WHEN "inStock" > 0 
          THEN total_used_period / "inStock" -- Turnover ratio
          ELSE 0
        END as turnover_ratio
      FROM usage_stats
      WHERE total_used_period > 0
      ORDER BY turnover_ratio DESC
      LIMIT 15
    `, categoryFilter ? [categoryFilter] : [])

    // Category breakdown
    const categoryBreakdownResult = await query(`
      SELECT 
        category,
        COUNT(*) as material_count,
        SUM("inStock") as total_stock,
        SUM("inStock" * cost) as total_value,
        AVG(CASE 
          WHEN "minStock" > 0 THEN ("inStock" / "minStock") * 100
          ELSE 100
        END) as avg_stock_percentage
      FROM "Material"
      WHERE active = TRUE
        ${categoryFilter ? 'AND category = $1' : ''}
      GROUP BY category
      ORDER BY total_value DESC
    `, categoryFilter ? [categoryFilter] : [])

    // Recent stock alerts (materials that went below minimum in last 7 days)
    const recentAlertsResult = await query(`
      SELECT DISTINCT ON (sm."materialId")
        sm."materialId",
        m.code,
        m.name,
        m.category,
        m."inStock",
        m."minStock",
        sm."quantityAfter",
        sm."createdAt"
      FROM "StockMovement" sm
      INNER JOIN "Material" m ON sm."materialId" = m.id
      WHERE sm."createdAt" >= NOW() - INTERVAL '7 days'
        AND sm."quantityAfter" <= m."minStock"
        AND m.active = TRUE
        ${categoryFilter ? 'AND m.category = $1' : ''}
      ORDER BY sm."materialId", sm."createdAt" DESC
      LIMIT 10
    `, categoryFilter ? [categoryFilter] : [])

    return NextResponse.json({
      stockLevels: stockLevelsResult.rows.map(row => ({
        level: row.stock_level,
        count: parseInt(row.count),
        totalValue: parseFloat(row.total_value || 0)
      })),
      
      movementTrends: movementTrendsResult.rows.map(row => ({
        date: row.date,
        type: row.type,
        transactionCount: parseInt(row.transaction_count),
        totalQuantity: parseFloat(row.total_quantity || 0),
        totalValue: parseFloat(row.total_value || 0)
      })),
      
      topMaterialsByValue: topMaterialsByValueResult.rows.map(row => ({
        id: row.id,
        code: row.code,
        name: row.name,
        category: row.category,
        inStock: parseFloat(row.inStock || 0),
        cost: parseFloat(row.cost || 0),
        totalValue: parseFloat(row.total_value || 0),
        stockPercentage: parseFloat(row.stock_percentage || 0)
      })),
      
      mostUsedMaterials: mostUsedMaterialsResult.rows.map(row => ({
        id: row.id,
        code: row.code,
        name: row.name,
        category: row.category,
        unit: row.unit,
        totalUsed: parseFloat(row.total_used || 0),
        jobsUsedOn: parseInt(row.jobs_used_on || 0),
        totalCost: parseFloat(row.total_cost || 0),
        avgUsagePerJob: parseFloat(row.avg_usage_per_job || 0)
      })),
      
      turnoverAnalysis: turnoverAnalysisResult.rows.map(row => ({
        id: row.id,
        code: row.code,
        name: row.name,
        category: row.category,
        inStock: parseFloat(row.inStock || 0),
        totalUsedPeriod: parseFloat(row.total_used_period || 0),
        daysOfStock: parseFloat(row.days_of_stock || 0),
        turnoverRatio: parseFloat(row.turnover_ratio || 0)
      })),
      
      categoryBreakdown: categoryBreakdownResult.rows.map(row => ({
        category: row.category,
        materialCount: parseInt(row.material_count),
        totalStock: parseFloat(row.total_stock || 0),
        totalValue: parseFloat(row.total_value || 0),
        avgStockPercentage: parseFloat(row.avg_stock_percentage || 0)
      })),
      
      recentAlerts: recentAlertsResult.rows.map(row => ({
        materialId: row.materialId,
        code: row.code,
        name: row.name,
        category: row.category,
        currentStock: parseFloat(row.inStock || 0),
        minStock: parseFloat(row.minStock || 0),
        alertTriggeredAt: row.createdAt
      })),
      
      summary: {
        period: parseInt(period),
        categoryFilter: categoryFilter || null,
        totalMaterials: topMaterialsByValueResult.rows.length,
        totalValue: topMaterialsByValueResult.rows.reduce((sum, row) => sum + parseFloat(row.total_value || 0), 0)
      }
    })
  } catch (error) {
    console.error('Error fetching stock analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock analytics' },
      { status: 500 }
    )
  }
}