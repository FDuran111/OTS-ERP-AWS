-- Fix JobType enum to add INSTALLATION
-- You need to run these commands separately, not in a transaction

-- STEP 1: Run this command by itself (not in a transaction)
ALTER TYPE "JobType" ADD VALUE IF NOT EXISTS 'INSTALLATION';

-- IMPORTANT: After running the above command, you need to disconnect and reconnect
-- or start a new session before running Step 2

-- To verify Step 1 worked, run:
SELECT unnest(enum_range(NULL::"JobType")) AS enum_values;

-- STEP 2: After reconnecting, run these commands
UPDATE "Job" 
SET type = 'INSTALLATION' 
WHERE type = 'COMMERCIAL_PROJECT';

-- Verify no more COMMERCIAL_PROJECT jobs exist
SELECT type, COUNT(*) 
FROM "Job" 
GROUP BY type;