-- Migration: Add FileUpload table for job file attachments
-- Run this on RDS production database

-- Create FileUpload table if it doesn't exist
CREATE TABLE IF NOT EXISTS "FileUpload" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    jobid TEXT REFERENCES "Job"(id) ON DELETE CASCADE,
    userid TEXT REFERENCES "User"(id),
    filename TEXT NOT NULL,
    filetype TEXT NOT NULL,
    filesize INTEGER NOT NULL,
    s3key TEXT NOT NULL,
    s3bucket TEXT,
    thumbnails3key TEXT,
    category TEXT CHECK (category IN ('photo', 'document', 'invoice', 'attachment')),
    metadata JSONB,
    uploadedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deletedat TIMESTAMP
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_fileupload_jobid ON "FileUpload"(jobid);
CREATE INDEX IF NOT EXISTS idx_fileupload_userid ON "FileUpload"(userid);
CREATE INDEX IF NOT EXISTS idx_fileupload_deletedat ON "FileUpload"(deletedat);

-- Add file size constraint (max 100MB)
ALTER TABLE "FileUpload" ADD CONSTRAINT IF NOT EXISTS file_size_check
CHECK (filesize > 0 AND filesize < 104857600);

-- Grant permissions if needed (adjust based on your RDS user setup)
-- GRANT ALL ON "FileUpload" TO your_app_user;