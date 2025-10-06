-- QUICK RDS MIGRATION SCRIPT
-- Sync AWS RDS with Local Database Schema
-- Run this in one shot or step by step

-- ============================================================================
-- STEP 1: PRE-MIGRATION FIXES
-- ============================================================================

-- Fix OvertimeSettings.id issue (can't convert 'default' to UUID)
DELETE FROM "OvertimeSettings" WHERE id = 'default';

-- ============================================================================
-- STEP 2: ALTER EXISTING TABLES (Drop unused columns)
-- ============================================================================

-- FileAttachment - Drop S3 columns (all NULL)
ALTER TABLE "FileAttachment"
  DROP COLUMN IF EXISTS cdnurl,
  DROP COLUMN IF EXISTS s3bucket,
  DROP COLUMN IF EXISTS s3key;

-- JobAttachment - Drop S3 columns (all NULL)
ALTER TABLE "JobAttachment"
  DROP COLUMN IF EXISTS s3bucket,
  DROP COLUMN IF EXISTS s3key;

-- TimeEntry - Drop edit columns (all NULL) and add new ones
ALTER TABLE "TimeEntry"
  DROP COLUMN IF EXISTS editapprovedat,
  DROP COLUMN IF EXISTS editapprovedby,
  DROP COLUMN IF EXISTS editrequest,
  DROP COLUMN IF EXISTS editrequestedat,
  ADD COLUMN IF NOT EXISTS "hasRejectionNotes" BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "photoCount" INTEGER DEFAULT 0;

-- OvertimeSettings - Drop old columns, keep new ones
ALTER TABLE "OvertimeSettings"
  DROP COLUMN IF EXISTS "autoCalculateOvertime",
  DROP COLUMN IF EXISTS "dailyRegularHours",
  DROP COLUMN IF EXISTS "weeklyRegularHours",
  DROP COLUMN IF EXISTS "overtimeMultiplier",
  DROP COLUMN IF EXISTS "doubleTimeMultiplier",
  DROP COLUMN IF EXISTS "weekStartDay",
  DROP COLUMN IF EXISTS "overtimeMode",
  DROP COLUMN IF EXISTS "payPeriodType";

-- Convert OvertimeSettings.id to UUID type
ALTER TABLE "OvertimeSettings"
  ALTER COLUMN id TYPE UUID USING id::uuid;

-- TimeTrackingSettings is empty, just drop lowercase columns
ALTER TABLE "TimeTrackingSettings"
  DROP COLUMN IF EXISTS companyid,
  DROP COLUMN IF EXISTS createdat,
  DROP COLUMN IF EXISTS updatedat,
  DROP COLUMN IF EXISTS overtimethreshold,
  DROP COLUMN IF EXISTS allowgpstracking,
  DROP COLUMN IF EXISTS autoclockoutafterhours,
  DROP COLUMN IF EXISTS breakdeductionminutes,
  DROP COLUMN IF EXISTS requirephotocheckin,
  DROP COLUMN IF EXISTS roundtonearestminutes,
  DROP COLUMN IF EXISTS maxdailyhours;

-- StockMovement - Add new columns
ALTER TABLE "StockMovement"
  ADD COLUMN IF NOT EXISTS "clientRequestId" TEXT,
  ADD COLUMN IF NOT EXISTS "transferId" TEXT;

-- UserAuditLog - Add new columns
ALTER TABLE "UserAuditLog"
  ADD COLUMN IF NOT EXISTS "resourceId" TEXT,
  ADD COLUMN IF NOT EXISTS severity VARCHAR(20);

-- TimeEntryAudit - Add new columns
ALTER TABLE "TimeEntryAudit"
  ADD COLUMN IF NOT EXISTS changes JSONB,
  ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS job_labor_cost_id UUID,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- JobLaborCost - Change type
ALTER TABLE "JobLaborCost"
  ALTER COLUMN "timeEntryId" TYPE TEXT USING "timeEntryId"::text;

-- TimeEntry approvedBy - Change to UUID (if needed, currently NULL)
-- ALTER TABLE "TimeEntry"
--   ALTER COLUMN "approvedBy" TYPE UUID USING "approvedBy"::uuid;

\echo 'Step 2: Existing tables altered ✓'

-- ============================================================================
-- STEP 3: CREATE MISSING TABLES
-- ============================================================================

-- Note: I'll create a separate script for this to export from local DB
-- For now, we can use pg_dump to get the table definitions

\echo 'Step 3: Will need to create 29 missing tables from local schema'
\echo 'Run: pg_dump from docker container or upgrade pg_dump version'

-- ============================================================================
-- VALIDATION
-- ============================================================================

SELECT 'Total Tables:' as check, COUNT(*)::text as result
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
UNION ALL
SELECT 'Total Triggers:', COUNT(*)::text
FROM information_schema.triggers
WHERE trigger_schema = 'public'
UNION ALL
SELECT 'User Count:', COUNT(*)::text FROM "User"
UNION ALL
SELECT 'Job Count:', COUNT(*)::text FROM "Job"
UNION ALL
SELECT 'Customer Count:', COUNT(*)::text FROM "Customer";

\echo 'Migration partial complete - tables altered, need to add missing tables'
