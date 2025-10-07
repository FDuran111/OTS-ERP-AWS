-- ================================================
-- Phase 1: Hour Categories Migration
-- Date: 2025-10-07
-- Purpose: Add manual hour category selection to time entries
-- ================================================

BEGIN;

-- Add categoryHours JSON field to store breakdown by category
ALTER TABLE "TimeEntry"
  ADD COLUMN IF NOT EXISTS "categoryHours" JSONB DEFAULT '{}';

-- Add index for category queries
CREATE INDEX IF NOT EXISTS idx_timeentry_category_hours
  ON "TimeEntry" USING gin("categoryHours");

-- Valid categories stored in categoryHours:
-- {
--   "STRAIGHT_TIME": 8,
--   "STRAIGHT_TIME_TRAVEL": 0,
--   "OVERTIME": 0.5,
--   "OVERTIME_TRAVEL": 0,
--   "DOUBLE_TIME": 0,
--   "DOUBLE_TIME_TRAVEL": 0
-- }

-- Update existing entries to have categoryHours based on current hours
-- Assume all existing hours are STRAIGHT_TIME
UPDATE "TimeEntry"
SET "categoryHours" = jsonb_build_object('STRAIGHT_TIME', hours)
WHERE "categoryHours" = '{}'::jsonb OR "categoryHours" IS NULL;

COMMIT;

-- Verification query
SELECT
  id,
  hours,
  "categoryHours"
FROM "TimeEntry"
LIMIT 5;
