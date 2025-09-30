-- Fix Forecasting: Proper ABC classification, calculate all metrics, add indexes

-- 1. Fix ABC class CHECK constraint to properly allow NULL
ALTER TABLE "ForecastCache"
DROP CONSTRAINT IF EXISTS "ForecastCache_abcClass_check";

ALTER TABLE "ForecastCache"
ADD CONSTRAINT "ForecastCache_abcClass_check" 
CHECK ("abcClass" IS NULL OR "abcClass" IN ('A', 'B', 'C'));

-- 2. Add composite index on StockMovement for forecasting queries
CREATE INDEX IF NOT EXISTS idx_stock_movement_material_date 
ON "StockMovement"("materialId", "createdAt");

CREATE INDEX IF NOT EXISTS idx_stock_movement_usage 
ON "StockMovement"("materialId", "createdAt") 
WHERE type IN ('REMOVE', 'USAGE');

-- 3. Replace ABC classification with proper cumulative value ranking
CREATE OR REPLACE FUNCTION calculate_abc_class(
  p_material_id VARCHAR,
  p_days INTEGER DEFAULT 365
)
RETURNS VARCHAR AS $$
DECLARE
  v_usage_value DECIMAL(12,2);
  v_cumulative_pct DECIMAL(5,2);
BEGIN
  -- Calculate cumulative percentage using window function
  WITH material_usage AS (
    SELECT 
      sm."materialId",
      SUM(ABS(sm.quantity)) * m.cost as usage_value
    FROM "StockMovement" sm
    JOIN "Material" m ON sm."materialId" = m.id
    WHERE sm.type IN ('REMOVE', 'USAGE')
      AND sm."createdAt" >= CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL
    GROUP BY sm."materialId", m.cost
  ),
  ranked_materials AS (
    SELECT 
      "materialId",
      usage_value,
      SUM(usage_value) OVER (ORDER BY usage_value DESC) as cumulative_value,
      SUM(usage_value) OVER () as total_value
    FROM material_usage
  )
  SELECT 
    CASE 
      WHEN total_value = 0 THEN NULL
      ELSE (cumulative_value / total_value * 100)::DECIMAL(5,2)
    END
  INTO v_cumulative_pct
  FROM ranked_materials
  WHERE "materialId" = p_material_id;
  
  -- If no usage, return C
  IF v_cumulative_pct IS NULL THEN
    RETURN 'C';
  END IF;
  
  -- ABC classification: A = top 80% of value, B = next 15%, C = remaining 5%
  IF v_cumulative_pct <= 80 THEN
    RETURN 'A';
  ELSIF v_cumulative_pct <= 95 THEN
    RETURN 'B';
  ELSE
    RETURN 'C';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Calculate usage variance for demand stability
CREATE OR REPLACE FUNCTION calculate_usage_variance(
  p_material_id VARCHAR,
  p_days INTEGER DEFAULT 90
)
RETURNS DECIMAL AS $$
DECLARE
  v_avg_usage DECIMAL(12,3);
  v_variance DECIMAL(12,3);
BEGIN
  -- Get average daily usage
  SELECT calculate_avg_daily_usage(p_material_id, p_days) INTO v_avg_usage;
  
  IF v_avg_usage = 0 THEN
    RETURN 0;
  END IF;
  
  -- Calculate variance from daily usage
  WITH daily_usage AS (
    SELECT 
      DATE("createdAt") as usage_date,
      SUM(ABS(quantity)) as daily_qty
    FROM "StockMovement"
    WHERE "materialId" = p_material_id
      AND type IN ('REMOVE', 'USAGE')
      AND "createdAt" >= CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL
    GROUP BY DATE("createdAt")
  )
  SELECT COALESCE(
    VARIANCE(daily_qty),
    0
  ) INTO v_variance
  FROM daily_usage;
  
  RETURN v_variance;
END;
$$ LANGUAGE plpgsql;

-- 5. Calculate reorder point (safety stock + lead time demand)
CREATE OR REPLACE FUNCTION calculate_reorder_point(
  p_material_id VARCHAR
)
RETURNS DECIMAL AS $$
DECLARE
  v_avg_daily_usage DECIMAL(12,3);
  v_lead_time_days INTEGER;
  v_usage_variance DECIMAL(12,3);
  v_safety_stock DECIMAL(12,3);
  v_reorder_point DECIMAL(12,3);
BEGIN
  -- Get average daily usage
  SELECT calculate_avg_daily_usage(p_material_id, 90) INTO v_avg_daily_usage;
  
  -- Get lead time from MaterialVendorPrice or default to 7 days
  SELECT COALESCE(MIN("leadTimeDays"), 7) INTO v_lead_time_days
  FROM "MaterialVendorPrice"
  WHERE "materialId" = p_material_id AND active = true;
  
  -- Get usage variance
  SELECT calculate_usage_variance(p_material_id, 90) INTO v_usage_variance;
  
  -- Safety stock: 1.65 * sqrt(lead_time * variance) for 95% service level
  v_safety_stock := 1.65 * SQRT(v_lead_time_days * COALESCE(v_usage_variance, 0));
  
  -- Reorder point = (avg daily usage * lead time) + safety stock
  v_reorder_point := (v_avg_daily_usage * v_lead_time_days) + v_safety_stock;
  
  RETURN GREATEST(v_reorder_point, 0);
END;
$$ LANGUAGE plpgsql;

-- 6. Calculate Economic Order Quantity (EOQ)
CREATE OR REPLACE FUNCTION calculate_eoq(
  p_material_id VARCHAR
)
RETURNS DECIMAL AS $$
DECLARE
  v_annual_demand DECIMAL(12,3);
  v_unit_cost DECIMAL(12,2);
  v_ordering_cost DECIMAL(12,2) := 50.00; -- Default PO processing cost
  v_holding_cost_pct DECIMAL(5,2) := 0.25; -- 25% of item cost annually
  v_eoq DECIMAL(12,3);
BEGIN
  -- Get annual demand (usage last 365 days)
  SELECT COALESCE(SUM(ABS(quantity)), 0) INTO v_annual_demand
  FROM "StockMovement"
  WHERE "materialId" = p_material_id
    AND type IN ('REMOVE', 'USAGE')
    AND "createdAt" >= CURRENT_TIMESTAMP - INTERVAL '365 days';
  
  IF v_annual_demand = 0 THEN
    RETURN 0;
  END IF;
  
  -- Get unit cost
  SELECT cost INTO v_unit_cost
  FROM "Material"
  WHERE id = p_material_id;
  
  -- EOQ formula: sqrt((2 * D * S) / (H * C))
  -- D = annual demand, S = ordering cost, H = holding cost %, C = unit cost
  v_eoq := SQRT(
    (2 * v_annual_demand * v_ordering_cost) / 
    (v_holding_cost_pct * COALESCE(v_unit_cost, 1))
  );
  
  RETURN GREATEST(v_eoq, 1);
END;
$$ LANGUAGE plpgsql;

-- 7. Calculate stockout probability based on current stock vs usage trend
CREATE OR REPLACE FUNCTION calculate_stockout_probability(
  p_material_id VARCHAR
)
RETURNS DECIMAL AS $$
DECLARE
  v_current_stock DECIMAL(12,3);
  v_reorder_point DECIMAL(12,3);
  v_avg_daily_usage DECIMAL(12,3);
  v_days_of_stock DECIMAL(12,2);
  v_probability DECIMAL(5,2);
BEGIN
  -- Get current stock
  SELECT "inStock" INTO v_current_stock
  FROM "Material"
  WHERE id = p_material_id;
  
  -- Get reorder point and average usage
  SELECT calculate_reorder_point(p_material_id) INTO v_reorder_point;
  SELECT calculate_avg_daily_usage(p_material_id, 90) INTO v_avg_daily_usage;
  
  IF v_avg_daily_usage = 0 THEN
    RETURN 0; -- No usage pattern
  END IF;
  
  v_days_of_stock := v_current_stock / v_avg_daily_usage;
  
  -- Calculate probability based on stock level
  -- Below reorder point = higher probability
  IF v_current_stock <= 0 THEN
    v_probability := 100;
  ELSIF v_current_stock < v_reorder_point THEN
    v_probability := 75 - (v_current_stock / v_reorder_point * 75);
  ELSIF v_days_of_stock < 14 THEN
    v_probability := 50;
  ELSIF v_days_of_stock < 30 THEN
    v_probability := 25;
  ELSE
    v_probability := 5;
  END IF;
  
  RETURN LEAST(v_probability, 100);
END;
$$ LANGUAGE plpgsql;

-- 8. Calculate confidence score based on data availability
CREATE OR REPLACE FUNCTION calculate_confidence_score(
  p_material_id VARCHAR
)
RETURNS DECIMAL AS $$
DECLARE
  v_days_with_data INTEGER;
  v_transaction_count INTEGER;
  v_jobs_count INTEGER;
  v_confidence DECIMAL(5,2);
BEGIN
  -- Count days with usage data
  SELECT COUNT(DISTINCT DATE("createdAt")) INTO v_days_with_data
  FROM "StockMovement"
  WHERE "materialId" = p_material_id
    AND type IN ('REMOVE', 'USAGE')
    AND "createdAt" >= CURRENT_TIMESTAMP - INTERVAL '90 days';
  
  -- Count transactions
  SELECT COUNT(*) INTO v_transaction_count
  FROM "StockMovement"
  WHERE "materialId" = p_material_id
    AND type IN ('REMOVE', 'USAGE')
    AND "createdAt" >= CURRENT_TIMESTAMP - INTERVAL '90 days';
  
  -- Count jobs
  SELECT COUNT(DISTINCT "jobId") INTO v_jobs_count
  FROM "StockMovement"
  WHERE "materialId" = p_material_id
    AND "jobId" IS NOT NULL
    AND "createdAt" >= CURRENT_TIMESTAMP - INTERVAL '90 days';
  
  -- Calculate confidence: more data = higher confidence
  v_confidence := LEAST(
    (v_days_with_data::DECIMAL / 90 * 40) +  -- Up to 40 points for days
    (LEAST(v_transaction_count, 50)::DECIMAL / 50 * 35) +  -- Up to 35 points for transactions
    (LEAST(v_jobs_count, 10)::DECIMAL / 10 * 25),  -- Up to 25 points for jobs
    100
  );
  
  RETURN v_confidence;
END;
$$ LANGUAGE plpgsql;

-- 9. Enhanced refresh function with all metrics
CREATE OR REPLACE FUNCTION refresh_material_forecast(p_material_id VARCHAR)
RETURNS VOID AS $$
DECLARE
  v_abc_class VARCHAR(1);
  v_avg_daily DECIMAL(12,3);
  v_usage_variance DECIMAL(12,3);
  v_reorder_point DECIMAL(12,3);
  v_eoq DECIMAL(12,3);
  v_stockout_date TIMESTAMP;
  v_stockout_prob DECIMAL(5,2);
  v_confidence DECIMAL(5,2);
  v_usage_30 DECIMAL(12,3);
  v_usage_90 DECIMAL(12,3);
  v_usage_365 DECIMAL(12,3);
  v_jobs_count INTEGER;
  v_last_used TIMESTAMP;
BEGIN
  -- Calculate all metrics
  v_abc_class := calculate_abc_class(p_material_id, 365);
  v_avg_daily := calculate_avg_daily_usage(p_material_id, 90);
  v_usage_variance := calculate_usage_variance(p_material_id, 90);
  v_reorder_point := calculate_reorder_point(p_material_id);
  v_eoq := calculate_eoq(p_material_id);
  v_stockout_date := predict_stockout_date(p_material_id);
  v_stockout_prob := calculate_stockout_probability(p_material_id);
  v_confidence := calculate_confidence_score(p_material_id);
  
  -- Get usage statistics
  SELECT COALESCE(SUM(ABS(quantity)), 0) INTO v_usage_30
  FROM "StockMovement"
  WHERE "materialId" = p_material_id
    AND type IN ('REMOVE', 'USAGE')
    AND "createdAt" >= CURRENT_TIMESTAMP - INTERVAL '30 days';
    
  SELECT COALESCE(SUM(ABS(quantity)), 0) INTO v_usage_90
  FROM "StockMovement"
  WHERE "materialId" = p_material_id
    AND type IN ('REMOVE', 'USAGE')
    AND "createdAt" >= CURRENT_TIMESTAMP - INTERVAL '90 days';
    
  SELECT COALESCE(SUM(ABS(quantity)), 0) INTO v_usage_365
  FROM "StockMovement"
  WHERE "materialId" = p_material_id
    AND type IN ('REMOVE', 'USAGE')
    AND "createdAt" >= CURRENT_TIMESTAMP - INTERVAL '365 days';
  
  -- Count jobs
  SELECT COUNT(DISTINCT "jobId") INTO v_jobs_count
  FROM "StockMovement"
  WHERE "materialId" = p_material_id
    AND "jobId" IS NOT NULL
    AND "createdAt" >= CURRENT_TIMESTAMP - INTERVAL '90 days';
  
  -- Get last used date
  SELECT MAX("createdAt") INTO v_last_used
  FROM "StockMovement"
  WHERE "materialId" = p_material_id
    AND type IN ('REMOVE', 'USAGE');
  
  -- Upsert forecast cache with ALL metrics
  INSERT INTO "ForecastCache" (
    "materialId", "abcClass", "avgDailyUsage", "usageVariance",
    "reorderPoint", "economicOrderQty", "stockoutDate", "stockoutProbability",
    "confidenceScore", "totalUsageLast30Days", "totalUsageLast90Days", 
    "totalUsageLast365Days", "jobsUsedOnLast90Days", "lastUsedDate", 
    "calculatedAt", "updatedAt"
  ) VALUES (
    p_material_id, v_abc_class, v_avg_daily, v_usage_variance,
    v_reorder_point, v_eoq, v_stockout_date, v_stockout_prob,
    v_confidence, v_usage_30, v_usage_90, v_usage_365,
    v_jobs_count, v_last_used, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  )
  ON CONFLICT ("materialId")
  DO UPDATE SET
    "abcClass" = EXCLUDED."abcClass",
    "avgDailyUsage" = EXCLUDED."avgDailyUsage",
    "usageVariance" = EXCLUDED."usageVariance",
    "reorderPoint" = EXCLUDED."reorderPoint",
    "economicOrderQty" = EXCLUDED."economicOrderQty",
    "stockoutDate" = EXCLUDED."stockoutDate",
    "stockoutProbability" = EXCLUDED."stockoutProbability",
    "confidenceScore" = EXCLUDED."confidenceScore",
    "totalUsageLast30Days" = EXCLUDED."totalUsageLast30Days",
    "totalUsageLast90Days" = EXCLUDED."totalUsageLast90Days",
    "totalUsageLast365Days" = EXCLUDED."totalUsageLast365Days",
    "jobsUsedOnLast90Days" = EXCLUDED."jobsUsedOnLast90Days",
    "lastUsedDate" = EXCLUDED."lastUsedDate",
    "calculatedAt" = EXCLUDED."calculatedAt",
    "updatedAt" = EXCLUDED."updatedAt";
END;
$$ LANGUAGE plpgsql;
