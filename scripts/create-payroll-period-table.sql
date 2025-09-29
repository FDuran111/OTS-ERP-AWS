-- Create PayrollPeriod table for tracking payroll periods and their lock status
CREATE TABLE IF NOT EXISTS "PayrollPeriod" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "periodStart" DATE NOT NULL,
  "periodEnd" DATE NOT NULL,
  "type" VARCHAR(20) NOT NULL DEFAULT 'weekly', -- 'weekly', 'biweekly', 'monthly'
  "status" VARCHAR(20) NOT NULL DEFAULT 'open', -- 'open', 'locked', 'processing', 'paid'
  
  -- Calculated totals
  "totalHours" DECIMAL(10, 2) DEFAULT 0,
  "totalRegularHours" DECIMAL(10, 2) DEFAULT 0,
  "totalOvertimeHours" DECIMAL(10, 2) DEFAULT 0,
  "totalDoubleTimeHours" DECIMAL(10, 2) DEFAULT 0,
  "totalGrossPay" DECIMAL(10, 2) DEFAULT 0,
  
  -- Approval metadata
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP,
  "notes" TEXT,
  
  -- Timestamps
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_period UNIQUE ("periodStart", "periodEnd"),
  CONSTRAINT valid_period CHECK ("periodEnd" >= "periodStart")
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_payroll_period_dates ON "PayrollPeriod"("periodStart", "periodEnd");
CREATE INDEX IF NOT EXISTS idx_payroll_period_status ON "PayrollPeriod"("status");
CREATE INDEX IF NOT EXISTS idx_payroll_period_type ON "PayrollPeriod"("type");

-- Add comments
COMMENT ON TABLE "PayrollPeriod" IS 'Tracks payroll periods with lock status to prevent unauthorized edits';
COMMENT ON COLUMN "PayrollPeriod"."status" IS 'Period status: open (editable), locked (no edits), processing (being processed), paid (finalized)';
COMMENT ON COLUMN "PayrollPeriod"."type" IS 'Period type: weekly, biweekly, or monthly';