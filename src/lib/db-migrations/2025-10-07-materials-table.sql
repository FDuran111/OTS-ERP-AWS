-- Phase 2: Materials Section
-- Date: 2025-10-07
-- Purpose: Create materials table linked to time entries

BEGIN;

-- Create materials table
CREATE TABLE IF NOT EXISTS "TimeEntryMaterial" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "timeEntryId" TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2), -- Nullable - may be filled in later
  "offTruck" BOOLEAN DEFAULT false,
  "packingSlipUrl" TEXT, -- S3 URL or local file path
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key constraint
  CONSTRAINT "TimeEntryMaterial_timeEntryId_fkey"
    FOREIGN KEY ("timeEntryId")
    REFERENCES "TimeEntry"(id)
    ON DELETE CASCADE
);

-- Create index for faster lookups by time entry
CREATE INDEX IF NOT EXISTS "idx_material_timeentry"
  ON "TimeEntryMaterial"("timeEntryId");

-- Add helpful comments
COMMENT ON TABLE "TimeEntryMaterial" IS 'Materials used during time entry work';
COMMENT ON COLUMN "TimeEntryMaterial".quantity IS 'Quantity of material used';
COMMENT ON COLUMN "TimeEntryMaterial".description IS 'Material description (e.g., "2x4 lumber", "bolts")';
COMMENT ON COLUMN "TimeEntryMaterial".price IS 'Price per unit (optional - may be filled later)';
COMMENT ON COLUMN "TimeEntryMaterial"."offTruck" IS 'Whether material came from truck inventory';
COMMENT ON COLUMN "TimeEntryMaterial"."packingSlipUrl" IS 'URL to uploaded packing slip document';

COMMIT;
