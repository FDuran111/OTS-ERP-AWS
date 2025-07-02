-- Supabase Production Schema Fixes
-- This migration is compatible with Supabase's existing schema

BEGIN;

-- 1. Add missing columns to TimeEntry table only if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'TimeEntry' AND column_name = 'regularRate') THEN
    ALTER TABLE "TimeEntry" ADD COLUMN "regularRate" DECIMAL(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'TimeEntry' AND column_name = 'overtimeRate') THEN
    ALTER TABLE "TimeEntry" ADD COLUMN "overtimeRate" DECIMAL(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'TimeEntry' AND column_name = 'totalCost') THEN
    ALTER TABLE "TimeEntry" ADD COLUMN "totalCost" DECIMAL(10,2);
  END IF;
END $$;

-- 2. Add indexes for performance (IF NOT EXISTS handles duplicates)
CREATE INDEX IF NOT EXISTS idx_time_entry_job_date ON "TimeEntry"("jobId", "startTime");
CREATE INDEX IF NOT EXISTS idx_time_entry_user_date ON "TimeEntry"("userId", "startTime");
CREATE INDEX IF NOT EXISTS idx_job_customer ON "Job"("customerId");
CREATE INDEX IF NOT EXISTS idx_job_status ON "Job"(status);
CREATE INDEX IF NOT EXISTS idx_material_usage_job ON "MaterialUsage"("jobId");
CREATE INDEX IF NOT EXISTS idx_schedule_job ON "JobSchedule"("jobId");

-- 3. Add audit columns if missing
DO $$ 
BEGIN
  -- Job table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'Job' AND column_name = 'createdBy') THEN
    ALTER TABLE "Job" ADD COLUMN "createdBy" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'Job' AND column_name = 'updatedBy') THEN
    ALTER TABLE "Job" ADD COLUMN "updatedBy" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'Job' AND column_name = 'deletedAt') THEN
    ALTER TABLE "Job" ADD COLUMN "deletedAt" TIMESTAMP;
  END IF;
  
  -- Customer table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'Customer' AND column_name = 'createdBy') THEN
    ALTER TABLE "Customer" ADD COLUMN "createdBy" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'Customer' AND column_name = 'updatedBy') THEN
    ALTER TABLE "Customer" ADD COLUMN "updatedBy" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'Customer' AND column_name = 'deletedAt') THEN
    ALTER TABLE "Customer" ADD COLUMN "deletedAt" TIMESTAMP;
  END IF;
END $$;

-- 4. Add constraints only if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_time_order') THEN
    ALTER TABLE "TimeEntry" 
    ADD CONSTRAINT check_time_order CHECK ("endTime" IS NULL OR "endTime" > "startTime");
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_hours_positive') THEN
    ALTER TABLE "TimeEntry" 
    ADD CONSTRAINT check_hours_positive CHECK (hours > 0);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_stock_positive') THEN
    ALTER TABLE "Material" 
    ADD CONSTRAINT check_stock_positive CHECK ("inStock" >= 0);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_cost_positive') THEN
    ALTER TABLE "Material" 
    ADD CONSTRAINT check_cost_positive CHECK (cost >= 0);
  END IF;
END $$;

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

-- Only create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON "AuditLog"("tableName", "recordId");
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON "AuditLog"("createdAt");

-- 6. Create session management table
CREATE TABLE IF NOT EXISTS "UserSession" (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(12), 'base64'),
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  "ipAddress" VARCHAR(45),
  "userAgent" TEXT,
  "lastActivity" TIMESTAMP DEFAULT NOW(),
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Only create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_session_token ON "UserSession"(token);
CREATE INDEX IF NOT EXISTS idx_user_session_user ON "UserSession"("userId");
CREATE INDEX IF NOT EXISTS idx_user_session_expires ON "UserSession"("expiresAt");

-- 7. Create function to calculate time entry costs (if not exists)
CREATE OR REPLACE FUNCTION calculate_time_entry_cost()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate if we have hours and a rate
  IF NEW.hours IS NOT NULL AND NEW."regularRate" IS NOT NULL THEN
    IF NEW.hours <= 8 THEN
      NEW."totalCost" := NEW.hours * NEW."regularRate";
    ELSE
      -- 8 hours regular + overtime
      NEW."totalCost" := (8 * NEW."regularRate") + 
                         ((NEW.hours - 8) * COALESCE(NEW."overtimeRate", NEW."regularRate" * 1.5));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'calculate_cost_on_time_entry') THEN
    CREATE TRIGGER calculate_cost_on_time_entry
    BEFORE INSERT OR UPDATE OF hours, "regularRate", "overtimeRate" ON "TimeEntry"
    FOR EACH ROW
    EXECUTE FUNCTION calculate_time_entry_cost();
  END IF;
END $$;

-- 8. Add RLS policies for new tables (Supabase specific)
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserSession" ENABLE ROW LEVEL SECURITY;

-- Audit log policies
CREATE POLICY "Users can view their own audit logs" ON "AuditLog"
  FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "System can insert audit logs" ON "AuditLog"
  FOR INSERT WITH CHECK (true);

-- Session policies  
CREATE POLICY "Users can view their own sessions" ON "UserSession"
  FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "Users can delete their own sessions" ON "UserSession"
  FOR DELETE USING (auth.uid()::text = "userId");

CREATE POLICY "System can manage sessions" ON "UserSession"
  FOR ALL USING (true);

COMMIT;