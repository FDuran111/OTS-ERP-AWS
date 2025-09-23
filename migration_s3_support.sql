-- S3 File Upload Support Migration Script
-- Safe to run on production - only ADDS new features
-- Date: 2025-09-22
-- Purpose: Add S3 file storage support to RDS

-- ================================================================
-- COMPARISON RESULTS:
-- RDS has 115 tables, Local has 116 tables
-- Both are nearly identical except:
-- - Local has TimeTrackingSettings (not in RDS)
-- - Both have FileAttachment and JobAttachment tables ready
-- - Neither has FileUpload table (need to create)
-- ================================================================

BEGIN;

-- 1. Create FileUpload table for S3 integration
-- This is the main table for tracking all S3 uploads
CREATE TABLE IF NOT EXISTS "FileUpload" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jobId UUID REFERENCES "Job"(id) ON DELETE CASCADE,
  userId UUID REFERENCES "User"(id),
  fileName TEXT NOT NULL,
  fileType TEXT NOT NULL,
  fileSize INTEGER NOT NULL,
  s3Key TEXT NOT NULL,
  s3Bucket TEXT,
  thumbnailS3Key TEXT,
  category TEXT CHECK (category IN ('photo', 'document', 'invoice', 'attachment')),
  metadata JSONB,
  uploadedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deletedAt TIMESTAMP,
  CONSTRAINT file_size_check CHECK (fileSize > 0 AND fileSize < 104857600) -- Max 100MB
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_file_upload_job_id ON "FileUpload"(jobId);
CREATE INDEX IF NOT EXISTS idx_file_upload_user_id ON "FileUpload"(userId);
CREATE INDEX IF NOT EXISTS idx_file_upload_category ON "FileUpload"(category);
CREATE INDEX IF NOT EXISTS idx_file_upload_uploaded_at ON "FileUpload"(uploadedAt DESC);

-- 2. Add S3 fields to existing FileAttachment table if not present
-- These columns may already exist, so we check first
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='FileAttachment' AND column_name='s3Key') THEN
        ALTER TABLE "FileAttachment" ADD COLUMN s3Key TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='FileAttachment' AND column_name='s3Bucket') THEN
        ALTER TABLE "FileAttachment" ADD COLUMN s3Bucket TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='FileAttachment' AND column_name='cdnUrl') THEN
        ALTER TABLE "FileAttachment" ADD COLUMN cdnUrl TEXT;
    END IF;
END $$;

-- 3. Add S3 fields to JobAttachment for direct job file references
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='JobAttachment' AND column_name='s3Key') THEN
        ALTER TABLE "JobAttachment" ADD COLUMN s3Key TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='JobAttachment' AND column_name='s3Bucket') THEN
        ALTER TABLE "JobAttachment" ADD COLUMN s3Bucket TEXT;
    END IF;
END $$;

-- 4. Add edit request tracking to TimeEntry (for the feature we built earlier)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='TimeEntry' AND column_name='status') THEN
        ALTER TABLE "TimeEntry" ADD COLUMN status TEXT DEFAULT 'approved'
            CHECK (status IN ('pending', 'approved', 'rejected'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='TimeEntry' AND column_name='editRequest') THEN
        ALTER TABLE "TimeEntry" ADD COLUMN editRequest JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='TimeEntry' AND column_name='editRequestedAt') THEN
        ALTER TABLE "TimeEntry" ADD COLUMN editRequestedAt TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='TimeEntry' AND column_name='editApprovedBy') THEN
        ALTER TABLE "TimeEntry" ADD COLUMN editApprovedBy UUID REFERENCES "User"(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='TimeEntry' AND column_name='editApprovedAt') THEN
        ALTER TABLE "TimeEntry" ADD COLUMN editApprovedAt TIMESTAMP;
    END IF;
END $$;

-- 5. Create a view for easy file queries with job info
CREATE OR REPLACE VIEW "JobFileView" AS
SELECT
    f.id,
    f.fileName,
    f.fileType,
    f.fileSize,
    f.s3Key,
    f.category,
    f.uploadedAt,
    f.userId,
    u.name as uploadedByName,
    f.jobId,
    j."jobNumber",
    j.title as jobTitle,
    j.customer as jobCustomer
FROM "FileUpload" f
LEFT JOIN "User" u ON f.userId = u.id
LEFT JOIN "Job" j ON f.jobId = j.id
WHERE f.deletedAt IS NULL
ORDER BY f.uploadedAt DESC;

-- 6. Add missing TimeTrackingSettings table (in local but not RDS)
CREATE TABLE IF NOT EXISTS "TimeTrackingSettings" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    companyId UUID,
    allowGpsTracking BOOLEAN DEFAULT true,
    requirePhotoCheckIn BOOLEAN DEFAULT false,
    roundToNearestMinutes INTEGER DEFAULT 15,
    maxDailyHours NUMERIC DEFAULT 12,
    overtimeThreshold NUMERIC DEFAULT 8,
    breakDeductionMinutes INTEGER DEFAULT 30,
    autoClockOutAfterHours INTEGER DEFAULT 12,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Grant appropriate permissions
GRANT ALL ON "FileUpload" TO otsapp;
GRANT ALL ON "TimeTrackingSettings" TO otsapp;
GRANT SELECT ON "JobFileView" TO otsapp;

COMMIT;

-- ================================================================
-- ROLLBACK SCRIPT (if needed)
-- ================================================================
-- BEGIN;
-- DROP VIEW IF EXISTS "JobFileView";
-- DROP TABLE IF EXISTS "FileUpload";
-- DROP TABLE IF EXISTS "TimeTrackingSettings";
-- ALTER TABLE "FileAttachment" DROP COLUMN IF EXISTS s3Key;
-- ALTER TABLE "FileAttachment" DROP COLUMN IF EXISTS s3Bucket;
-- ALTER TABLE "FileAttachment" DROP COLUMN IF EXISTS cdnUrl;
-- ALTER TABLE "JobAttachment" DROP COLUMN IF EXISTS s3Key;
-- ALTER TABLE "JobAttachment" DROP COLUMN IF EXISTS s3Bucket;
-- ALTER TABLE "TimeEntry" DROP COLUMN IF EXISTS status;
-- ALTER TABLE "TimeEntry" DROP COLUMN IF EXISTS editRequest;
-- ALTER TABLE "TimeEntry" DROP COLUMN IF EXISTS editRequestedAt;
-- ALTER TABLE "TimeEntry" DROP COLUMN IF EXISTS editApprovedBy;
-- ALTER TABLE "TimeEntry" DROP COLUMN IF EXISTS editApprovedAt;
-- COMMIT;