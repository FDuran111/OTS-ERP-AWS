-- Add division column to Job table for electrical division tracking
-- This migration adds support for Low Voltage and Line Voltage divisions

-- Add division column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Job' AND column_name = 'division') THEN
    ALTER TABLE "Job" ADD COLUMN "division" varchar(20) DEFAULT 'LINE_VOLTAGE';
  END IF;
END
$$;

-- Add check constraint to ensure valid division values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'job_division_check'
  ) THEN
    ALTER TABLE "Job" ADD CONSTRAINT job_division_check 
    CHECK ("division" IN ('LOW_VOLTAGE', 'LINE_VOLTAGE'));
  END IF;
END
$$;

-- Create index for division queries
CREATE INDEX IF NOT EXISTS idx_job_division ON "Job"("division", "status");

-- Update existing jobs to have LINE_VOLTAGE as default if null
UPDATE "Job" SET "division" = 'LINE_VOLTAGE' WHERE "division" IS NULL;

-- Comment on column
COMMENT ON COLUMN "Job"."division" IS 'Electrical division: LOW_VOLTAGE for security/data systems, LINE_VOLTAGE for standard 120V/240V electrical';