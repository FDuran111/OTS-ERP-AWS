-- Add category field to Job table
ALTER TABLE "Job"
ADD COLUMN IF NOT EXISTS "category" TEXT;

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_job_category ON "Job"("category");