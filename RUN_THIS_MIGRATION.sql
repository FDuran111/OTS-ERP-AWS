-- IMPORTANT: Run this migration to fix the job type enum issue
-- This will allow creating jobs with type "INSTALLATION"

-- Step 1: Check current enum values
SELECT unnest(enum_range(NULL::"JobType")) AS current_values;

-- Step 2: Update existing COMMERCIAL_PROJECT values to INSTALLATION (if any)
UPDATE "Job" 
SET type = 'SERVICE_CALL' 
WHERE type = 'COMMERCIAL_PROJECT';

-- Step 3: Recreate the enum with correct values
-- This is the safest approach that works in most PostgreSQL versions
BEGIN;

-- Create a temporary column
ALTER TABLE "Job" ADD COLUMN type_temp TEXT;

-- Copy the data
UPDATE "Job" SET type_temp = type::TEXT;

-- Drop the old column
ALTER TABLE "Job" DROP COLUMN type;

-- Drop the old enum
DROP TYPE IF EXISTS "JobType";

-- Create new enum with correct values
CREATE TYPE "JobType" AS ENUM ('SERVICE_CALL', 'INSTALLATION');

-- Create new column with correct type
ALTER TABLE "Job" ADD COLUMN type "JobType";

-- Restore the data
UPDATE "Job" SET type = type_temp::"JobType";

-- Make the column NOT NULL if it was before
ALTER TABLE "Job" ALTER COLUMN type SET NOT NULL;

-- Drop the temporary column
ALTER TABLE "Job" DROP COLUMN type_temp;

COMMIT;

-- Verify the change
SELECT unnest(enum_range(NULL::"JobType")) AS new_values;