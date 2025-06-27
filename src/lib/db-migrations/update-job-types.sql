-- Migration to update job types from COMMERCIAL_PROJECT to INSTALLATION
-- Date: 2025-06-27

-- First, update any existing COMMERCIAL_PROJECT values to INSTALLATION
UPDATE "Job" 
SET type = 'INSTALLATION' 
WHERE type = 'COMMERCIAL_PROJECT';

-- If there's a check constraint on the type column, we need to drop and recreate it
-- This handles the case where the column might have a constraint
DO $$ 
BEGIN
    -- Drop any existing check constraint on the type column
    ALTER TABLE "Job" DROP CONSTRAINT IF EXISTS job_type_check;
    
    -- Add the new check constraint with only SERVICE_CALL and INSTALLATION
    ALTER TABLE "Job" ADD CONSTRAINT job_type_check 
        CHECK (type IN ('SERVICE_CALL', 'INSTALLATION'));
EXCEPTION
    WHEN others THEN
        -- If there's no constraint to drop, that's fine
        NULL;
END $$;

-- Log the migration
INSERT INTO "DatabaseMigration" (name, applied_at) 
VALUES ('update-job-types', NOW())
ON CONFLICT (name) DO NOTHING;