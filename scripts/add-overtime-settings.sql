-- Create overtime settings table for company-wide configuration
CREATE TABLE IF NOT EXISTS "OvertimeSettings" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID DEFAULT '00000000-0000-0000-0000-000000000001', -- Default company
  "dailyOTThreshold" DECIMAL(4, 2) DEFAULT 8.00, -- Hours before daily OT (8 hours)
  "weeklyOTThreshold" DECIMAL(4, 2) DEFAULT 40.00, -- Hours before weekly OT (40 hours)
  "dailyDTThreshold" DECIMAL(4, 2) DEFAULT 12.00, -- Hours before daily double time (12 hours)
  "weeklyDTThreshold" DECIMAL(4, 2) DEFAULT 60.00, -- Hours before weekly double time (60 hours)
  "otMultiplier" DECIMAL(3, 2) DEFAULT 1.5, -- Overtime multiplier (1.5x)
  "dtMultiplier" DECIMAL(3, 2) DEFAULT 2.0, -- Double time multiplier (2x)
  "seventhDayOT" BOOLEAN DEFAULT true, -- 7th consecutive day is all OT
  "seventhDayDT" BOOLEAN DEFAULT true, -- 7th day over 8 hours is DT
  "roundingInterval" INTEGER DEFAULT 15, -- Round to nearest X minutes (0, 5, 15)
  "roundingType" VARCHAR(20) DEFAULT 'nearest', -- 'nearest', 'up', 'down'
  "breakRules" JSONB DEFAULT '{"autoDeduct": false, "rules": []}',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add pay rate columns to User table
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "regularRate" DECIMAL(10, 2) DEFAULT 15.00,
ADD COLUMN IF NOT EXISTS "overtimeRate" DECIMAL(10, 2), -- Can be auto-calculated or custom
ADD COLUMN IF NOT EXISTS "doubleTimeRate" DECIMAL(10, 2); -- Can be auto-calculated or custom

-- Add calculation columns to TimeEntry table
ALTER TABLE "TimeEntry"
ADD COLUMN IF NOT EXISTS "regularHours" DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS "overtimeHours" DECIMAL(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "doubleTimeHours" DECIMAL(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "breakMinutes" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "totalGrossHours" DECIMAL(5, 2), -- Before breaks
ADD COLUMN IF NOT EXISTS "totalNetHours" DECIMAL(5, 2), -- After breaks
ADD COLUMN IF NOT EXISTS "estimatedPay" DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS "autoCalculated" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "weekNumber" INTEGER, -- ISO week number for weekly calculations
ADD COLUMN IF NOT EXISTS "consecutiveDay" INTEGER; -- Track consecutive work days

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_timeentry_week ON "TimeEntry" ("userId", "weekNumber", date);
CREATE INDEX IF NOT EXISTS idx_timeentry_consecutive ON "TimeEntry" ("userId", date, "consecutiveDay");

-- Insert default overtime settings if none exist
INSERT INTO "OvertimeSettings" (id, "companyId")
VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE "OvertimeSettings" IS 'Stores company-wide overtime and time calculation rules';
COMMENT ON COLUMN "OvertimeSettings"."seventhDayOT" IS 'California law: 7th consecutive day all hours are OT minimum';
COMMENT ON COLUMN "OvertimeSettings"."seventhDayDT" IS 'California law: 7th consecutive day over 8 hours is double time';