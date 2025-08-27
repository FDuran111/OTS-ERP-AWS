-- URL Rewrite Template for Post-Migration
-- Purpose: Update file URLs from Supabase to CloudFront/S3 after migration
-- 
-- IMPORTANT: 
-- 1. Replace <CLOUDFRONT_BASE> with your actual CloudFront URL (e.g., 'https://cdn.ots-erp.com')
-- 2. Backup your database before running this script
-- 3. Test on a staging database first

-- ============================================
-- Step 1: Create backup table (REQUIRED)
-- ============================================
CREATE TABLE IF NOT EXISTS "FileAttachment_backup_<DATE>" AS 
SELECT * FROM "FileAttachment";

-- Verify backup
SELECT COUNT(*) as backup_count FROM "FileAttachment_backup_<DATE>";

-- ============================================
-- Step 2: Update Supabase URLs to CloudFront
-- ============================================

-- Update main file URLs
UPDATE "FileAttachment"
SET "fileUrl" = CONCAT('<CLOUDFRONT_BASE>/', 
  CASE 
    WHEN "filePath" LIKE 'uploads/%' THEN "filePath"
    WHEN "filePath" LIKE 'thumbnails/%' THEN "filePath"
    ELSE CONCAT('uploads/', "filePath")
  END
)
WHERE "fileUrl" LIKE 'https://%.supabase.co/storage/v1/object/public/%'
  AND "fileUrl" IS NOT NULL;

-- Update thumbnail URLs
UPDATE "FileAttachment"
SET "thumbnailUrl" = CONCAT('<CLOUDFRONT_BASE>/', 
  CASE 
    WHEN "thumbnailPath" LIKE 'thumbnails/%' THEN "thumbnailPath"
    ELSE CONCAT('thumbnails/', "thumbnailPath")
  END
)
WHERE "thumbnailUrl" LIKE 'https://%.supabase.co/storage/v1/object/public/%'
  AND "thumbnailUrl" IS NOT NULL
  AND "thumbnailPath" IS NOT NULL;

-- ============================================
-- Step 3: Update S3 presigned URLs (if stored)
-- ============================================
-- Note: Presigned URLs expire, so these should be regenerated at runtime
-- This updates any that might have been cached

UPDATE "FileAttachment"
SET "fileUrl" = CONCAT('<CLOUDFRONT_BASE>/', "filePath")
WHERE "fileUrl" LIKE 'https://s3.%.amazonaws.com/%'
  AND "fileUrl" IS NOT NULL;

-- ============================================
-- Step 4: Verification Queries
-- ============================================

-- Count remaining Supabase URLs (should be 0)
SELECT COUNT(*) as remaining_supabase_urls
FROM "FileAttachment"
WHERE ("fileUrl" LIKE '%supabase.co%' OR "thumbnailUrl" LIKE '%supabase.co%');

-- Sample of updated URLs
SELECT id, "fileName", "fileUrl", "thumbnailUrl"
FROM "FileAttachment"
WHERE "fileUrl" LIKE '<CLOUDFRONT_BASE>%'
LIMIT 10;

-- Count by URL pattern
SELECT 
  CASE 
    WHEN "fileUrl" LIKE '<CLOUDFRONT_BASE>%' THEN 'CloudFront'
    WHEN "fileUrl" LIKE '%supabase.co%' THEN 'Supabase (old)'
    WHEN "fileUrl" LIKE '%amazonaws.com%' THEN 'S3 Direct'
    ELSE 'Other'
  END as url_type,
  COUNT(*) as count
FROM "FileAttachment"
GROUP BY url_type;

-- ============================================
-- Step 5: Rollback (if needed)
-- ============================================
-- To rollback, restore from backup:
-- 
-- TRUNCATE "FileAttachment";
-- INSERT INTO "FileAttachment" SELECT * FROM "FileAttachment_backup_<DATE>";
-- 
-- Then drop the backup table:
-- DROP TABLE "FileAttachment_backup_<DATE>";

-- ============================================
-- Notes
-- ============================================
-- 1. This script assumes FileAttachment table structure from inventory
-- 2. Replace <DATE> with today's date (e.g., 20240120)
-- 3. Replace <CLOUDFRONT_BASE> with your CloudFront distribution URL
-- 4. If not using CloudFront, use your S3 bucket URL: https://bucket-name.s3.region.amazonaws.com
-- 5. Consider running during maintenance window to avoid conflicts
-- 6. After running, test file access through the application