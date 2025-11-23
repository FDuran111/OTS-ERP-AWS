-- Migration 006: Add assignmentType to JobAssignment table
-- Tracks how an employee was assigned to a job (manual vs auto from time entry)

-- Add assignmentType column with default 'MANUAL' for existing records
ALTER TABLE "JobAssignment"
ADD COLUMN IF NOT EXISTS "assignmentType" varchar(20) DEFAULT 'MANUAL' NOT NULL;

-- Add check constraint for valid types
ALTER TABLE "JobAssignment"
DROP CONSTRAINT IF EXISTS "job_assignment_type_check";

ALTER TABLE "JobAssignment"
ADD CONSTRAINT "job_assignment_type_check"
CHECK ("assignmentType" IN ('MANUAL', 'AUTO_TIME_ENTRY'));

-- Add index for filtering by assignment type
CREATE INDEX IF NOT EXISTS "idx_job_assignment_type"
ON "JobAssignment" ("assignmentType");

-- Comment for documentation
COMMENT ON COLUMN "JobAssignment"."assignmentType" IS
'How employee was assigned: MANUAL (admin assigned) or AUTO_TIME_ENTRY (auto-created when employee logged time)';
