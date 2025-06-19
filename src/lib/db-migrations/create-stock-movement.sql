-- Create StockMovement table for complete audit trail of inventory changes
CREATE TABLE IF NOT EXISTS "StockMovement" (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(12), 'base64'),
  "materialId" TEXT NOT NULL REFERENCES "Material"(id) ON DELETE CASCADE,
  "storageLocationId" TEXT REFERENCES "StorageLocation"(id) ON DELETE SET NULL,
  "jobId" TEXT REFERENCES "Job"(id) ON DELETE SET NULL, -- Track job-related usage
  "userId" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN (
    'INITIAL_STOCK',    -- Initial inventory setup
    'PURCHASE',         -- Stock added via purchase
    'ADJUSTMENT_IN',    -- Manual stock increase
    'ADJUSTMENT_OUT',   -- Manual stock decrease
    'JOB_USAGE',        -- Materials used on job
    'TRANSFER_IN',      -- Stock transferred in from another location
    'TRANSFER_OUT',     -- Stock transferred out to another location
    'WASTE',            -- Materials marked as waste/damaged
    'RETURN',           -- Materials returned/restocked
    'AUDIT_CORRECTION'  -- Audit-based corrections
  )),
  "quantityBefore" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "quantityChanged" DECIMAL(10,2) NOT NULL,
  "quantityAfter" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "unitCost" DECIMAL(10,2), -- Cost per unit at time of movement
  "totalValue" DECIMAL(10,2), -- Total value of movement
  reason TEXT,
  "referenceNumber" VARCHAR(100), -- PO number, job number, etc.
  metadata JSONB, -- Additional context data
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stock_movement_material_id ON "StockMovement"("materialId");
CREATE INDEX IF NOT EXISTS idx_stock_movement_created_at ON "StockMovement"("createdAt");
CREATE INDEX IF NOT EXISTS idx_stock_movement_type ON "StockMovement"(type);
CREATE INDEX IF NOT EXISTS idx_stock_movement_location ON "StockMovement"("storageLocationId");
CREATE INDEX IF NOT EXISTS idx_stock_movement_job ON "StockMovement"("jobId");
CREATE INDEX IF NOT EXISTS idx_stock_movement_user ON "StockMovement"("userId");

-- Create trigger function to automatically log stock movements
CREATE OR REPLACE FUNCTION log_stock_movement()
RETURNS TRIGGER AS $$
DECLARE
  movement_type TEXT;
  changed_quantity DECIMAL(10,2);
  previous_stock DECIMAL(10,2);
BEGIN
  -- Get previous stock level
  SELECT COALESCE("inStock", 0) INTO previous_stock 
  FROM "Material" 
  WHERE id = NEW.id;

  -- If this is an INSERT, previous stock was 0
  IF TG_OP = 'INSERT' THEN
    previous_stock := 0;
  ELSIF TG_OP = 'UPDATE' AND OLD."inStock" IS NOT NULL THEN
    previous_stock := OLD."inStock";
  END IF;

  -- Determine movement type and quantity change
  IF TG_OP = 'INSERT' THEN
    movement_type := 'INITIAL_STOCK';
    changed_quantity := NEW."inStock";
  ELSIF TG_OP = 'UPDATE' AND OLD."inStock" != NEW."inStock" THEN
    changed_quantity := NEW."inStock" - OLD."inStock";
    
    IF changed_quantity > 0 THEN
      movement_type := 'ADJUSTMENT_IN';
    ELSE
      movement_type := 'ADJUSTMENT_OUT';
    END IF;
  ELSE
    -- No stock change, don't log
    RETURN NEW;
  END IF;

  -- Insert stock movement record
  INSERT INTO "StockMovement" (
    "materialId",
    type,
    "quantityBefore",
    "quantityChanged", 
    "quantityAfter",
    "unitCost",
    "totalValue",
    reason,
    "createdAt"
  ) VALUES (
    NEW.id,
    movement_type,
    previous_stock,
    changed_quantity,
    NEW."inStock",
    NEW.cost,
    ABS(changed_quantity) * NEW.cost,
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'Initial material setup'
      ELSE 'Automatic stock adjustment'
    END,
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic stock movement logging
DROP TRIGGER IF EXISTS trigger_log_material_stock_changes ON "Material";
CREATE TRIGGER trigger_log_material_stock_changes
  AFTER INSERT OR UPDATE ON "Material"
  FOR EACH ROW
  WHEN (
    (TG_OP = 'INSERT' AND NEW."inStock" > 0) OR 
    (TG_OP = 'UPDATE' AND OLD."inStock" IS DISTINCT FROM NEW."inStock")
  )
  EXECUTE FUNCTION log_stock_movement();

-- Create view for easy stock movement reporting
CREATE OR REPLACE VIEW "StockMovementView" AS
SELECT 
  sm.*,
  m.code as "materialCode",
  m.name as "materialName",
  m.unit as "materialUnit",
  sl.name as "locationName",
  u.name as "userName",
  j."jobNumber"
FROM "StockMovement" sm
LEFT JOIN "Material" m ON sm."materialId" = m.id
LEFT JOIN "StorageLocation" sl ON sm."storageLocationId" = sl.id
LEFT JOIN "User" u ON sm."userId" = u.id
LEFT JOIN "Job" j ON sm."jobId" = j.id
ORDER BY sm."createdAt" DESC;

-- Add comments for documentation
COMMENT ON TABLE "StockMovement" IS 'Complete audit trail of all inventory stock changes';
COMMENT ON COLUMN "StockMovement".type IS 'Type of stock movement: INITIAL_STOCK, PURCHASE, ADJUSTMENT_IN/OUT, JOB_USAGE, TRANSFER_IN/OUT, WASTE, RETURN, AUDIT_CORRECTION';
COMMENT ON COLUMN "StockMovement"."quantityBefore" IS 'Stock level before this movement';
COMMENT ON COLUMN "StockMovement"."quantityChanged" IS 'Amount added (positive) or removed (negative)';
COMMENT ON COLUMN "StockMovement"."quantityAfter" IS 'Stock level after this movement';
COMMENT ON COLUMN "StockMovement".metadata IS 'Additional context data stored as JSON';
COMMENT ON VIEW "StockMovementView" IS 'Enriched view of stock movements with related entity names';