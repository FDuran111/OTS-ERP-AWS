-- Migration: Create NewJobEntry table for employee job creation workflow
-- Date: 2025-10-12
-- Purpose: Allow employees to request creation of new jobs through time entry

-- Create NewJobEntry table
CREATE TABLE IF NOT EXISTS "NewJobEntry" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "jobNumber" VARCHAR(50) NOT NULL,
  "customer" VARCHAR(255) NOT NULL,
  "description" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "hours" NUMERIC(5,2) NOT NULL,
  "workDescription" TEXT NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'APPROVED', 'REJECTED')),
  "approvedBy" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "jobId" TEXT REFERENCES "Job"("id") ON DELETE SET NULL,
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_new_job_entry_user" ON "NewJobEntry"("userId");
CREATE INDEX IF NOT EXISTS "idx_new_job_entry_status" ON "NewJobEntry"("status");
CREATE INDEX IF NOT EXISTS "idx_new_job_entry_date" ON "NewJobEntry"("date");
CREATE INDEX IF NOT EXISTS "idx_new_job_entry_created" ON "NewJobEntry"("createdAt");

-- Add comments for documentation
COMMENT ON TABLE "NewJobEntry" IS 'Stores employee requests for new job creation that require admin approval';
COMMENT ON COLUMN "NewJobEntry"."userId" IS 'Employee who submitted the new job request';
COMMENT ON COLUMN "NewJobEntry"."jobNumber" IS 'Proposed job number';
COMMENT ON COLUMN "NewJobEntry"."customer" IS 'Customer name for the new job';
COMMENT ON COLUMN "NewJobEntry"."description" IS 'Job description/scope';
COMMENT ON COLUMN "NewJobEntry"."date" IS 'Date of work performed';
COMMENT ON COLUMN "NewJobEntry"."hours" IS 'Hours worked on this job';
COMMENT ON COLUMN "NewJobEntry"."workDescription" IS 'Description of work performed';
COMMENT ON COLUMN "NewJobEntry"."status" IS 'Approval status: PENDING, APPROVED, REJECTED';
COMMENT ON COLUMN "NewJobEntry"."approvedBy" IS 'Admin user who approved/rejected the request';
COMMENT ON COLUMN "NewJobEntry"."jobId" IS 'Reference to created Job record if approved';
COMMENT ON COLUMN "NewJobEntry"."rejectionReason" IS 'Reason for rejection if status is REJECTED';
