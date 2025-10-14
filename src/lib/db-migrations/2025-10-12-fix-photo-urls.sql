-- Fix photo URLs to include /uploads/ prefix for local storage
-- This migration updates existing TimeEntryPhoto records that have keys instead of full URLs

-- Update photoUrl to include /uploads/ prefix if it doesn't already have it
UPDATE "TimeEntryPhoto"
SET "photoUrl" = '/uploads/' || "photoUrl"
WHERE "photoUrl" NOT LIKE '/uploads/%'
  AND "photoUrl" NOT LIKE 'http%'
  AND "photoUrl" IS NOT NULL;

-- Update thumbnailUrl to include /uploads/ prefix if it doesn't already have it
UPDATE "TimeEntryPhoto"
SET "thumbnailUrl" = '/uploads/' || "thumbnailUrl"
WHERE "thumbnailUrl" NOT LIKE '/uploads/%'
  AND "thumbnailUrl" NOT LIKE 'http%'
  AND "thumbnailUrl" IS NOT NULL;
