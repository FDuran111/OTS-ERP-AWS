-- Create all necessary views for API compatibility
-- This creates views for all tables the API expects

-- Drop existing views if they exist
DROP VIEW IF EXISTS "Customer" CASCADE;
DROP VIEW IF EXISTS "Job" CASCADE;
DROP VIEW IF EXISTS "User" CASCADE;
DROP VIEW IF EXISTS "JobPhase" CASCADE;
DROP VIEW IF EXISTS "JobPhaseDetail" CASCADE;
DROP VIEW IF EXISTS "Material" CASCADE;
DROP VIEW IF EXISTS "MaterialStockLocation" CASCADE;
DROP VIEW IF EXISTS "PurchaseOrder" CASCADE;
DROP VIEW IF EXISTS "Invoice" CASCADE;
DROP VIEW IF EXISTS "TimeEntry" CASCADE;
DROP VIEW IF EXISTS "JobAssignment" CASCADE;
DROP VIEW IF EXISTS "Lead" CASCADE;
DROP VIEW IF EXISTS "StorageLocation" CASCADE;

-- Create Customer view
CREATE VIEW "Customer" AS
SELECT
  id,
  COALESCE(company_name, '') as "companyName",
  '' as "firstName",
  '' as "lastName",
  '' as "contactName",
  COALESCE(email, '') as email,
  COALESCE(phone, '') as phone,
  '' as address,
  '' as city,
  '' as state,
  '' as zip,
  '' as "zipCode",
  '' as notes,
  created_at as "createdAt",
  updated_at as "updatedAt"
FROM customers;

-- Create Job view
CREATE VIEW "Job" AS
SELECT
  id,
  customer_id as "customerId",
  '' as title,
  COALESCE(description, '') as description,
  COALESCE(status, 'PENDING') as status,
  COALESCE(notes, '') as notes,
  created_at as "scheduledDate",
  created_at as "createdAt",
  updated_at as "updatedAt",
  NULL::timestamp as "completedDate",
  NULL::timestamp as "billedDate",
  0::decimal as "billedAmount",
  '' as "jobNumber",
  'RESIDENTIAL' as type,
  0::decimal as "estimatedHours",
  0::decimal as "actualHours"
FROM jobs;

-- Create User view (stub for now)
CREATE VIEW "User" AS
SELECT 
  'system' as id,
  'System User' as name,
  'system@example.com' as email,
  'OWNER_ADMIN' as role,
  CURRENT_TIMESTAMP as "createdAt",
  CURRENT_TIMESTAMP as "updatedAt"
UNION ALL
SELECT 
  'admin' as id,
  'Admin User' as name,
  'admin@example.com' as email,
  'OWNER_ADMIN' as role,
  CURRENT_TIMESTAMP as "createdAt",
  CURRENT_TIMESTAMP as "updatedAt";

-- Create JobPhase view (stub - for dashboard phases)
CREATE VIEW "JobPhase" AS
SELECT 
  gen_random_uuid() as id,
  j.id as "jobId",
  'UG' as phase,
  'PENDING' as status,
  CURRENT_TIMESTAMP as "createdAt",
  CURRENT_TIMESTAMP as "updatedAt"
FROM jobs j
UNION ALL
SELECT 
  gen_random_uuid() as id,
  j.id as "jobId",
  'RI' as phase,
  'PENDING' as status,
  CURRENT_TIMESTAMP as "createdAt",
  CURRENT_TIMESTAMP as "updatedAt"
FROM jobs j
UNION ALL
SELECT 
  gen_random_uuid() as id,
  j.id as "jobId",
  'FN' as phase,
  'PENDING' as status,
  CURRENT_TIMESTAMP as "createdAt",
  CURRENT_TIMESTAMP as "updatedAt"
FROM jobs j;

-- Create JobPhaseDetail view
CREATE VIEW "JobPhaseDetail" AS
SELECT 
  id,
  "jobId",
  phase,
  status,
  "createdAt",
  "updatedAt"
FROM "JobPhase";

-- Create Material view if it doesn't exist as a table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Material' AND relkind = 'r') THEN
    EXECUTE 'CREATE VIEW "Material" AS
    SELECT
      id,
      code,
      name,
      description,
      unit,
      category,
      manufacturer,
      cost,
      in_stock as "inStock",
      min_stock as "minStock",
      active,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM materials';
  END IF;
END $$;

-- Create MaterialStockLocation view (stub for low stock checks)
CREATE VIEW "MaterialStockLocation" AS
SELECT
  m.id as "materialId",
  COALESCE(sl.id, 'main') as "locationId",
  m.in_stock as quantity,
  CURRENT_TIMESTAMP as "createdAt",
  CURRENT_TIMESTAMP as "updatedAt"
FROM materials m
LEFT JOIN storage_locations sl ON sl.id = 'main';

-- Create PurchaseOrder view (stub)
CREATE VIEW "PurchaseOrder" AS
SELECT 
  'po-1' as id,
  'PO-001' as "orderNumber",
  'PENDING' as status,
  0::decimal as total,
  CURRENT_TIMESTAMP as "createdAt",
  CURRENT_TIMESTAMP as "updatedAt"
WHERE false;

-- Create Invoice view if it doesn't exist as a table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Invoice' AND relkind = 'r') THEN
    EXECUTE 'CREATE VIEW "Invoice" AS
    SELECT
      id,
      customer_id as "customerId",
      job_id as "jobId",
      invoice_number as "invoiceNumber",
      status,
      total,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM invoices';
  END IF;
END $$;

-- Create TimeEntry view if it doesn't exist as a table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'TimeEntry' AND relkind = 'r') THEN
    EXECUTE 'CREATE VIEW "TimeEntry" AS
    SELECT
      id,
      job_id as "jobId",
      user_id as "userId",
      hours,
      date,
      notes,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM time_entries';
  END IF;
END $$;

-- Create JobAssignment view (stub)
CREATE VIEW "JobAssignment" AS
SELECT 
  'ja-1' as id,
  j.id as "jobId",
  'system' as "userId",
  CURRENT_TIMESTAMP as "createdAt",
  CURRENT_TIMESTAMP as "updatedAt"
FROM jobs j
LIMIT 0;

-- Create Lead view if it doesn't exist as a table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Lead' AND relkind = 'r') THEN
    EXECUTE 'CREATE VIEW "Lead" AS
    SELECT
      id,
      '''' as "firstName",
      '''' as "lastName",
      company_name as "companyName",
      email,
      phone,
      status,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM leads';
  END IF;
END $$;

-- Create StorageLocation view if it doesn't exist as a table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'StorageLocation' AND relkind = 'r') THEN
    EXECUTE 'CREATE VIEW "StorageLocation" AS
    SELECT
      id,
      name,
      description,
      address,
      active,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM storage_locations';
  END IF;
END $$;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO otsapp;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO otsapp;

-- Test
SELECT 'Views created successfully' as status;
SELECT COUNT(*) as customers FROM "Customer";
SELECT COUNT(*) as jobs FROM "Job";
SELECT COUNT(*) as users FROM "User";
SELECT COUNT(*) as phases FROM "JobPhase" LIMIT 10;