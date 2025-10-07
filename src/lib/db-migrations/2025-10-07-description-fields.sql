-- Phase 1: Description Field Changes
-- Date: 2025-10-07
-- Purpose: Split single description field into 3 required fields (location, job, workDescription)

BEGIN;

-- Add new columns to TimeEntry table
ALTER TABLE "TimeEntry"
ADD COLUMN IF NOT EXISTS "location" TEXT,
ADD COLUMN IF NOT EXISTS "jobDescription" TEXT,
ADD COLUMN IF NOT EXISTS "workDescription" TEXT;

-- Migrate existing data from description to workDescription
-- This preserves old entries while new entries will use all 3 fields
UPDATE "TimeEntry"
SET "workDescription" = description
WHERE description IS NOT NULL
  AND description != ''
  AND "workDescription" IS NULL;

-- Add helpful comment
COMMENT ON COLUMN "TimeEntry"."location" IS 'Location where work was performed (e.g., Pawnee City, Lincoln)';
COMMENT ON COLUMN "TimeEntry"."jobDescription" IS 'Specific job or area (e.g., Bin 21, North Field)';
COMMENT ON COLUMN "TimeEntry"."workDescription" IS 'Detailed description of work performed';

-- Keep old description column for backward compatibility
-- Do NOT drop it - needed for displaying old entries

COMMIT;
