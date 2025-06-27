-- PART 2: Update existing jobs
-- Run this AFTER Part 1 has been committed

BEGIN;

-- Update existing COMMERCIAL_PROJECT records to INSTALLATION
UPDATE "Job" 
SET type = 'INSTALLATION' 
WHERE type = 'COMMERCIAL_PROJECT';

-- Add constraint to prevent future use of COMMERCIAL_PROJECT
DO $$ 
BEGIN
    -- Drop any existing check constraint on the type column
    ALTER TABLE "Job" DROP CONSTRAINT IF EXISTS job_type_check;
    
    -- Add new check constraint that only allows SERVICE_CALL and INSTALLATION
    ALTER TABLE "Job" ADD CONSTRAINT job_type_check 
        CHECK (type IN ('SERVICE_CALL', 'INSTALLATION'));
EXCEPTION
    WHEN others THEN
        -- If there's no constraint, that's fine
        NULL;
END $$;

COMMIT;

-- Verify the changes
SELECT 'Current job types in use:' as info;
SELECT type, COUNT(*) as count 
FROM "Job" 
GROUP BY type 
ORDER BY type;

-- Show that no COMMERCIAL_PROJECT jobs remain
SELECT 'Jobs with COMMERCIAL_PROJECT (should be 0):' as info;
SELECT COUNT(*) as commercial_project_count 
FROM "Job" 
WHERE type = 'COMMERCIAL_PROJECT';