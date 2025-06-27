-- PART 1: Add INSTALLATION to the JobType enum
-- Run this first and COMMIT

-- Add INSTALLATION to the enum
ALTER TYPE "JobType" ADD VALUE IF NOT EXISTS 'INSTALLATION';

-- Verify it was added
SELECT unnest(enum_range(NULL::"JobType")) AS enum_values;