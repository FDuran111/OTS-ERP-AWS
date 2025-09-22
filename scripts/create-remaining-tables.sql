-- ================================================
-- AWS RDS Compatible Tables Creation Script
-- Creates remaining missing tables and views
-- Run this on your local PostgreSQL first, then on RDS
-- ================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- 1. MaterialReservation Table (Material Management)
-- ================================================
DROP TABLE IF EXISTS "MaterialReservation" CASCADE;

CREATE TABLE "MaterialReservation" (
    id TEXT PRIMARY KEY DEFAULT ('mr_' || replace(uuid_generate_v4()::text, '-', '')),
    "jobId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "phaseId" TEXT,
    "userId" TEXT,
    "quantityReserved" NUMERIC(10,2) NOT NULL,
    "reservedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "neededBy" TIMESTAMP WITH TIME ZONE,
    "expiresAt" TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "fulfilledAt" TIMESTAMP WITH TIME ZONE,
    "fulfilledQuantity" NUMERIC(10,2) DEFAULT 0,
    notes TEXT,
    priority VARCHAR(10) DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT "MaterialReservation_jobId_materialId_phaseId_key"
        UNIQUE ("jobId", "materialId", "phaseId"),
    CONSTRAINT "MaterialReservation_check"
        CHECK ("fulfilledQuantity" <= "quantityReserved"),
    CONSTRAINT "MaterialReservation_quantityReserved_check"
        CHECK ("quantityReserved" > 0),
    CONSTRAINT "MaterialReservation_status_check" CHECK (
        status IN ('ACTIVE', 'FULFILLED', 'EXPIRED', 'CANCELLED')
    ),
    CONSTRAINT "MaterialReservation_priority_check" CHECK (
        priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')
    ),

    -- Foreign Keys
    CONSTRAINT "MaterialReservation_jobId_fkey"
        FOREIGN KEY ("jobId") REFERENCES "Job"(id) ON DELETE CASCADE,
    CONSTRAINT "MaterialReservation_materialId_fkey"
        FOREIGN KEY ("materialId") REFERENCES "Material"(id) ON DELETE CASCADE,
    CONSTRAINT "MaterialReservation_phaseId_fkey"
        FOREIGN KEY ("phaseId") REFERENCES "JobPhase"(id) ON DELETE SET NULL,
    CONSTRAINT "MaterialReservation_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE SET NULL
);

-- Indexes for MaterialReservation
CREATE INDEX "idx_material_reservation_job" ON "MaterialReservation" ("jobId");
CREATE INDEX "idx_material_reservation_material" ON "MaterialReservation" ("materialId");
CREATE INDEX "idx_material_reservation_status" ON "MaterialReservation" (status);
CREATE INDEX "idx_material_reservation_needed_by" ON "MaterialReservation" ("neededBy");

-- ================================================
-- 2. StockMovement Table (Inventory Tracking)
-- ================================================
DROP TABLE IF EXISTS "StockMovement" CASCADE;

CREATE TABLE "StockMovement" (
    id TEXT PRIMARY KEY DEFAULT ('sm_' || replace(uuid_generate_v4()::text, '-', '')),
    "materialId" TEXT NOT NULL,
    "storageLocationId" TEXT,
    "jobId" TEXT,
    "userId" TEXT,
    type VARCHAR(20) NOT NULL,
    "quantityBefore" NUMERIC(10,2) NOT NULL DEFAULT 0,
    "quantityChanged" NUMERIC(10,2) NOT NULL,
    "quantityAfter" NUMERIC(10,2) NOT NULL DEFAULT 0,
    "unitCost" NUMERIC(10,2),
    "totalValue" NUMERIC(10,2),
    reason TEXT,
    "referenceNumber" VARCHAR(100),
    metadata JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT "StockMovement_type_check" CHECK (
        type IN ('PURCHASE', 'SALE', 'ADJUSTMENT', 'TRANSFER', 'USAGE', 'RETURN', 'WASTE')
    ),

    -- Foreign Keys
    CONSTRAINT "StockMovement_materialId_fkey"
        FOREIGN KEY ("materialId") REFERENCES "Material"(id) ON DELETE CASCADE,
    CONSTRAINT "StockMovement_storageLocationId_fkey"
        FOREIGN KEY ("storageLocationId") REFERENCES "StorageLocation"(id) ON DELETE SET NULL,
    CONSTRAINT "StockMovement_jobId_fkey"
        FOREIGN KEY ("jobId") REFERENCES "Job"(id) ON DELETE SET NULL,
    CONSTRAINT "StockMovement_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE SET NULL
);

-- Indexes for StockMovement
CREATE INDEX "idx_stock_movement_material_id" ON "StockMovement" ("materialId");
CREATE INDEX "idx_stock_movement_type" ON "StockMovement" (type);
CREATE INDEX "idx_stock_movement_created_at" ON "StockMovement" ("createdAt");

-- ================================================
-- 3. MaterialAvailability View
-- ================================================
DROP VIEW IF EXISTS "MaterialAvailability" CASCADE;

CREATE VIEW "MaterialAvailability" AS
SELECT
    m.id,
    m.code AS "itemNumber",
    m.description,
    m."inStock" AS "quantityOnHand",
    m."inStock" AS "availableQuantity",
    COALESCE(res."totalReserved", 0) AS "reservedQuantity",
    (m."inStock" - COALESCE(res."totalReserved", 0)) AS "netAvailable",
    m."minStock" AS "minQuantity",
    m."minStock" * 2 AS "maxQuantity",  -- Assuming max is 2x min
    m.unit,
    m.cost AS "unitCost",
    CASE
        WHEN m."inStock" <= m."minStock" THEN 'LOW_STOCK'
        WHEN m."inStock" >= (m."minStock" * 2) THEN 'OVERSTOCK'
        ELSE 'NORMAL'
    END AS "stockStatus"
FROM "Material" m
LEFT JOIN (
    SELECT
        "materialId",
        SUM("quantityReserved" - COALESCE("fulfilledQuantity", 0)) AS "totalReserved"
    FROM "MaterialReservation"
    WHERE status = 'ACTIVE'
    GROUP BY "materialId"
) res ON m.id = res."materialId";

-- ================================================
-- 4. JobReminder Table (Job Notifications)
-- ================================================
DROP TABLE IF EXISTS "JobReminder" CASCADE;

CREATE TABLE "JobReminder" (
    id TEXT PRIMARY KEY DEFAULT ('jr_' || replace(uuid_generate_v4()::text, '-', '')),
    "jobId" TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    "reminderDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "acknowledgedAt" TIMESTAMP WITH TIME ZONE,
    "snoozedUntil" TIMESTAMP WITH TIME ZONE,
    "phaseId" TEXT,
    metadata JSONB,

    -- Constraints
    CONSTRAINT "JobReminder_type_check" CHECK (
        type IN ('JOB_START', 'PHASE_START', 'DEADLINE_WARNING', 'FOLLOW_UP', 'OVERDUE', 'CUSTOM')
    ),
    CONSTRAINT "JobReminder_priority_check" CHECK (
        priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')
    ),
    CONSTRAINT "JobReminder_status_check" CHECK (
        status IN ('ACTIVE', 'ACKNOWLEDGED', 'SNOOZED', 'DISMISSED')
    ),

    -- Foreign Keys
    CONSTRAINT "JobReminder_jobId_fkey"
        FOREIGN KEY ("jobId") REFERENCES "Job"(id) ON DELETE CASCADE,
    CONSTRAINT "JobReminder_phaseId_fkey"
        FOREIGN KEY ("phaseId") REFERENCES "JobPhase"(id) ON DELETE CASCADE
);

-- Indexes for JobReminder
CREATE INDEX "idx_job_reminder_job_id" ON "JobReminder" ("jobId");
CREATE INDEX "idx_job_reminder_date" ON "JobReminder" ("reminderDate");
CREATE INDEX "idx_job_reminder_status" ON "JobReminder" (status);
CREATE INDEX "idx_job_reminder_type" ON "JobReminder" (type);
CREATE INDEX "idx_job_reminder_priority" ON "JobReminder" (priority);

-- ================================================
-- 5. NotificationLog Table (System Notifications)
-- ================================================
DROP TABLE IF EXISTS "NotificationLog" CASCADE;

CREATE TABLE "NotificationLog" (
    id TEXT PRIMARY KEY DEFAULT ('nl_' || replace(uuid_generate_v4()::text, '-', '')),
    "userId" TEXT,
    type VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'IN_APP',
    subject VARCHAR(255),
    message TEXT NOT NULL,
    metadata JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP WITH TIME ZONE,
    "readAt" TIMESTAMP WITH TIME ZONE,
    "failedAt" TIMESTAMP WITH TIME ZONE,
    "errorMessage" TEXT,
    "retryCount" INTEGER DEFAULT 0,
    "expiresAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT "NotificationLog_channel_check" CHECK (
        channel IN ('IN_APP', 'EMAIL', 'SMS', 'PUSH')
    ),
    CONSTRAINT "NotificationLog_status_check" CHECK (
        status IN ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'EXPIRED')
    ),

    -- Foreign Keys
    CONSTRAINT "NotificationLog_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
);

-- Indexes for NotificationLog
CREATE INDEX "idx_notification_log_user" ON "NotificationLog" ("userId");
CREATE INDEX "idx_notification_log_status" ON "NotificationLog" (status);
CREATE INDEX "idx_notification_log_created_at" ON "NotificationLog" ("createdAt");
CREATE INDEX "idx_notification_log_type" ON "NotificationLog" (type);

-- ================================================
-- 6. PayrollPeriod Table (Payroll Management)
-- ================================================
DROP TABLE IF EXISTS "PayrollPeriod" CASCADE;

CREATE TABLE "PayrollPeriod" (
    id TEXT PRIMARY KEY DEFAULT ('pp_' || replace(uuid_generate_v4()::text, '-', '')),
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "payDate" DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    type VARCHAR(20) NOT NULL DEFAULT 'BIWEEKLY',
    "totalHours" NUMERIC(10,2) DEFAULT 0,
    "totalRegularHours" NUMERIC(10,2) DEFAULT 0,
    "totalOvertimeHours" NUMERIC(10,2) DEFAULT 0,
    "totalGrossPay" NUMERIC(10,2) DEFAULT 0,
    "totalDeductions" NUMERIC(10,2) DEFAULT 0,
    "totalNetPay" NUMERIC(10,2) DEFAULT 0,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP WITH TIME ZONE,
    "exportedAt" TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    metadata JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT "PayrollPeriod_periodStart_periodEnd_key" UNIQUE ("periodStart", "periodEnd"),
    CONSTRAINT "PayrollPeriod_date_check" CHECK ("periodEnd" >= "periodStart"),
    CONSTRAINT "PayrollPeriod_status_check" CHECK (
        status IN ('OPEN', 'CLOSED', 'APPROVED', 'EXPORTED', 'PAID')
    ),
    CONSTRAINT "PayrollPeriod_type_check" CHECK (
        type IN ('WEEKLY', 'BIWEEKLY', 'SEMIMONTHLY', 'MONTHLY')
    ),

    -- Foreign Keys
    CONSTRAINT "PayrollPeriod_approvedBy_fkey"
        FOREIGN KEY ("approvedBy") REFERENCES "User"(id) ON DELETE SET NULL
);

-- Indexes for PayrollPeriod
CREATE INDEX "idx_payroll_period_dates" ON "PayrollPeriod" ("periodStart", "periodEnd");
CREATE INDEX "idx_payroll_period_status" ON "PayrollPeriod" (status);
CREATE INDEX "idx_payroll_period_pay_date" ON "PayrollPeriod" ("payDate");

-- ================================================
-- 7. CrewDailyHours View (Crew Time Tracking)
-- ================================================
DROP VIEW IF EXISTS "CrewDailyHours" CASCADE;

CREATE VIEW "CrewDailyHours" AS
SELECT
    te."userId",
    u.name AS "userName",
    u.email AS "userEmail",
    u.role AS "userRole",
    DATE(te."startTime") AS "workDate",
    MIN(te."startTime") AS "firstClockIn",
    MAX(te."endTime") AS "lastClockOut",
    SUM(te.hours) AS "totalHours",
    SUM(
        CASE
            WHEN te."jobId" IS NOT NULL
            THEN te.hours
            ELSE 0
        END
    ) AS "productiveHours",
    SUM(
        CASE
            WHEN te."jobId" IS NULL
            THEN te.hours
            ELSE 0
        END
    ) AS "nonproductiveHours",
    COUNT(DISTINCT te."jobId") AS "jobsWorked",
    COUNT(*) AS "timeEntries",
    STRING_AGG(DISTINCT j."jobNumber", ', ' ORDER BY j."jobNumber") AS "jobNumbers"
FROM "TimeEntry" te
JOIN "User" u ON te."userId" = u.id
LEFT JOIN "Job" j ON te."jobId" = j.id
WHERE te."startTime" IS NOT NULL
GROUP BY te."userId", u.name, u.email, u.role, DATE(te."startTime");

-- ================================================
-- 8. Update Trigger Function for all new tables
-- ================================================
-- Reuse the existing function or create if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers to new tables
CREATE TRIGGER update_material_reservation_updated_at
    BEFORE UPDATE ON "MaterialReservation"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_movement_updated_at
    BEFORE UPDATE ON "StockMovement"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_reminder_updated_at
    BEFORE UPDATE ON "JobReminder"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_log_updated_at
    BEFORE UPDATE ON "NotificationLog"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_period_updated_at
    BEFORE UPDATE ON "PayrollPeriod"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- Verification Queries
-- ================================================
-- Run these to verify tables and views were created:
-- SELECT COUNT(*) FROM "MaterialReservation";
-- SELECT COUNT(*) FROM "StockMovement";
-- SELECT COUNT(*) FROM "MaterialAvailability";
-- SELECT COUNT(*) FROM "JobReminder";
-- SELECT COUNT(*) FROM "NotificationLog";
-- SELECT COUNT(*) FROM "PayrollPeriod";
-- SELECT COUNT(*) FROM "CrewDailyHours";