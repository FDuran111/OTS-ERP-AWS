-- Fix column name mismatches between application and database
-- This aligns the database with the application's expectations

-- Add missing columns to Job table
ALTER TABLE "Job" 
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "customerId" UUID REFERENCES "Customer"(id),
  ADD COLUMN IF NOT EXISTS "billedAmount" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "billedDate" DATE;

-- Update existing data to use new column names if they exist with snake_case
UPDATE "Job" 
SET 
  "createdAt" = COALESCE("createdAt", created_at),
  "updatedAt" = COALESCE("updatedAt", updated_at),
  "customerId" = COALESCE("customerId", customer_id),
  "billedAmount" = COALESCE("billedAmount", billed_amount),
  "billedDate" = COALESCE("billedDate", billed_date)
WHERE "createdAt" IS NULL OR "updatedAt" IS NULL OR "customerId" IS NULL;

-- Add missing columns to Customer table
ALTER TABLE "Customer" 
  ADD COLUMN IF NOT EXISTS "firstName" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "lastName" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "companyName" VARCHAR(255);

-- Update existing data
UPDATE "Customer" 
SET 
  "firstName" = COALESCE("firstName", first_name),
  "lastName" = COALESCE("lastName", last_name),
  "companyName" = COALESCE("companyName", company_name)
WHERE "firstName" IS NULL OR "lastName" IS NULL;

-- Add missing columns to TimeEntry table
ALTER TABLE "TimeEntry"
  ADD COLUMN IF NOT EXISTS "date" DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS "hours" DECIMAL(10,2);

-- Update TimeEntry data
UPDATE "TimeEntry"
SET 
  "hours" = COALESCE("hours", hours_worked),
  "date" = COALESCE("date", DATE(start_time))
WHERE "hours" IS NULL;

-- Create JobPhase table if it doesn't exist
CREATE TABLE IF NOT EXISTS "JobPhase" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "jobId" UUID REFERENCES "Job"(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING',
  "startDate" DATE,
  "endDate" DATE,
  description TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create PurchaseOrder table if it doesn't exist
CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderNumber" VARCHAR(50) UNIQUE NOT NULL,
  "vendorId" UUID,
  status VARCHAR(50) DEFAULT 'DRAFT',
  "orderDate" DATE DEFAULT CURRENT_DATE,
  "expectedDate" DATE,
  subtotal DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  shipping DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_createdat ON "Job"("createdAt");
CREATE INDEX IF NOT EXISTS idx_job_updatedat ON "Job"("updatedAt");
CREATE INDEX IF NOT EXISTS idx_job_customerid ON "Job"("customerId");
CREATE INDEX IF NOT EXISTS idx_jobphase_jobid ON "JobPhase"("jobId");
CREATE INDEX IF NOT EXISTS idx_jobphase_status ON "JobPhase"(status);

-- Add some test phases for existing jobs
INSERT INTO "JobPhase" ("jobId", name, status)
SELECT 
  j.id,
  'Initial Assessment',
  CASE 
    WHEN j.status = 'COMPLETED' THEN 'COMPLETED'
    WHEN j.status = 'IN_PROGRESS' THEN 'IN_PROGRESS'
    ELSE 'PENDING'
  END
FROM "Job" j
WHERE NOT EXISTS (
  SELECT 1 FROM "JobPhase" jp WHERE jp."jobId" = j.id
)
LIMIT 3;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Column name fixes applied successfully!';
END $$;