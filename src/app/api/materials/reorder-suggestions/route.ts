import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = parseInt(searchParams.get('period') || '90') // Analysis period in days
    const minConfidence = parseFloat(searchParams.get('minConfidence') || '0.7') // Minimum confidence threshold

    // Calculate reorder suggestions based on usage patterns and trends
    const suggestionsResult = await query(`
      WITH material_stats AS (
        SELECT 
          m.id,
          m.code,
          m.name,
          m.category,
          m.unit,
          m."inStock",
          m."minStock",
          m.cost,
          m."vendorId",
          
          -- Usage analysis from MaterialUsage
          COALESCE(SUM(mu."quantity"), 0) as total_used_period,
          COUNT(mu.id) as usage_transactions,
          COUNT(DISTINCT mu."jobId") as jobs_used_on,
          
          -- Calculate average daily usage
          CASE 
            WHEN COUNT(mu.id) > 0 
            THEN COALESCE(SUM(mu."quantity"), 0) / ${period}::float
            ELSE 0
          END as avg_daily_usage,
          
          -- Calculate usage trend (comparing first half vs second half of period)
          COALESCE(
            SUM(CASE 
              WHEN mu."createdAt" >= NOW() - INTERVAL '${Math.floor(period/2)} days' 
              THEN mu."quantity" 
              ELSE 0 
            END) / ${Math.floor(period/2)}::float, 0
          ) as recent_daily_usage,
          
          COALESCE(
            SUM(CASE 
              WHEN mu."createdAt" < NOW() - INTERVAL '${Math.floor(period/2)} days' 
              THEN mu."quantity" 
              ELSE 0 
            END) / ${Math.floor(period/2)}::float, 0
          ) as earlier_daily_usage,
          
          -- Stock movement analysis
          COALESCE(
            (SELECT COUNT(*) 
             FROM "StockMovement" sm 
             WHERE sm."materialId" = m.id 
               AND sm."createdAt" >= NOW() - INTERVAL '${period} days'
               AND sm.type IN ('ADJUSTMENT_OUT', 'JOB_USAGE')
            ), 0
          ) as outbound_movements,
          
          -- Lead time estimation (days between stock movements)
          COALESCE(
            (SELECT AVG(EXTRACT(DAY FROM (lead_time.next_date - lead_time.current_date)))
             FROM (
               SELECT 
                 sm."createdAt" as current_date,
                 LEAD(sm."createdAt") OVER (ORDER BY sm."createdAt") as next_date
               FROM "StockMovement" sm
               WHERE sm."materialId" = m.id 
                 AND sm.type IN ('PURCHASE', 'ADJUSTMENT_IN')
                 AND sm."createdAt" >= NOW() - INTERVAL '${period * 2} days'
             ) lead_time
             WHERE lead_time.next_date IS NOT NULL
            ), 14
          ) as estimated_lead_time_days
          
        FROM "Material" m
        LEFT JOIN "MaterialUsage" mu ON m.id = mu."materialId" 
          AND mu."createdAt" >= NOW() - INTERVAL '${period} days'
        WHERE m.active = TRUE
        GROUP BY m.id, m.code, m.name, m.category, m.unit, m."inStock", m."minStock", m.cost, m."vendorId"
      ),
      
      suggestions AS (
        SELECT 
          *,
          -- Calculate trend factor (how usage is changing)
          CASE 
            WHEN earlier_daily_usage > 0 AND recent_daily_usage > 0
            THEN recent_daily_usage / earlier_daily_usage
            ELSE 1.0
          END as trend_factor,
          
          -- Calculate suggested minimum stock (safety stock + lead time stock)
          GREATEST(
            "minStock",
            CEIL(
              (avg_daily_usage * estimated_lead_time_days * 1.5) + -- Lead time stock with 50% buffer
              (avg_daily_usage * 7) -- One week safety stock
            )
          ) as suggested_min_stock,
          
          -- Calculate optimal reorder point
          CEIL(
            (avg_daily_usage * estimated_lead_time_days * 2) + -- Lead time stock with 100% buffer
            (avg_daily_usage * 14) -- Two weeks safety stock
          ) as suggested_reorder_point,
          
          -- Calculate suggested order quantity (economic order quantity approximation)
          GREATEST(
            "minStock",
            CEIL(avg_daily_usage * 30) -- 30 days worth of stock
          ) as suggested_order_quantity,
          
          -- Calculate confidence based on data quality
          CASE 
            WHEN usage_transactions >= 5 AND jobs_used_on >= 3 THEN 0.9
            WHEN usage_transactions >= 3 AND jobs_used_on >= 2 THEN 0.8
            WHEN usage_transactions >= 2 THEN 0.7
            WHEN usage_transactions >= 1 THEN 0.6
            ELSE 0.3
          END as confidence_score,
          
          -- Calculate days until stockout
          CASE 
            WHEN avg_daily_usage > 0 
            THEN "inStock" / avg_daily_usage
            ELSE 999
          END as days_until_stockout
          
        FROM material_stats
        WHERE avg_daily_usage > 0 OR "inStock" <= "minStock"
      )
      
      SELECT 
        *
      FROM (
        SELECT 
          id,
          code,
          name,
          category,
          unit,
          "inStock",
          "minStock",
          cost,
          total_used_period,
          usage_transactions,
          jobs_used_on,
          avg_daily_usage,
          trend_factor,
          suggested_min_stock,
          suggested_reorder_point,
          suggested_order_quantity,
          confidence_score,
          days_until_stockout,
          estimated_lead_time_days,
          
          -- Determine urgency
          CASE 
            WHEN "inStock" <= 0 THEN 'CRITICAL'
            WHEN days_until_stockout <= 7 THEN 'URGENT'
            WHEN "inStock" <= suggested_reorder_point THEN 'MEDIUM'
            WHEN "inStock" <= suggested_min_stock THEN 'LOW'
            ELSE 'NORMAL'
          END as urgency,
          
          -- Calculate potential cost savings
          (suggested_order_quantity * cost) as estimated_order_cost,
          
          -- Reason for suggestion
          CASE 
            WHEN "inStock" <= 0 THEN 'Out of stock - immediate reorder required'
            WHEN days_until_stockout <= 7 THEN 'Low stock - will run out in ' || ROUND(days_until_stockout) || ' days'
            WHEN "inStock" <= suggested_reorder_point THEN 'Below optimal reorder point'
            WHEN trend_factor > 1.2 THEN 'Usage trending up significantly (' || ROUND((trend_factor - 1) * 100) || '% increase)'
            WHEN "minStock" < suggested_min_stock THEN 'Current minimum stock too low for usage pattern'
            ELSE 'Optimization opportunity'
          END as reason
          
        FROM suggestions
        WHERE confidence_score >= $1
      ) AS final_suggestions
      ORDER BY 
        CASE 
          WHEN urgency = 'CRITICAL' THEN 1
          WHEN urgency = 'URGENT' THEN 2
          WHEN urgency = 'MEDIUM' THEN 3
          WHEN urgency = 'LOW' THEN 4
          ELSE 5
        END,
        days_until_stockout ASC,
        confidence_score DESC
    `, [minConfidence])

    const suggestions = suggestionsResult.rows.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      category: row.category,
      unit: row.unit,
      currentStock: parseFloat(row.inStock || 0),
      currentMinStock: parseFloat(row.minStock || 0),
      cost: parseFloat(row.cost || 0),
      totalUsedPeriod: parseFloat(row.total_used_period || 0),
      usageTransactions: parseInt(row.usage_transactions || 0),
      jobsUsedOn: parseInt(row.jobs_used_on || 0),
      avgDailyUsage: parseFloat(row.avg_daily_usage || 0),
      trendFactor: parseFloat(row.trend_factor || 1),
      suggestedMinStock: parseInt(row.suggested_min_stock || 0),
      suggestedReorderPoint: parseInt(row.suggested_reorder_point || 0),
      suggestedOrderQuantity: parseInt(row.suggested_order_quantity || 0),
      confidenceScore: parseFloat(row.confidence_score || 0),
      daysUntilStockout: parseFloat(row.days_until_stockout || 999),
      estimatedLeadTimeDays: parseFloat(row.estimated_lead_time_days || 14),
      urgency: row.urgency,
      estimatedOrderCost: parseFloat(row.estimated_order_cost || 0),
      reason: row.reason,
    }))

    // Calculate summary statistics
    const summary = {
      totalSuggestions: suggestions.length,
      criticalItems: suggestions.filter(s => s.urgency === 'CRITICAL').length,
      urgentItems: suggestions.filter(s => s.urgency === 'URGENT').length,
      totalEstimatedCost: suggestions.reduce((sum, s) => sum + s.estimatedOrderCost, 0),
      avgConfidence: suggestions.length > 0 
        ? suggestions.reduce((sum, s) => sum + s.confidenceScore, 0) / suggestions.length 
        : 0,
      period,
      minConfidence
    }

    return NextResponse.json({
      suggestions,
      summary
    })
  } catch (error) {
    console.error('Error generating reorder suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to generate reorder suggestions' },
      { status: 500 }
    )
  }
}