-- Create MaterialUsage table for tracking material consumption on jobs
CREATE TABLE IF NOT EXISTS "MaterialUsage" (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(12), 'base64'),
  "jobId" TEXT NOT NULL,
  "materialId" TEXT NOT NULL,
  "jobPhaseId" TEXT,
  "userId" TEXT,
  "quantityUsed" DECIMAL(10,2) NOT NULL,
  "unitCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "totalCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "usageType" VARCHAR(50) DEFAULT 'CONSUMED',
  notes TEXT,
  "usedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_material_usage_job_id ON "MaterialUsage"("jobId");
CREATE INDEX IF NOT EXISTS idx_material_usage_material_id ON "MaterialUsage"("materialId");
CREATE INDEX IF NOT EXISTS idx_material_usage_phase_id ON "MaterialUsage"("jobPhaseId");
CREATE INDEX IF NOT EXISTS idx_material_usage_used_at ON "MaterialUsage"("usedAt");

-- Add comments for documentation
COMMENT ON TABLE "MaterialUsage" IS 'Tracks material consumption and usage on jobs';
COMMENT ON COLUMN "MaterialUsage"."usageType" IS 'Type of usage: CONSUMED, WASTED, RETURNED, TRANSFERRED';
COMMENT ON COLUMN "MaterialUsage"."quantityUsed" IS 'Quantity of material used (negative for returns)';
COMMENT ON COLUMN "MaterialUsage"."totalCost" IS 'Total cost of materials used (quantity * unit cost)';