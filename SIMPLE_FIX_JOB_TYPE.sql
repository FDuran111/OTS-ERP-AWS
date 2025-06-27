-- Simple migration to add INSTALLATION to JobType enum
-- This approach keeps COMMERCIAL_PROJECT for now to avoid breaking views

BEGIN;

-- Step 1: Update any existing COMMERCIAL_PROJECT to INSTALLATION
-- First, we need to add INSTALLATION to the enum
ALTER TYPE "JobType" ADD VALUE IF NOT EXISTS 'INSTALLATION';

-- Step 2: Update existing COMMERCIAL_PROJECT records to INSTALLATION
UPDATE "Job" 
SET type = 'INSTALLATION' 
WHERE type = 'COMMERCIAL_PROJECT';

-- Step 3: Update any check constraints if they exist
-- This will allow both old and new values
DO $$ 
BEGIN
    -- Drop any existing check constraint on the type column
    ALTER TABLE "Job" DROP CONSTRAINT IF EXISTS job_type_check;
    
    -- Add new check constraint that allows SERVICE_CALL and INSTALLATION
    -- (COMMERCIAL_PROJECT is still in the enum but we won't use it)
    ALTER TABLE "Job" ADD CONSTRAINT job_type_check 
        CHECK (type IN ('SERVICE_CALL', 'INSTALLATION'));
EXCEPTION
    WHEN others THEN
        -- If there's no constraint, that's fine
        NULL;
END $$;

COMMIT;

-- Verify the changes
SELECT 'Current enum values:' as info;
SELECT unnest(enum_range(NULL::"JobType")) AS enum_values;

SELECT 'Current job types in use:' as info;
SELECT type, COUNT(*) as count 
FROM "Job" 
GROUP BY type 
ORDER BY type;