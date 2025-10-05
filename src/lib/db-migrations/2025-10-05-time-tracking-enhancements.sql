-- ================================================
-- Time Tracking Enhancements Migration
-- Adds support for rejection notes threading and photo attachments
-- Created: 2025-10-05
-- ================================================

-- ================================================
-- 1. TimeEntryRejectionNote Table
-- Stores conversation thread when time entries are rejected
-- ================================================
CREATE TABLE IF NOT EXISTS "TimeEntryRejectionNote" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "timeEntryId" text NOT NULL REFERENCES "TimeEntry"(id) ON DELETE CASCADE,
    "userId" text NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    "userRole" varchar(20) NOT NULL, -- 'ADMIN', 'MANAGER', 'EMPLOYEE'
    note text NOT NULL,
    "isAdminNote" boolean DEFAULT false, -- Quick flag for filtering
    "createdAt" timestamp NOT NULL DEFAULT NOW()
);

-- Index for quick note retrieval by time entry
CREATE INDEX IF NOT EXISTS idx_rejection_note_time_entry 
    ON "TimeEntryRejectionNote"("timeEntryId", "createdAt");

-- Index for user's notes
CREATE INDEX IF NOT EXISTS idx_rejection_note_user 
    ON "TimeEntryRejectionNote"("userId");

-- ================================================
-- 2. TimeEntryPhoto Table
-- Stores photos attached to time entries for proof of work
-- ================================================
CREATE TABLE IF NOT EXISTS "TimeEntryPhoto" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "timeEntryId" text NOT NULL REFERENCES "TimeEntry"(id) ON DELETE CASCADE,
    "uploadedBy" text NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    "photoUrl" text NOT NULL,
    "thumbnailUrl" text,
    caption text,
    "fileSize" integer, -- in bytes
    "mimeType" varchar(50),
    "uploadedAt" timestamp NOT NULL DEFAULT NOW()
);

-- Index for photo retrieval by time entry
CREATE INDEX IF NOT EXISTS idx_time_entry_photo_entry 
    ON "TimeEntryPhoto"("timeEntryId", "uploadedAt");

-- Index for user's uploaded photos
CREATE INDEX IF NOT EXISTS idx_time_entry_photo_user 
    ON "TimeEntryPhoto"("uploadedBy");

-- ================================================
-- 3. Update TimeEntry table to add new fields
-- ================================================

-- Add field to track if entry has been reviewed after rejection
ALTER TABLE "TimeEntry" 
ADD COLUMN IF NOT EXISTS "hasRejectionNotes" boolean DEFAULT false;

-- Add field to track photo count for quick display
ALTER TABLE "TimeEntry" 
ADD COLUMN IF NOT EXISTS "photoCount" integer DEFAULT 0;

-- ================================================
-- 4. Create triggers to maintain counts
-- ================================================

-- Trigger to update hasRejectionNotes flag
CREATE OR REPLACE FUNCTION update_rejection_notes_flag()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE "TimeEntry"
    SET "hasRejectionNotes" = true
    WHERE id = NEW."timeEntryId";
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_rejection_notes_flag
AFTER INSERT ON "TimeEntryRejectionNote"
FOR EACH ROW
EXECUTE FUNCTION update_rejection_notes_flag();

-- Trigger to update photo count
CREATE OR REPLACE FUNCTION update_photo_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE "TimeEntry"
        SET "photoCount" = "photoCount" + 1
        WHERE id = NEW."timeEntryId";
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE "TimeEntry"
        SET "photoCount" = GREATEST("photoCount" - 1, 0)
        WHERE id = OLD."timeEntryId";
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_photo_count_insert
AFTER INSERT ON "TimeEntryPhoto"
FOR EACH ROW
EXECUTE FUNCTION update_photo_count();

CREATE TRIGGER trigger_update_photo_count_delete
AFTER DELETE ON "TimeEntryPhoto"
FOR EACH ROW
EXECUTE FUNCTION update_photo_count();

-- ================================================
-- 5. Grant permissions (if using row-level security)
-- ================================================

-- Users can see their own rejection notes
-- Admins can see all rejection notes
-- (Actual RLS policies would be set up separately if needed)

COMMENT ON TABLE "TimeEntryRejectionNote" IS 'Stores conversation thread for rejected time entries';
COMMENT ON TABLE "TimeEntryPhoto" IS 'Stores photos attached to time entries as proof of work';
