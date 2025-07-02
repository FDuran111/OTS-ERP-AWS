-- Production Schema Fixes
-- Run this migration to fix schema issues for production

BEGIN;

-- 1. Add missing columns to TimeEntry table
ALTER TABLE "TimeEntry" 
ADD COLUMN IF NOT EXISTS "regularRate" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "overtimeRate" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "totalCost" DECIMAL(10,2) GENERATED ALWAYS AS (
  CASE 
    WHEN hours <= 8 THEN hours * COALESCE("regularRate", 75.00)
    ELSE (8 * COALESCE("regularRate", 75.00)) + ((hours - 8) * COALESCE("overtimeRate", "regularRate" * 1.5, 112.50))
  END
) STORED;

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_entry_job_date ON "TimeEntry"("jobId", "startTime");
CREATE INDEX IF NOT EXISTS idx_time_entry_user_date ON "TimeEntry"("userId", "startTime");
CREATE INDEX IF NOT EXISTS idx_job_customer ON "Job"("customerId");
CREATE INDEX IF NOT EXISTS idx_job_status ON "Job"(status);
CREATE INDEX IF NOT EXISTS idx_material_usage_job ON "MaterialUsage"("jobId");
CREATE INDEX IF NOT EXISTS idx_schedule_job ON "JobSchedule"("jobId");

-- 3. Add audit columns if missing
ALTER TABLE "Job" 
ADD COLUMN IF NOT EXISTS "createdBy" TEXT,
ADD COLUMN IF NOT EXISTS "updatedBy" TEXT,
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP;

ALTER TABLE "Customer" 
ADD COLUMN IF NOT EXISTS "createdBy" TEXT,
ADD COLUMN IF NOT EXISTS "updatedBy" TEXT,
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP;

-- 4. Add constraints
ALTER TABLE "TimeEntry" 
ADD CONSTRAINT check_time_order CHECK ("endTime" IS NULL OR "endTime" > "startTime"),
ADD CONSTRAINT check_hours_positive CHECK (hours > 0);

ALTER TABLE "Material" 
ADD CONSTRAINT check_stock_positive CHECK ("inStock" >= 0),
ADD CONSTRAINT check_cost_positive CHECK (cost >= 0);

-- 5. Create audit log table
CREATE TABLE IF NOT EXISTS "AuditLog" (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(12), 'base64'),
  "tableName" VARCHAR(100) NOT NULL,
  "recordId" VARCHAR(100) NOT NULL,
  action VARCHAR(20) NOT NULL,
  "userId" TEXT,
  "oldData" JSONB,
  "newData" JSONB,
  "ipAddress" VARCHAR(45),
  "userAgent" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_log_table_record ON "AuditLog"("tableName", "recordId");
CREATE INDEX idx_audit_log_user ON "AuditLog"("userId");
CREATE INDEX idx_audit_log_created ON "AuditLog"("createdAt");

-- 6. Create session management table
CREATE TABLE IF NOT EXISTS "UserSession" (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(12), 'base64'),
  "userId" TEXT NOT NULL REFERENCES "User"(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  "ipAddress" VARCHAR(45),
  "userAgent" TEXT,
  "lastActivity" TIMESTAMP DEFAULT NOW(),
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_session_token ON "UserSession"(token);
CREATE INDEX idx_user_session_user ON "UserSession"("userId");
CREATE INDEX idx_user_session_expires ON "UserSession"("expiresAt");

COMMIT;