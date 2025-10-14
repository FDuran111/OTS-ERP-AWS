-- Migration: Add customerPO field to Job table
-- Date: 2025-10-12
-- Purpose: Allow jobs to track the customer's purchase order number

BEGIN;

-- Add customerPO column to Job table
ALTER TABLE "Job"
ADD COLUMN IF NOT EXISTS "customerPO" TEXT;

-- Add index for searching by customer PO
CREATE INDEX IF NOT EXISTS idx_job_customer_po
ON "Job" USING btree ("customerPO");

-- Add comment for documentation
COMMENT ON COLUMN "Job"."customerPO" IS 'Customer Purchase Order number provided by the customer';

COMMIT;
