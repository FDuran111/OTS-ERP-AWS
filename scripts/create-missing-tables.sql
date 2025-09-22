-- ================================================
-- AWS RDS Compatible Tables Creation Script
-- Creates missing tables that failed during migration
-- Run this on your local PostgreSQL first, then on RDS
-- ================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- 1. JobSchedule Table (Job Scheduling)
-- ================================================
DROP TABLE IF EXISTS "CrewAssignment" CASCADE;  -- Drop dependent table first
DROP TABLE IF EXISTS "JobSchedule" CASCADE;

CREATE TABLE "JobSchedule" (
    id TEXT PRIMARY KEY DEFAULT ('js_' || replace(uuid_generate_v4()::text, '-', '')),
    "jobId" TEXT NOT NULL,
    "scheduledBy" TEXT,
    "startDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "endDate" TIMESTAMP WITH TIME ZONE,
    "estimatedHours" NUMERIC(5,2) NOT NULL,
    "actualHours" NUMERIC(5,2) DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    "startedAt" TIMESTAMP WITH TIME ZONE,
    "completedAt" TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    "rescheduleReason" TEXT,
    "originalStartDate" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT "JobSchedule_jobId_key" UNIQUE ("jobId"),
    CONSTRAINT "JobSchedule_check" CHECK ("endDate" IS NULL OR "endDate" >= "startDate"),
    CONSTRAINT "JobSchedule_estimatedHours_check" CHECK ("estimatedHours" > 0),
    CONSTRAINT "JobSchedule_status_check" CHECK (
        status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')
    ),

    -- Foreign Keys
    CONSTRAINT "JobSchedule_jobId_fkey"
        FOREIGN KEY ("jobId") REFERENCES "Job"(id) ON DELETE CASCADE,
    CONSTRAINT "JobSchedule_scheduledBy_fkey"
        FOREIGN KEY ("scheduledBy") REFERENCES "User"(id) ON DELETE SET NULL
);

-- Indexes for JobSchedule
CREATE INDEX "idx_job_schedule_job" ON "JobSchedule" ("jobId");
CREATE INDEX "idx_job_schedule_start_date" ON "JobSchedule" ("startDate");
CREATE INDEX "idx_job_schedule_status" ON "JobSchedule" (status);

-- ================================================
-- 2. CrewAssignment Table (Crew Management)
-- ================================================
CREATE TABLE "CrewAssignment" (
    id TEXT PRIMARY KEY DEFAULT ('ca_' || replace(uuid_generate_v4()::text, '-', '')),
    "scheduleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'TECHNICIAN',
    "assignedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "assignedBy" TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ASSIGNED',
    "respondedAt" TIMESTAMP WITH TIME ZONE,
    "checkedInAt" TIMESTAMP WITH TIME ZONE,
    "checkedOutAt" TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT "CrewAssignment_scheduleId_userId_key" UNIQUE ("scheduleId", "userId"),
    CONSTRAINT "CrewAssignment_check" CHECK (
        "checkedOutAt" IS NULL OR "checkedInAt" IS NOT NULL
    ),
    CONSTRAINT "CrewAssignment_check1" CHECK (
        "checkedOutAt" IS NULL OR "checkedOutAt" >= "checkedInAt"
    ),
    CONSTRAINT "CrewAssignment_role_check" CHECK (
        role IN ('LEAD', 'TECHNICIAN', 'APPRENTICE', 'HELPER')
    ),
    CONSTRAINT "CrewAssignment_status_check" CHECK (
        status IN ('ASSIGNED', 'ACCEPTED', 'DECLINED', 'REMOVED')
    ),

    -- Foreign Keys
    CONSTRAINT "CrewAssignment_scheduleId_fkey"
        FOREIGN KEY ("scheduleId") REFERENCES "JobSchedule"(id) ON DELETE CASCADE,
    CONSTRAINT "CrewAssignment_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
    CONSTRAINT "CrewAssignment_jobId_fkey"
        FOREIGN KEY ("jobId") REFERENCES "Job"(id) ON DELETE CASCADE,
    CONSTRAINT "CrewAssignment_assignedBy_fkey"
        FOREIGN KEY ("assignedBy") REFERENCES "User"(id) ON DELETE SET NULL
);

-- Indexes for CrewAssignment
CREATE INDEX "idx_crew_assignment_schedule" ON "CrewAssignment" ("scheduleId");
CREATE INDEX "idx_crew_assignment_user" ON "CrewAssignment" ("userId");
CREATE INDEX "idx_crew_assignment_job" ON "CrewAssignment" ("jobId");

-- ================================================
-- 3. BidSheet Table (Estimates/Bids)
-- Note: This table doesn't exist in Supabase, creating new
-- ================================================
CREATE TABLE IF NOT EXISTS "BidSheet" (
    id TEXT PRIMARY KEY DEFAULT ('bs_' || replace(uuid_generate_v4()::text, '-', '')),
    "jobId" TEXT,
    "leadId" TEXT,
    "customerId" TEXT,
    "bidNumber" TEXT UNIQUE,
    "revisionNumber" INTEGER DEFAULT 1,

    -- Bid Details
    title TEXT NOT NULL,
    description TEXT,
    scope TEXT,
    exclusions TEXT,

    -- Pricing
    "laborCost" NUMERIC(10,2) DEFAULT 0,
    "materialCost" NUMERIC(10,2) DEFAULT 0,
    "equipmentCost" NUMERIC(10,2) DEFAULT 0,
    "subcontractorCost" NUMERIC(10,2) DEFAULT 0,
    "otherCost" NUMERIC(10,2) DEFAULT 0,
    "subtotal" NUMERIC(10,2) GENERATED ALWAYS AS (
        "laborCost" + "materialCost" + "equipmentCost" + "subcontractorCost" + "otherCost"
    ) STORED,
    "profitMargin" NUMERIC(5,2) DEFAULT 20.00,
    "profitAmount" NUMERIC(10,2) GENERATED ALWAYS AS (
        ("laborCost" + "materialCost" + "equipmentCost" + "subcontractorCost" + "otherCost") * "profitMargin" / 100
    ) STORED,
    "taxRate" NUMERIC(5,2) DEFAULT 0,
    "taxAmount" NUMERIC(10,2) DEFAULT 0,
    "totalAmount" NUMERIC(10,2) GENERATED ALWAYS AS (
        ("laborCost" + "materialCost" + "equipmentCost" + "subcontractorCost" + "otherCost") * (1 + "profitMargin" / 100) + "taxAmount"
    ) STORED,

    -- Timeline
    "estimatedStartDate" DATE,
    "estimatedEndDate" DATE,
    "estimatedDays" INTEGER,
    "validUntil" DATE,

    -- Status
    status VARCHAR(20) DEFAULT 'DRAFT',
    "presentedAt" TIMESTAMP WITH TIME ZONE,
    "acceptedAt" TIMESTAMP WITH TIME ZONE,
    "rejectedAt" TIMESTAMP WITH TIME ZONE,
    "rejectionReason" TEXT,

    -- Metadata
    "createdBy" TEXT,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT "BidSheet_status_check" CHECK (
        status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PRESENTED', 'ACCEPTED', 'REJECTED', 'EXPIRED')
    ),

    -- Foreign Keys
    CONSTRAINT "BidSheet_jobId_fkey"
        FOREIGN KEY ("jobId") REFERENCES "Job"(id) ON DELETE SET NULL,
    CONSTRAINT "BidSheet_leadId_fkey"
        FOREIGN KEY ("leadId") REFERENCES "Lead"(id) ON DELETE SET NULL,
    CONSTRAINT "BidSheet_customerId_fkey"
        FOREIGN KEY ("customerId") REFERENCES "Customer"(id) ON DELETE SET NULL,
    CONSTRAINT "BidSheet_createdBy_fkey"
        FOREIGN KEY ("createdBy") REFERENCES "User"(id) ON DELETE SET NULL,
    CONSTRAINT "BidSheet_approvedBy_fkey"
        FOREIGN KEY ("approvedBy") REFERENCES "User"(id) ON DELETE SET NULL
);

-- Indexes for BidSheet
CREATE INDEX "idx_bid_sheet_job" ON "BidSheet" ("jobId");
CREATE INDEX "idx_bid_sheet_lead" ON "BidSheet" ("leadId");
CREATE INDEX "idx_bid_sheet_customer" ON "BidSheet" ("customerId");
CREATE INDEX "idx_bid_sheet_status" ON "BidSheet" (status);
CREATE INDEX "idx_bid_sheet_number" ON "BidSheet" ("bidNumber");

-- ================================================
-- 4. Simple Update Trigger Function (AWS Compatible)
-- Replaces Supabase's complex triggers
-- ================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_job_schedule_updated_at
    BEFORE UPDATE ON "JobSchedule"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crew_assignment_updated_at
    BEFORE UPDATE ON "CrewAssignment"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bid_sheet_updated_at
    BEFORE UPDATE ON "BidSheet"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 5. Generate initial bid number sequence
-- ================================================
CREATE SEQUENCE IF NOT EXISTS bid_number_seq START 1000;

-- Function to generate bid numbers
CREATE OR REPLACE FUNCTION generate_bid_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."bidNumber" IS NULL THEN
        NEW."bidNumber" = 'BID-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('bid_number_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_bid_number_trigger
    BEFORE INSERT ON "BidSheet"
    FOR EACH ROW EXECUTE FUNCTION generate_bid_number();

-- ================================================
-- Verification Queries
-- ================================================
-- Run these to verify tables were created:
-- SELECT COUNT(*) FROM "JobSchedule";
-- SELECT COUNT(*) FROM "CrewAssignment";
-- SELECT COUNT(*) FROM "BidSheet";