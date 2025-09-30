import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const abcClass = searchParams.get('abcClass')
    const minStockoutProb = searchParams.get('minStockoutProb')
    const limit = searchParams.get('limit') || '100'

    // Build WHERE clause
    const conditions: string[] = []
    const params: any[] = []
    let paramCount = 0

    if (abcClass) {
      paramCount++
      conditions.push(`fc."abcClass" = $${paramCount}`)
      params.push(abcClass)
    }

    if (minStockoutProb) {
      paramCount++
      conditions.push(`fc."stockoutProbability" >= $${paramCount}`)
      params.push(parseFloat(minStockoutProb))
    }

    const whereClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : ''

    // Fetch forecast data with material details
    const result = await query(`
      SELECT 
        m.id,
        m.code,
        m.name,
        m.category,
        m.unit,
        m."inStock",
        m."minStock",
        m.cost,
        m.price,
        fc."abcClass",
        fc."avgDailyUsage",
        fc."usageVariance",
        fc."leadTimeDays",
        fc."reorderPoint",
        fc."economicOrderQty",
        fc."stockoutDate",
        fc."stockoutProbability",
        fc."confidenceScore",
        fc."totalUsageLast30Days",
        fc."totalUsageLast90Days",
        fc."totalUsageLast365Days",
        fc."jobsUsedOnLast90Days",
        fc."lastUsedDate",
        fc."calculatedAt",
        CASE 
          WHEN m."inStock" <= m."minStock" * 0.5 THEN 'CRITICAL'
          WHEN m."inStock" <= m."minStock" THEN 'LOW'
          WHEN m."inStock" <= fc."reorderPoint" THEN 'REORDER'
          ELSE 'OK'
        END as stock_status
      FROM "Material" m
      LEFT JOIN "ForecastCache" fc ON m.id = fc."materialId"
      WHERE m.active = TRUE ${whereClause}
      ORDER BY 
        CASE fc."abcClass"
          WHEN 'A' THEN 1
          WHEN 'B' THEN 2
          WHEN 'C' THEN 3
          ELSE 4
        END,
        fc."stockoutProbability" DESC NULLS LAST,
        m.code
      LIMIT $${paramCount + 1}
    `, [...params, parseInt(limit)])

    // Calculate summary statistics
    const summaryResult = await query(`
      SELECT 
        COUNT(*) as total_materials,
        SUM(CASE WHEN fc."abcClass" = 'A' THEN 1 ELSE 0 END) as class_a_count,
        SUM(CASE WHEN fc."abcClass" = 'B' THEN 1 ELSE 0 END) as class_b_count,
        SUM(CASE WHEN fc."abcClass" = 'C' THEN 1 ELSE 0 END) as class_c_count,
        SUM(CASE WHEN m."inStock" <= m."minStock" THEN 1 ELSE 0 END) as low_stock_count,
        SUM(CASE WHEN m."inStock" <= fc."reorderPoint" THEN 1 ELSE 0 END) as reorder_count,
        SUM(CASE WHEN fc."stockoutProbability" >= 75 THEN 1 ELSE 0 END) as high_risk_count,
        AVG(fc."confidenceScore") as avg_confidence
      FROM "Material" m
      LEFT JOIN "ForecastCache" fc ON m.id = fc."materialId"
      WHERE m.active = TRUE
    `)

    const summary = summaryResult.rows[0]

    return NextResponse.json({
      materials: result.rows.map(row => ({
        id: row.id,
        code: row.code,
        name: row.name,
        category: row.category,
        unit: row.unit,
        inStock: parseFloat(row.inStock || 0),
        minStock: parseFloat(row.minStock || 0),
        cost: parseFloat(row.cost || 0),
        price: parseFloat(row.price || 0),
        abcClass: row.abcClass,
        avgDailyUsage: parseFloat(row.avgDailyUsage || 0),
        usageVariance: parseFloat(row.usageVariance || 0),
        leadTimeDays: row.leadTimeDays,
        reorderPoint: parseFloat(row.reorderPoint || 0),
        economicOrderQty: parseFloat(row.economicOrderQty || 0),
        stockoutDate: row.stockoutDate,
        stockoutProbability: parseFloat(row.stockoutProbability || 0),
        confidenceScore: parseFloat(row.confidenceScore || 0),
        totalUsageLast30Days: parseFloat(row.totalUsageLast30Days || 0),
        totalUsageLast90Days: parseFloat(row.totalUsageLast90Days || 0),
        totalUsageLast365Days: parseFloat(row.totalUsageLast365Days || 0),
        jobsUsedOnLast90Days: row.jobsUsedOnLast90Days,
        lastUsedDate: row.lastUsedDate,
        stockStatus: row.stock_status,
        calculatedAt: row.calculatedAt
      })),
      summary: {
        totalMaterials: parseInt(summary.total_materials || 0),
        classACount: parseInt(summary.class_a_count || 0),
        classBCount: parseInt(summary.class_b_count || 0),
        classCCount: parseInt(summary.class_c_count || 0),
        lowStockCount: parseInt(summary.low_stock_count || 0),
        reorderCount: parseInt(summary.reorder_count || 0),
        highRiskCount: parseInt(summary.high_risk_count || 0),
        avgConfidence: parseFloat(summary.avg_confidence || 0)
      }
    })

  } catch (error) {
    console.error('Error fetching material forecast:', error)
    return NextResponse.json(
      { error: 'Failed to fetch material forecast' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { materialIds } = body

    let refreshedCount = 0

    if (materialIds && Array.isArray(materialIds)) {
      // Refresh specific materials
      for (const materialId of materialIds) {
        await query('SELECT refresh_material_forecast($1)', [materialId])
        refreshedCount++
      }
    } else {
      // Refresh all forecasts
      const result = await query('SELECT refresh_all_forecasts() as count')
      refreshedCount = result.rows[0]?.count || 0
    }

    return NextResponse.json({
      success: true,
      refreshedCount,
      message: `Successfully refreshed forecasts for ${refreshedCount} material(s)`
    })

  } catch (error) {
    console.error('Error refreshing forecasts:', error)
    return NextResponse.json(
      { error: 'Failed to refresh forecasts' },
      { status: 500 }
    )
  }
}
