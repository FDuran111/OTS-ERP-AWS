-- ================================================================
-- SYNC RDS SCHEMA TO MATCH LOCAL EXACTLY
-- Date: 2025-09-22
-- Purpose: Make RDS database schema identical to local (structure only, not data)
-- ================================================================

BEGIN;

-- ================================================================
-- 1. CREATE MISSING TABLES
-- ================================================================

-- TimeTrackingSettings table (only missing table)
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

-- ================================================================
-- 2. ADD S3/FILE UPLOAD SUPPORT (for future implementation)
-- ================================================================

-- Create FileUpload table for S3 integration
CREATE TABLE IF NOT EXISTS "FileUpload" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  jobId TEXT REFERENCES "Job"(id) ON DELETE CASCADE,
  userId TEXT REFERENCES "User"(id),
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

-- Create indexes for FileUpload
CREATE INDEX IF NOT EXISTS idx_file_upload_job_id ON "FileUpload"(jobId);
CREATE INDEX IF NOT EXISTS idx_file_upload_user_id ON "FileUpload"(userId);
CREATE INDEX IF NOT EXISTS idx_file_upload_category ON "FileUpload"(category);
CREATE INDEX IF NOT EXISTS idx_file_upload_uploaded_at ON "FileUpload"(uploadedAt DESC);

-- ================================================================
-- 3. ADD MISSING COLUMNS TO EXISTING TABLES
-- ================================================================

-- Add S3 fields to FileAttachment table
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

-- Add S3 fields to JobAttachment
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

-- Add edit request tracking to TimeEntry (for the employee time change feature)
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
        ALTER TABLE "TimeEntry" ADD COLUMN editApprovedBy TEXT REFERENCES "User"(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='TimeEntry' AND column_name='editApprovedAt') THEN
        ALTER TABLE "TimeEntry" ADD COLUMN editApprovedAt TIMESTAMP;
    END IF;
END $$;

-- ================================================================
-- 4. CREATE VIEWS FOR EASIER QUERIES
-- ================================================================

-- Create JobFileView for easy file queries
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
    j.description as jobDescription,
    j."customerId"
FROM "FileUpload" f
LEFT JOIN "User" u ON f.userId = u.id
LEFT JOIN "Job" j ON f.jobId = j.id
WHERE f.deletedAt IS NULL
ORDER BY f.uploadedAt DESC;

-- ================================================================
-- 5. GRANT PERMISSIONS
-- ================================================================

GRANT ALL ON "TimeTrackingSettings" TO otsapp;
GRANT ALL ON "FileUpload" TO otsapp;
GRANT SELECT ON "JobFileView" TO otsapp;

-- ================================================================
-- 6. UPDATE METADATA
-- ================================================================

COMMENT ON TABLE "TimeTrackingSettings" IS 'Company-wide time tracking configuration';
COMMENT ON TABLE "FileUpload" IS 'S3 file upload tracking for jobs';
COMMENT ON VIEW "JobFileView" IS 'Consolidated view of job file uploads';

COMMIT;

-- ================================================================
-- VERIFICATION QUERIES
-- Run these after migration to confirm success
-- ================================================================
/*
-- Check if all tables exist
SELECT COUNT(*) as table_count FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- Should be 96 tables

-- Check TimeTrackingSettings created
SELECT EXISTS (SELECT 1 FROM information_schema.tables
WHERE table_name = 'TimeTrackingSettings');

-- Check FileUpload created
SELECT EXISTS (SELECT 1 FROM information_schema.tables
WHERE table_name = 'FileUpload');

-- Check TimeEntry has new columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'TimeEntry'
AND column_name IN ('status', 'editRequest', 'editRequestedAt');
*/

-- ================================================================
-- ROLLBACK SCRIPT (if needed)
-- ================================================================
/*
BEGIN;
DROP VIEW IF EXISTS "JobFileView";
DROP TABLE IF EXISTS "FileUpload";
DROP TABLE IF EXISTS "TimeTrackingSettings";
ALTER TABLE "FileAttachment" DROP COLUMN IF EXISTS s3Key;
ALTER TABLE "FileAttachment" DROP COLUMN IF EXISTS s3Bucket;
ALTER TABLE "FileAttachment" DROP COLUMN IF EXISTS cdnUrl;
ALTER TABLE "JobAttachment" DROP COLUMN IF EXISTS s3Key;
ALTER TABLE "JobAttachment" DROP COLUMN IF EXISTS s3Bucket;
ALTER TABLE "TimeEntry" DROP COLUMN IF EXISTS status;
ALTER TABLE "TimeEntry" DROP COLUMN IF EXISTS editRequest;
ALTER TABLE "TimeEntry" DROP COLUMN IF EXISTS editRequestedAt;
ALTER TABLE "TimeEntry" DROP COLUMN IF EXISTS editApprovedBy;
ALTER TABLE "TimeEntry" DROP COLUMN IF EXISTS editApprovedAt;
COMMIT;
*/