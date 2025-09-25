-- Simple view creation that maps exactly to what exists in the database
-- This handles the mismatch between API expectations and actual table structures

-- Drop existing views
DROP VIEW IF EXISTS "Customer" CASCADE;
DROP VIEW IF EXISTS "Job" CASCADE;

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

-- Grant permissions
GRANT ALL ON "Customer" TO otsapp;
GRANT ALL ON "Job" TO otsapp;
GRANT ALL ON customers TO otsapp;
GRANT ALL ON jobs TO otsapp;

-- Test
SELECT 'Views created' as status;
SELECT COUNT(*) as customers FROM "Customer";
SELECT COUNT(*) as jobs FROM "Job";