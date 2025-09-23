-- Check Local Database Schema
-- This script will help us understand what tables and columns exist locally

-- 1. List all tables
\echo '=== ALL TABLES IN LOCAL ==='
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Check specific important tables for S3 integration
\echo '=== CHECK FOR FileUpload TABLE ==='
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'FileUpload'
) as file_upload_exists;

\echo '=== CHECK FOR JobAttachment TABLE ==='
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'JobAttachment'
ORDER BY ordinal_position;

\echo '=== CHECK FOR FileAttachment TABLE ==='
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'FileAttachment'
ORDER BY ordinal_position;

-- 3. Check TimeEntry table structure (for recent changes)
\echo '=== TimeEntry TABLE STRUCTURE ==='
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'TimeEntry'
ORDER BY ordinal_position;

-- 4. Check User table for role field
\echo '=== User TABLE ROLE FIELD ==='
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'User'
AND column_name IN ('role', 'permissions', 'userRole')
ORDER BY ordinal_position;

-- 5. Count records in key tables
\echo '=== RECORD COUNTS ==='
SELECT 'User' as table_name, COUNT(*) as count FROM "User"
UNION ALL
SELECT 'Job', COUNT(*) FROM "Job"
UNION ALL
SELECT 'TimeEntry', COUNT(*) FROM "TimeEntry"
UNION ALL
SELECT 'Customer', COUNT(*) FROM "Customer"
UNION ALL
SELECT 'JobSchedule', COUNT(*) FROM "JobSchedule"
ORDER BY table_name;