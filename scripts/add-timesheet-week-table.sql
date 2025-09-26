-- Create TimesheetWeek table to track weekly timesheet submissions
CREATE TABLE IF NOT EXISTS "TimesheetWeek" (
  "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "weekStart" DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  "submittedAt" TIMESTAMP,
  "approvedAt" TIMESTAMP,
  "approvedBy" UUID REFERENCES "User"(id),
  "rejectedAt" TIMESTAMP,
  "rejectedBy" UUID REFERENCES "User"(id),
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("userId", "weekStart")
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_timesheet_week_status ON "TimesheetWeek"(status);
CREATE INDEX IF NOT EXISTS idx_timesheet_week_date ON "TimesheetWeek"("weekStart");

-- Add approval fields to TimeEntry if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'TimeEntry' AND column_name = 'approvedAt'
  ) THEN
    ALTER TABLE "TimeEntry"
    ADD COLUMN "approvedAt" TIMESTAMP,
    ADD COLUMN "approvedBy" UUID REFERENCES "User"(id);
  END IF;
END $$;