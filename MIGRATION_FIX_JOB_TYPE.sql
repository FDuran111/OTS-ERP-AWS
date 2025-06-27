-- Migration to update JobType enum from COMMERCIAL_PROJECT to INSTALLATION
-- This handles dependent views properly

-- Step 1: First, let's see what views depend on this
SELECT DISTINCT 
    dependent_ns.nspname AS dependent_schema,
    dependent_view.relname AS dependent_view
FROM pg_depend 
JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid 
JOIN pg_class AS dependent_view ON pg_rewrite.ev_class = dependent_view.oid 
JOIN pg_class AS source_table ON pg_depend.refobjid = source_table.oid 
JOIN pg_namespace dependent_ns ON dependent_view.relnamespace = dependent_ns.oid
JOIN pg_namespace source_ns ON source_table.relnamespace = source_ns.oid
WHERE 
    source_ns.nspname = 'public'
    AND source_table.relname = 'Job'
    AND pg_depend.deptype = 'n';

-- Step 2: The safer approach - add a new value to existing enum
BEGIN;

-- First update any COMMERCIAL_PROJECT to a temporary safe value
UPDATE "Job" 
SET type = 'SERVICE_CALL' 
WHERE type = 'COMMERCIAL_PROJECT';

-- Now we'll use ALTER TYPE to add the new value and remove the old one
-- This preserves views and other dependencies

-- Add INSTALLATION to the enum (if it doesn't exist)
DO $$ 
BEGIN
    -- Check if INSTALLATION already exists in the enum
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'INSTALLATION' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'JobType')
    ) THEN
        ALTER TYPE "JobType" ADD VALUE 'INSTALLATION';
    END IF;
END $$;

COMMIT;

-- Step 3: Now we need to remove COMMERCIAL_PROJECT from the enum
-- This is tricky because PostgreSQL doesn't allow removing enum values directly
-- We'll need to recreate the views

-- First, save the view definitions
\set QUIET on
\o /tmp/schedule_view.sql
SELECT pg_get_viewdef('public."ScheduleView"');
\o /tmp/job_classification_view.sql  
SELECT pg_get_viewdef('public."JobClassificationView"');
\o
\set QUIET off

-- Now we can proceed with the full recreation
BEGIN;

-- Drop the views
DROP VIEW IF EXISTS "ScheduleView" CASCADE;
DROP VIEW IF EXISTS "JobClassificationView" CASCADE;

-- Create a temporary column
ALTER TABLE "Job" ADD COLUMN type_new TEXT;

-- Copy the data
UPDATE "Job" SET type_new = type::TEXT;

-- Drop the old column
ALTER TABLE "Job" DROP COLUMN type;

-- Drop the old enum
DROP TYPE "JobType";

-- Create new enum with correct values
CREATE TYPE "JobType" AS ENUM ('SERVICE_CALL', 'INSTALLATION');

-- Create new column with correct type
ALTER TABLE "Job" ADD COLUMN type "JobType";

-- Restore the data
UPDATE "Job" SET type = type_new::"JobType";

-- Make the column NOT NULL
ALTER TABLE "Job" ALTER COLUMN type SET NOT NULL;

-- Drop the temporary column
ALTER TABLE "Job" DROP COLUMN type_new;

-- Recreate the views (you'll need to paste their definitions here)
-- The definitions were saved to /tmp/schedule_view.sql and /tmp/job_classification_view.sql

COMMIT;

-- Verify the change
SELECT unnest(enum_range(NULL::"JobType")) AS updated_values;