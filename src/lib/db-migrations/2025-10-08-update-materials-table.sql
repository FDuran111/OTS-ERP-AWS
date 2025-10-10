-- Update TimeEntryMaterial table to use materialId instead of description
-- Date: 2025-10-08

BEGIN;

-- Add materialId column (nullable for now to allow migration)
ALTER TABLE "TimeEntryMaterial"
ADD COLUMN IF NOT EXISTS "materialId" TEXT;

-- Add foreign key to Material table
ALTER TABLE "TimeEntryMaterial"
ADD CONSTRAINT "TimeEntryMaterial_materialId_fkey"
  FOREIGN KEY ("materialId")
  REFERENCES "Material"(id)
  ON DELETE SET NULL;

-- Rename description to notes (make it nullable)
ALTER TABLE "TimeEntryMaterial"
ALTER COLUMN description DROP NOT NULL;

ALTER TABLE "TimeEntryMaterial"
RENAME COLUMN description TO notes;

-- Remove price column (not needed for employees)
ALTER TABLE "TimeEntryMaterial"
DROP COLUMN IF EXISTS price;

-- Add index for materialId lookups
CREATE INDEX IF NOT EXISTS "idx_material_materialId"
  ON "TimeEntryMaterial"("materialId");

-- Update comments
COMMENT ON COLUMN "TimeEntryMaterial"."materialId" IS 'Reference to Material table';
COMMENT ON COLUMN "TimeEntryMaterial".notes IS 'Optional notes about material usage';

COMMIT;
