-- Phase 3: Time Entry Photos
-- Allows employees to attach multiple photos to time entries

CREATE TABLE IF NOT EXISTS "TimeEntryPhoto" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "timeEntryId" TEXT NOT NULL,
  "fileKey" TEXT NOT NULL, -- S3 key or local path
  "thumbnailKey" TEXT, -- Thumbnail for gallery view
  "fileName" TEXT NOT NULL, -- Original filename
  "fileSize" INTEGER NOT NULL, -- Size in bytes
  "mimeType" TEXT NOT NULL, -- image/jpeg, image/png, etc.
  "caption" TEXT, -- Optional description
  "takenAt" TIMESTAMP, -- When photo was taken (EXIF data if available)
  "uploadedBy" TEXT, -- User who uploaded
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TimeEntryPhoto_timeEntryId_fkey"
    FOREIGN KEY ("timeEntryId")
    REFERENCES "TimeEntry"(id)
    ON DELETE CASCADE
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS "idx_photo_timeentry"
  ON "TimeEntryPhoto"("timeEntryId");

-- Index for finding photos by user
CREATE INDEX IF NOT EXISTS "idx_photo_uploadedby"
  ON "TimeEntryPhoto"("uploadedBy");

-- Comments
COMMENT ON TABLE "TimeEntryPhoto" IS 'Photos attached to time entries showing work completed';
COMMENT ON COLUMN "TimeEntryPhoto"."fileKey" IS 'S3 key or local file path';
COMMENT ON COLUMN "TimeEntryPhoto"."thumbnailKey" IS 'Compressed thumbnail for gallery view';
COMMENT ON COLUMN "TimeEntryPhoto"."takenAt" IS 'When photo was taken (from EXIF if available)';
