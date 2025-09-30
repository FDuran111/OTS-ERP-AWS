-- Material Forecasting and ABC Analysis Cache
-- Precomputed forecasting data for fast analytics and alerts

-- ForecastCache table: Stores precomputed forecasting metrics
CREATE TABLE IF NOT EXISTS "ForecastCache" (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "materialId" VARCHAR(36) NOT NULL UNIQUE REFERENCES "Material"(id) ON DELETE CASCADE,
  "abcClass" VARCHAR(1) CHECK ("abcClass" IN ('A', 'B', 'C', NULL)), -- ABC classification
  "avgDailyUsage" DECIMAL(12,3) DEFAULT 0, -- Average daily usage
  "usageVariance" DECIMAL(12,3) DEFAULT 0, -- Usage variance for demand stability
  "leadTimeDays" INTEGER DEFAULT 7, -- Estimated lead time from vendor
  "reorderPoint" DECIMAL(12,3) DEFAULT 0, -- When to reorder
  "economicOrderQty" DECIMAL(12,3) DEFAULT 0, -- Optimal order quantity
  "stockoutDate" TIMESTAMP, -- Predicted stockout date
  "stockoutProbability" DECIMAL(5,2), -- Probability of stockout (0-100)
  "confidenceScore" DECIMAL(5,2), -- Forecast confidence (0-100)
  "totalUsageLast30Days" DECIMAL(12,3) DEFAULT 0,
  "totalUsageLast90Days" DECIMAL(12,3) DEFAULT 0,
  "totalUsageLast365Days" DECIMAL(12,3) DEFAULT 0,
  "jobsUsedOnLast90Days" INTEGER DEFAULT 0,
  "lastUsedDate" TIMESTAMP,
  "calculatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_forecast_abc ON "ForecastCache"("abcClass") WHERE "abcClass" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_forecast_stockout ON "ForecastCache"("stockoutDate") WHERE "stockoutDate" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_forecast_material ON "ForecastCache"("materialId");
CREATE INDEX IF NOT EXISTS idx_forecast_calculated ON "ForecastCache"("calculatedAt");

-- Function to calculate ABC classification based on usage value
CREATE OR REPLACE FUNCTION calculate_abc_class(
  p_material_id VARCHAR,
  p_days INTEGER DEFAULT 365
)
RETURNS VARCHAR AS $$
DECLARE
  v_usage_value DECIMAL(12,2);
  v_total_value DECIMAL(12,2);
  v_cumulative_pct DECIMAL(5,2);
BEGIN
  -- Calculate total usage value for this material
  SELECT SUM(ABS(sm.quantity)) * m.cost
  INTO v_usage_value
  FROM "StockMovement" sm
  JOIN "Material" m ON sm."materialId" = m.id
  WHERE sm."materialId" = p_material_id
    AND sm.type IN ('REMOVE', 'USAGE')
    AND sm."createdAt" >= CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL;
  
  -- Calculate total value across all materials
  SELECT SUM(total_value)
  INTO v_total_value
  FROM (
    SELECT SUM(ABS(sm.quantity)) * m.cost as total_value
    FROM "StockMovement" sm
    JOIN "Material" m ON sm."materialId" = m.id
    WHERE sm.type IN ('REMOVE', 'USAGE')
      AND sm."createdAt" >= CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL
    GROUP BY sm."materialId"
  ) subq;
  
  IF v_total_value = 0 OR v_usage_value IS NULL THEN
    RETURN 'C'; -- No usage, classify as C
  END IF;
  
  -- Calculate cumulative percentage
  v_cumulative_pct := (v_usage_value / v_total_value) * 100;
  
  -- ABC classification: A=80%, B=15%, C=5%
  IF v_cumulative_pct >= 80 THEN
    RETURN 'A';
  ELSIF v_cumulative_pct >= 15 THEN
    RETURN 'B';
  ELSE
    RETURN 'C';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate average daily usage
CREATE OR REPLACE FUNCTION calculate_avg_daily_usage(
  p_material_id VARCHAR,
  p_days INTEGER DEFAULT 90
)
RETURNS DECIMAL AS $$
DECLARE
  v_total_usage DECIMAL(12,3);
  v_days INTEGER;
BEGIN
  -- Get total usage (REMOVE/USAGE movements)
  SELECT COALESCE(SUM(ABS(quantity)), 0)
  INTO v_total_usage
  FROM "StockMovement"
  WHERE "materialId" = p_material_id
    AND type IN ('REMOVE', 'USAGE')
    AND "createdAt" >= CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL;
  
  -- Count actual days with data
  SELECT COUNT(DISTINCT DATE("createdAt"))
  INTO v_days
  FROM "StockMovement"
  WHERE "materialId" = p_material_id
    AND type IN ('REMOVE', 'USAGE')
    AND "createdAt" >= CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL;
  
  IF v_days = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN v_total_usage / v_days;
END;
$$ LANGUAGE plpgsql;

-- Function to predict stockout date
CREATE OR REPLACE FUNCTION predict_stockout_date(
  p_material_id VARCHAR
)
RETURNS TIMESTAMP AS $$
DECLARE
  v_current_stock DECIMAL(12,3);
  v_avg_daily_usage DECIMAL(12,3);
  v_days_remaining DECIMAL(12,2);
BEGIN
  -- Get current stock
  SELECT "inStock" INTO v_current_stock
  FROM "Material"
  WHERE id = p_material_id;
  
  -- Get average daily usage
  SELECT calculate_avg_daily_usage(p_material_id, 90) INTO v_avg_daily_usage;
  
  IF v_avg_daily_usage <= 0 THEN
    RETURN NULL; -- No usage pattern, cannot predict
  END IF;
  
  v_days_remaining := v_current_stock / v_avg_daily_usage;
  
  IF v_days_remaining <= 0 THEN
    RETURN CURRENT_TIMESTAMP; -- Already out of stock
  END IF;
  
  RETURN CURRENT_TIMESTAMP + (v_days_remaining || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh forecast cache for a material
CREATE OR REPLACE FUNCTION refresh_material_forecast(p_material_id VARCHAR)
RETURNS VOID AS $$
DECLARE
  v_abc_class VARCHAR(1);
  v_avg_daily DECIMAL(12,3);
  v_stockout_date TIMESTAMP;
  v_usage_30 DECIMAL(12,3);
  v_usage_90 DECIMAL(12,3);
  v_usage_365 DECIMAL(12,3);
  v_jobs_count INTEGER;
  v_last_used TIMESTAMP;
BEGIN
  -- Calculate metrics
  v_abc_class := calculate_abc_class(p_material_id, 365);
  v_avg_daily := calculate_avg_daily_usage(p_material_id, 90);
  v_stockout_date := predict_stockout_date(p_material_id);
  
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
  
  -- Count jobs used on
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
  
  -- Upsert forecast cache
  INSERT INTO "ForecastCache" (
    "materialId", "abcClass", "avgDailyUsage", "stockoutDate",
    "totalUsageLast30Days", "totalUsageLast90Days", "totalUsageLast365Days",
    "jobsUsedOnLast90Days", "lastUsedDate", "calculatedAt", "updatedAt"
  ) VALUES (
    p_material_id, v_abc_class, v_avg_daily, v_stockout_date,
    v_usage_30, v_usage_90, v_usage_365,
    v_jobs_count, v_last_used, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  )
  ON CONFLICT ("materialId")
  DO UPDATE SET
    "abcClass" = EXCLUDED."abcClass",
    "avgDailyUsage" = EXCLUDED."avgDailyUsage",
    "stockoutDate" = EXCLUDED."stockoutDate",
    "totalUsageLast30Days" = EXCLUDED."totalUsageLast30Days",
    "totalUsageLast90Days" = EXCLUDED."totalUsageLast90Days",
    "totalUsageLast365Days" = EXCLUDED."totalUsageLast365Days",
    "jobsUsedOnLast90Days" = EXCLUDED."jobsUsedOnLast90Days",
    "lastUsedDate" = EXCLUDED."lastUsedDate",
    "calculatedAt" = EXCLUDED."calculatedAt",
    "updatedAt" = EXCLUDED."updatedAt";
END;
$$ LANGUAGE plpgsql;

-- Function to refresh all forecasts (for nightly job)
CREATE OR REPLACE FUNCTION refresh_all_forecasts()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_material RECORD;
BEGIN
  FOR v_material IN 
    SELECT id FROM "Material" WHERE active = true
  LOOP
    PERFORM refresh_material_forecast(v_material.id);
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
