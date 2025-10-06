-- ================================================
-- Schema Alignment Migration
-- Align Local DB with Replit Production Schema
-- Date: 2025-10-05
--
-- IMPORTANT: This migration aligns local schema with Replit
-- BACKUP YOUR DATA BEFORE RUNNING
-- ================================================

BEGIN;

-- ================================================
-- 1. UPDATE ROLE TABLE
-- ================================================

-- Add Replit columns
ALTER TABLE "Role"
  ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS "createdBy" TEXT;

-- Rename columns to match Replit
ALTER TABLE "Role"
  DROP COLUMN IF EXISTS active CASCADE,
  DROP COLUMN IF EXISTS color CASCADE,
  DROP COLUMN IF EXISTS display_name CASCADE,
  DROP COLUMN IF EXISTS permissions CASCADE;

-- Add constraint for isActive (may already exist)
ALTER TABLE "Role"
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT TRUE;

-- Add foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Role_createdBy_fkey'
  ) THEN
    ALTER TABLE "Role"
      ADD CONSTRAINT "Role_createdBy_fkey"
      FOREIGN KEY ("createdBy") REFERENCES "User"(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index
CREATE INDEX IF NOT EXISTS idx_role_level ON "Role"(level);

-- ================================================
-- 2. UPDATE JOURNALENTRYLINE TABLE
-- ================================================

-- Add Replit columns
ALTER TABLE "JournalEntryLine"
  ADD COLUMN IF NOT EXISTS "referenceType" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "referenceId" TEXT,
  ADD COLUMN IF NOT EXISTS "vendorId" TEXT,
  ADD COLUMN IF NOT EXISTS "materialId" TEXT,
  ADD COLUMN IF NOT EXISTS "employeeId" TEXT;

-- Remove local-only columns
ALTER TABLE "JournalEntryLine"
  DROP COLUMN IF EXISTS "projectId" CASCADE,
  DROP COLUMN IF EXISTS memo CASCADE;

-- Add foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_vendor' AND table_name = 'JournalEntryLine'
  ) THEN
    ALTER TABLE "JournalEntryLine"
      ADD CONSTRAINT fk_vendor FOREIGN KEY ("vendorId") REFERENCES "Vendor"(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_material' AND table_name = 'JournalEntryLine'
  ) THEN
    ALTER TABLE "JournalEntryLine"
      ADD CONSTRAINT fk_material FOREIGN KEY ("materialId") REFERENCES "Material"(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_employee' AND table_name = 'JournalEntryLine'
  ) THEN
    ALTER TABLE "JournalEntryLine"
      ADD CONSTRAINT fk_employee FOREIGN KEY ("employeeId") REFERENCES "User"(id);
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_line_reference ON "JournalEntryLine"("referenceType", "referenceId");
CREATE INDEX IF NOT EXISTS idx_line_vendor ON "JournalEntryLine"("vendorId");

-- ================================================
-- 3. UPDATE TIMEENTRYAUDIT TABLE
-- ================================================

-- Add Replit columns for enhanced audit tracking
ALTER TABLE "TimeEntryAudit"
  ADD COLUMN IF NOT EXISTS changes JSONB,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS job_labor_cost_id UUID;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_timeentryaudit_correlation
  ON "TimeEntryAudit"(correlation_id) WHERE correlation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_timeentryaudit_labor_cost
  ON "TimeEntryAudit"(job_labor_cost_id) WHERE job_labor_cost_id IS NOT NULL;

-- ================================================
-- 4. UPDATE STOCKMOVEMENT TABLE
-- ================================================

-- Add Replit tracking columns
ALTER TABLE "StockMovement"
  ADD COLUMN IF NOT EXISTS "clientRequestId" TEXT,
  ADD COLUMN IF NOT EXISTS "transferId" TEXT;

-- ================================================
-- 5. UPDATE USERAUDITLOG TABLE
-- ================================================

-- Add Replit metadata columns
ALTER TABLE "UserAuditLog"
  ADD COLUMN IF NOT EXISTS "resourceId" TEXT,
  ADD COLUMN IF NOT EXISTS severity VARCHAR(20);

-- ================================================
-- 6. DROP DEPRECATED TABLE
-- ================================================

-- RoleAssignment table exists only in local, likely deprecated
-- Uncomment if you're sure it's not used:
-- DROP TABLE IF EXISTS "RoleAssignment" CASCADE;

-- ================================================
-- VERIFICATION QUERIES
-- ================================================

-- Verify Role table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Role'
ORDER BY ordinal_position;

-- Verify JournalEntryLine structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'JournalEntryLine'
ORDER BY ordinal_position;

-- Verify TimeEntryAudit structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'TimeEntryAudit'
ORDER BY ordinal_position;

COMMIT;

-- ================================================
-- POST-MIGRATION NOTES
-- ================================================

-- 1. The Role.permissions column has been removed
--    Permissions are now managed via the RolePermission table
--
-- 2. JournalEntryLine now uses referenceType/referenceId pattern
--    instead of separate projectId/memo fields
--
-- 3. TimeEntryAudit now has JSONB changes field for detailed tracking
--    This matches what the audit-helper.ts code expects
--
-- 4. Run the verification queries above to confirm changes
