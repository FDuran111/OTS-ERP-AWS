-- Migration 005: Verify JobStatus enum has all required values
-- This is a verification migration - no changes needed if values exist

-- The complete JobStatus workflow is:
--
-- ESTIMATE                 - Initial job quote/estimate
--     ↓
-- PENDING_APPROVAL        - Created by employee, needs admin approval
--     ↓
-- SCHEDULED               - Approved and scheduled for work
--     ↓
-- DISPATCHED              - Crew has been notified/dispatched
--     ↓
-- IN_PROGRESS             - Work has started (first time entry)
--     ↓
-- PENDING_REVIEW          - Physical work done, awaiting admin closure
--     ↓
-- COMPLETED               - Admin closed job, COGS journal entry created
--     ↓
-- BILLED                  - Invoice created and sent
--
-- CANCELLED               - Job cancelled at any point

-- Verify all values exist (will show current enum values)
DO $$
DECLARE
  required_values TEXT[] := ARRAY[
    'ESTIMATE', 'PENDING_APPROVAL', 'SCHEDULED', 'DISPATCHED',
    'IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED', 'BILLED', 'CANCELLED'
  ];
  existing_values TEXT[];
  missing_values TEXT[];
  v TEXT;
BEGIN
  -- Get existing enum values
  SELECT array_agg(enumlabel::text ORDER BY enumsortorder)
  INTO existing_values
  FROM pg_enum
  WHERE enumtypid = '"JobStatus"'::regtype;

  RAISE NOTICE 'Current JobStatus values: %', existing_values;

  -- Check for missing values
  FOREACH v IN ARRAY required_values
  LOOP
    IF NOT (v = ANY(existing_values)) THEN
      missing_values := array_append(missing_values, v);
    END IF;
  END LOOP;

  IF missing_values IS NOT NULL AND array_length(missing_values, 1) > 0 THEN
    RAISE NOTICE 'Missing values that need to be added: %', missing_values;
    -- To add missing values, use:
    -- ALTER TYPE "JobStatus" ADD VALUE 'NEW_VALUE';
  ELSE
    RAISE NOTICE 'All required JobStatus values are present';
  END IF;
END $$;
