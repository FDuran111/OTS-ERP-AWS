-- Create BidSheet table for storing bid sheet data
CREATE TABLE IF NOT EXISTS "BidSheet" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "jobId" UUID NOT NULL REFERENCES "Job"(id) ON DELETE CASCADE,
    "jobNumber" VARCHAR(50) NOT NULL,
    "jobDescription" TEXT,
    "customerName" VARCHAR(255) NOT NULL,
    "customerAddress" TEXT,
    "contactPerson" VARCHAR(255),
    "contactPhone" VARCHAR(50),
    "contactEmail" VARCHAR(255),
    "bidDate" DATE NOT NULL,
    "validUntil" DATE NOT NULL,
    "projectType" VARCHAR(100) NOT NULL,
    "priority" VARCHAR(50) NOT NULL,
    "scopeOfWork" TEXT,
    "laborDescription" TEXT,
    "materialDescription" TEXT,
    "lineItems" JSONB NOT NULL DEFAULT '[]',
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paymentTerms" TEXT NOT NULL DEFAULT 'Net 30 days',
    "warrantyTerms" TEXT NOT NULL DEFAULT '1 year on labor, manufacturer warranty on materials',
    "notes" TEXT,
    "createdBy" UUID NOT NULL REFERENCES "User"(id),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster job lookups
CREATE INDEX IF NOT EXISTS "idx_bid_sheet_job_id" ON "BidSheet"("jobId");

-- Create index for faster date-based queries
CREATE INDEX IF NOT EXISTS "idx_bid_sheet_bid_date" ON "BidSheet"("bidDate");

-- Create index for faster user-based queries
CREATE INDEX IF NOT EXISTS "idx_bid_sheet_created_by" ON "BidSheet"("createdBy");

-- Add BID_SHEET to attachment types if not already present
DO $$
BEGIN
    -- Check if the attachment type enum needs to be updated
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'BID_SHEET' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'attachment_type')
    ) THEN
        -- Add BID_SHEET to the enum if it doesn't exist
        -- Note: This assumes there's an attachment_type enum, if not, this part will be skipped
        BEGIN
            ALTER TYPE attachment_type ADD VALUE 'BID_SHEET';
        EXCEPTION
            WHEN OTHERS THEN
                -- If the enum doesn't exist or other error, just skip
                NULL;
        END;
    END IF;
END
$$;