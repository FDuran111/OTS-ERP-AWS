-- Material Cost History Tracking
-- Track cost changes over time for better job costing and trend analysis

-- MaterialCostHistory table: Records every cost change
CREATE TABLE IF NOT EXISTS "MaterialCostHistory" (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "materialId" VARCHAR(36) NOT NULL REFERENCES "Material"(id) ON DELETE CASCADE,
  "previousCost" DECIMAL(12,2),
  "newCost" DECIMAL(12,2) NOT NULL,
  source VARCHAR(50) NOT NULL, -- MANUAL, PO_RECEIPT, VENDOR_UPDATE, IMPORT
  "effectiveDate" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "purchaseOrderId" VARCHAR(36) REFERENCES "PurchaseOrder"(id),
  "vendorId" VARCHAR(36) REFERENCES "Vendor"(id),
  "userId" VARCHAR(36) REFERENCES "User"(id), -- Who made the change
  notes TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cost_history_material ON "MaterialCostHistory"("materialId");
CREATE INDEX IF NOT EXISTS idx_cost_history_date ON "MaterialCostHistory"("effectiveDate");
CREATE INDEX IF NOT EXISTS idx_cost_history_source ON "MaterialCostHistory"(source);
CREATE INDEX IF NOT EXISTS idx_cost_history_po ON "MaterialCostHistory"("purchaseOrderId") WHERE "purchaseOrderId" IS NOT NULL;

-- Trigger to automatically create cost history when material cost changes
CREATE OR REPLACE FUNCTION track_material_cost_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if cost actually changed
  IF OLD.cost IS DISTINCT FROM NEW.cost THEN
    INSERT INTO "MaterialCostHistory" (
      id, "materialId", "previousCost", "newCost", 
      source, "effectiveDate", "userId", "createdAt"
    ) VALUES (
      gen_random_uuid()::text,
      NEW.id,
      OLD.cost,
      NEW.cost,
      'MANUAL', -- Default source, can be overridden by application
      CURRENT_TIMESTAMP,
      NEW."updatedBy", -- Assumes Material table has updatedBy field
      CURRENT_TIMESTAMP
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_material_cost
AFTER UPDATE ON "Material"
FOR EACH ROW
WHEN (OLD.cost IS DISTINCT FROM NEW.cost)
EXECUTE FUNCTION track_material_cost_change();

-- Function to get average cost over a period
CREATE OR REPLACE FUNCTION get_avg_material_cost(
  p_material_id VARCHAR,
  p_days INTEGER DEFAULT 90
)
RETURNS DECIMAL AS $$
DECLARE
  avg_cost DECIMAL(12,2);
BEGIN
  SELECT AVG("newCost")
  INTO avg_cost
  FROM "MaterialCostHistory"
  WHERE "materialId" = p_material_id
    AND "effectiveDate" >= CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL;
  
  RETURN COALESCE(avg_cost, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get cost trend (percentage change)
CREATE OR REPLACE FUNCTION get_material_cost_trend(
  p_material_id VARCHAR,
  p_days INTEGER DEFAULT 90
)
RETURNS DECIMAL AS $$
DECLARE
  first_cost DECIMAL(12,2);
  last_cost DECIMAL(12,2);
  trend DECIMAL(12,2);
BEGIN
  -- Get first cost in period
  SELECT "newCost" INTO first_cost
  FROM "MaterialCostHistory"
  WHERE "materialId" = p_material_id
    AND "effectiveDate" >= CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL
  ORDER BY "effectiveDate" ASC
  LIMIT 1;
  
  -- Get last cost in period
  SELECT "newCost" INTO last_cost
  FROM "MaterialCostHistory"
  WHERE "materialId" = p_material_id
    AND "effectiveDate" >= CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL
  ORDER BY "effectiveDate" DESC
  LIMIT 1;
  
  IF first_cost IS NULL OR first_cost = 0 THEN
    RETURN 0;
  END IF;
  
  trend := ((last_cost - first_cost) / first_cost) * 100;
  
  RETURN COALESCE(trend, 0);
END;
$$ LANGUAGE plpgsql;

-- View for cost trends with statistics
CREATE OR REPLACE VIEW "MaterialCostTrends" AS
SELECT 
  m.id as "materialId",
  m.code,
  m.name,
  m.cost as "currentCost",
  get_avg_material_cost(m.id, 30) as "avgCost30Days",
  get_avg_material_cost(m.id, 90) as "avgCost90Days",
  get_material_cost_trend(m.id, 30) as "costTrend30Days",
  get_material_cost_trend(m.id, 90) as "costTrend90Days",
  (
    SELECT COUNT(*)
    FROM "MaterialCostHistory" mch
    WHERE mch."materialId" = m.id
      AND mch."effectiveDate" >= CURRENT_TIMESTAMP - INTERVAL '90 days'
  ) as "changeCount90Days",
  (
    SELECT MAX("effectiveDate")
    FROM "MaterialCostHistory" mch
    WHERE mch."materialId" = m.id
  ) as "lastCostChange"
FROM "Material" m
WHERE m.active = true;

-- Function to get cost at a specific date (for historical job costing)
CREATE OR REPLACE FUNCTION get_material_cost_at_date(
  p_material_id VARCHAR,
  p_date TIMESTAMP
)
RETURNS DECIMAL AS $$
DECLARE
  historical_cost DECIMAL(12,2);
BEGIN
  -- Get the most recent cost at or before the specified date
  SELECT "newCost" INTO historical_cost
  FROM "MaterialCostHistory"
  WHERE "materialId" = p_material_id
    AND "effectiveDate" <= p_date
  ORDER BY "effectiveDate" DESC
  LIMIT 1;
  
  -- If no history found, use current cost
  IF historical_cost IS NULL THEN
    SELECT cost INTO historical_cost
    FROM "Material"
    WHERE id = p_material_id;
  END IF;
  
  RETURN COALESCE(historical_cost, 0);
END;
$$ LANGUAGE plpgsql;
