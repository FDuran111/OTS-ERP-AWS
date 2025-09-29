-- Add approval workflow fields to TimeEntry table
-- This script adds the necessary columns for the approval workflow

-- Add status column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'TimeEntry' AND column_name = 'status') THEN
        ALTER TABLE "TimeEntry"
        ADD COLUMN status TEXT DEFAULT 'draft'
        CHECK (status IN ('draft', 'submitted', 'approved', 'rejected'));
    END IF;
END $$;

-- Add submission tracking columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'TimeEntry' AND column_name = 'submittedAt') THEN
        ALTER TABLE "TimeEntry"
        ADD COLUMN "submittedAt" TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'TimeEntry' AND column_name = 'submittedBy') THEN
        ALTER TABLE "TimeEntry"
        ADD COLUMN "submittedBy" TEXT REFERENCES "User"(id);
    END IF;
END $$;

-- Add approval tracking columns (if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'TimeEntry' AND column_name = 'approvedAt') THEN
        ALTER TABLE "TimeEntry"
        ADD COLUMN "approvedAt" TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'TimeEntry' AND column_name = 'approvedBy') THEN
        ALTER TABLE "TimeEntry"
        ADD COLUMN "approvedBy" TEXT REFERENCES "User"(id);
    END IF;
END $$;

-- Add rejection tracking columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'TimeEntry' AND column_name = 'rejectedAt') THEN
        ALTER TABLE "TimeEntry"
        ADD COLUMN "rejectedAt" TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'TimeEntry' AND column_name = 'rejectedBy') THEN
        ALTER TABLE "TimeEntry"
        ADD COLUMN "rejectedBy" TEXT REFERENCES "User"(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'TimeEntry' AND column_name = 'rejectionReason') THEN
        ALTER TABLE "TimeEntry"
        ADD COLUMN "rejectionReason" TEXT;
    END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_time_entry_status ON "TimeEntry"(status);
CREATE INDEX IF NOT EXISTS idx_time_entry_submitted ON "TimeEntry"("submittedAt");
CREATE INDEX IF NOT EXISTS idx_time_entry_approved ON "TimeEntry"("approvedAt");

-- Update existing entries to have draft status if null
UPDATE "TimeEntry"
SET status = 'draft'
WHERE status IS NULL;

COMMIT;