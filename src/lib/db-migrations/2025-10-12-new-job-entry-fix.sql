-- Migration: Add missing columns to NewJobEntry table
-- Date: 2025-10-12
-- Purpose: Add reviewedAt and approvedJobId columns referenced by API

ALTER TABLE "NewJobEntry"
ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "approvedJobId" TEXT REFERENCES "Job"("id") ON DELETE SET NULL;

-- Update the approvedBy column to be properly set when reviewing
COMMENT ON COLUMN "NewJobEntry"."reviewedAt" IS 'Timestamp when admin reviewed the entry';
COMMENT ON COLUMN "NewJobEntry"."approvedJobId" IS 'Reference to the Job record if one was selected during approval';
