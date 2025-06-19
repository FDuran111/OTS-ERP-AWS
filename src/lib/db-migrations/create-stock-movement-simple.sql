-- Create StockMovement table for complete audit trail of inventory changes
CREATE TABLE IF NOT EXISTS "StockMovement" (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(12), 'base64'),
  "materialId" TEXT NOT NULL,
  "storageLocationId" TEXT,
  "jobId" TEXT,
  "userId" TEXT,
  type VARCHAR(20) NOT NULL,
  "quantityBefore" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "quantityChanged" DECIMAL(10,2) NOT NULL,
  "quantityAfter" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "unitCost" DECIMAL(10,2),
  "totalValue" DECIMAL(10,2),
  reason TEXT,
  "referenceNumber" VARCHAR(100),
  metadata JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stock_movement_material_id ON "StockMovement"("materialId");
CREATE INDEX IF NOT EXISTS idx_stock_movement_created_at ON "StockMovement"("createdAt");
CREATE INDEX IF NOT EXISTS idx_stock_movement_type ON "StockMovement"(type);

-- Add comments for documentation
COMMENT ON TABLE "StockMovement" IS 'Complete audit trail of all inventory stock changes';