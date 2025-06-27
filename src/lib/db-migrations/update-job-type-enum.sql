-- Migration to update JobType enum to replace COMMERCIAL_PROJECT with INSTALLATION
-- Date: 2025-06-27

-- First, we need to update any existing COMMERCIAL_PROJECT values to INSTALLATION
UPDATE "Job" 
SET type = 'INSTALLATION' 
WHERE type = 'COMMERCIAL_PROJECT';

-- PostgreSQL doesn't allow direct modification of enum types, so we need to:
-- 1. Create a new enum type
-- 2. Update the column to use the new type
-- 3. Drop the old enum type

-- Create the new enum type
DO $$ 
BEGIN
    -- Check if the new enum doesn't already exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'jobtype_new') THEN
        CREATE TYPE "JobType_new" AS ENUM ('SERVICE_CALL', 'INSTALLATION');
    END IF;
END $$;

-- Update the column to use the new enum type
ALTER TABLE "Job" 
ALTER COLUMN type TYPE "JobType_new" 
USING type::text::"JobType_new";

-- Drop the old enum type if it exists
DROP TYPE IF EXISTS "JobType" CASCADE;

-- Rename the new enum type to the original name
ALTER TYPE "JobType_new" RENAME TO "JobType";

-- Verify the change
DO $$ 
BEGIN
    RAISE NOTICE 'JobType enum has been updated. Valid values are now: SERVICE_CALL, INSTALLATION';
END $$;