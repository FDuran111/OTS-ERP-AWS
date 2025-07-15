-- Migration to update file URLs to use the API route
-- This updates existing file URLs from /uploads/... to /api/uploads/...

-- Update FileAttachment table
UPDATE "FileAttachment"
SET 
  "fileUrl" = '/api' || "fileUrl",
  "thumbnailUrl" = CASE 
    WHEN "thumbnailUrl" IS NOT NULL THEN '/api' || "thumbnailUrl"
    ELSE NULL
  END,
  "updatedAt" = NOW()
WHERE "fileUrl" LIKE '/uploads/%'
  AND "fileUrl" NOT LIKE '/api/uploads/%';

-- Add a note about the migration
COMMENT ON TABLE "FileAttachment" IS 'Central file storage for all uploaded files with metadata. File URLs updated to use /api/uploads/ route.';

-- Count how many records were updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % file attachment records', updated_count;
END $$;