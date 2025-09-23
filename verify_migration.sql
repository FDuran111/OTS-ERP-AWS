-- Verification Script for S3 Migration
-- Run this after migration to confirm all changes were applied

\echo '=== CHECKING FILEUPLOAD TABLE ==='
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'FileUpload'
) as file_upload_created;

\echo '=== FILEUPLOAD TABLE STRUCTURE ==='
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'FileUpload'
ORDER BY ordinal_position;

\echo '=== FILEATTACHMENT S3 COLUMNS ==='
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'FileAttachment'
AND column_name IN ('s3Key', 's3Bucket', 'cdnUrl');

\echo '=== JOBATTACHMENT S3 COLUMNS ==='
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'JobAttachment'
AND column_name IN ('s3Key', 's3Bucket');

\echo '=== TIMEENTRY EDIT REQUEST COLUMNS ==='
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'TimeEntry'
AND column_name IN ('status', 'editRequest', 'editRequestedAt', 'editApprovedBy', 'editApprovedAt');

\echo '=== TIMETRACKINGSETTINGS TABLE ==='
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'TimeTrackingSettings'
) as time_tracking_settings_created;

\echo '=== JOBFILEVIEW VIEW ==='
SELECT EXISTS (
    SELECT 1
    FROM information_schema.views
    WHERE table_schema = 'public'
    AND table_name = 'JobFileView'
) as job_file_view_created;

\echo '=== ALL INDEXES ON FILEUPLOAD ==='
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'FileUpload';

\echo '=== MIGRATION COMPLETED SUCCESSFULLY! ===
If all checks show TRUE/data, the migration is complete.'