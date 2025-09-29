-- Add toggle fields for daily/weekly overtime mode selection
ALTER TABLE "OvertimeSettings"
ADD COLUMN IF NOT EXISTS "useDailyOT" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "useWeeklyOT" BOOLEAN DEFAULT true;

-- Update existing records to use weekly-only by default (Nebraska style)
UPDATE "OvertimeSettings"
SET "useDailyOT" = false,
    "useWeeklyOT" = true
WHERE "useDailyOT" IS NULL;

-- Add comments to explain the fields
COMMENT ON COLUMN "OvertimeSettings"."useDailyOT" IS 'When true, calculate overtime based on daily hours worked';
COMMENT ON COLUMN "OvertimeSettings"."useWeeklyOT" IS 'When true, calculate overtime based on weekly hours worked';

-- Example configurations:
-- Nebraska (weekly only):
--   useDailyOT = false, useWeeklyOT = true
--   weeklyOTThreshold = 40

-- California (both daily and weekly):
--   useDailyOT = true, useWeeklyOT = true
--   dailyOTThreshold = 8, dailyDTThreshold = 12
--   weeklyOTThreshold = 40

-- Construction company (daily only):
--   useDailyOT = true, useWeeklyOT = false
--   dailyOTThreshold = 8