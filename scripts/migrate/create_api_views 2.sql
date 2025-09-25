-- Create comprehensive views to map snake_case tables to PascalCase for API compatibility
-- This allows the API to work without changing all the code

-- Drop existing views/tables if they exist (handle both cases)
DO $$
BEGIN
    -- Drop views if they exist
    DROP VIEW IF EXISTS "Customer" CASCADE;
    DROP VIEW IF EXISTS "Job" CASCADE;
    DROP VIEW IF EXISTS "User" CASCADE;
    DROP VIEW IF EXISTS "JobAssignment" CASCADE;
    
    -- Check if these are tables and drop the view if it exists
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'TimeEntry' AND relkind = 'r') THEN
        -- It's a table, don't drop it
        NULL;
    ELSE
        DROP VIEW IF EXISTS "TimeEntry" CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Material' AND relkind = 'r') THEN
        -- It's a table, don't drop it
        NULL;
    ELSE
        DROP VIEW IF EXISTS "Material" CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Invoice' AND relkind = 'r') THEN
        -- It's a table, don't drop it
        NULL;
    ELSE
        DROP VIEW IF EXISTS "Invoice" CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Lead' AND relkind = 'r') THEN
        -- It's a table, don't drop it
        NULL;
    ELSE
        DROP VIEW IF EXISTS "Lead" CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'StorageLocation' AND relkind = 'r') THEN
        -- It's a table, don't drop it
        NULL;
    ELSE
        DROP VIEW IF EXISTS "StorageLocation" CASCADE;
    END IF;
END $$;

-- Create Customer view with INSERT/UPDATE/DELETE support
CREATE VIEW "Customer" AS
SELECT
  id,
  company_name as "companyName",
  '' as "firstName",  -- These fields don't exist in our customers table
  '' as "lastName",
  '' as "contactName",
  email,
  phone,
  '' as address,
  '' as city,
  '' as state,
  '' as zip,
  '' as "zipCode",
  '' as notes,
  created_at as "createdAt",
  updated_at as "updatedAt"
FROM customers;

-- Create INSTEAD OF triggers to handle INSERT/UPDATE/DELETE operations on the view
CREATE OR REPLACE FUNCTION customer_view_insert() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO customers (
    id, company_name, email, phone, created_at, updated_at
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW."companyName",
    NEW.email,
    NEW.phone,
    COALESCE(NEW."createdAt", CURRENT_TIMESTAMP),
    COALESCE(NEW."updatedAt", CURRENT_TIMESTAMP)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customer_view_insert_trigger
  INSTEAD OF INSERT ON "Customer"
  FOR EACH ROW EXECUTE FUNCTION customer_view_insert();

CREATE OR REPLACE FUNCTION customer_view_update() RETURNS TRIGGER AS $$
BEGIN
  UPDATE customers SET
    company_name = NEW."companyName",
    email = NEW.email,
    phone = NEW.phone,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customer_view_update_trigger
  INSTEAD OF UPDATE ON "Customer"
  FOR EACH ROW EXECUTE FUNCTION customer_view_update();

CREATE OR REPLACE FUNCTION customer_view_delete() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM customers WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customer_view_delete_trigger
  INSTEAD OF DELETE ON "Customer"
  FOR EACH ROW EXECUTE FUNCTION customer_view_delete();

-- Create Job view with INSERT/UPDATE/DELETE support
CREATE VIEW "Job" AS
SELECT
  id,
  customer_id as "customerId",
  title,
  description,
  status,
  notes,
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

CREATE OR REPLACE FUNCTION job_view_insert() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO jobs (
    id, customer_id, title, description, status, notes, created_at, updated_at
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW."customerId",
    COALESCE(NEW.title, ''),
    COALESCE(NEW.description, ''),
    COALESCE(NEW.status, 'PENDING'),
    NEW.notes,
    COALESCE(NEW."createdAt", CURRENT_TIMESTAMP),
    COALESCE(NEW."updatedAt", CURRENT_TIMESTAMP)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER job_view_insert_trigger
  INSTEAD OF INSERT ON "Job"
  FOR EACH ROW EXECUTE FUNCTION job_view_insert();

CREATE OR REPLACE FUNCTION job_view_update() RETURNS TRIGGER AS $$
BEGIN
  UPDATE jobs SET
    customer_id = NEW."customerId",
    title = NEW.title,
    description = NEW.description,
    status = NEW.status,
    notes = NEW.notes,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER job_view_update_trigger
  INSTEAD OF UPDATE ON "Job"
  FOR EACH ROW EXECUTE FUNCTION job_view_update();

CREATE OR REPLACE FUNCTION job_view_delete() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM jobs WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER job_view_delete_trigger
  INSTEAD OF DELETE ON "Job"
  FOR EACH ROW EXECUTE FUNCTION job_view_delete();

-- Only create views if the PascalCase table doesn't already exist
DO $$
BEGIN
    -- TimeEntry view (only if TimeEntry table doesn't exist)
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
    
    -- Material view (only if Material table doesn't exist)
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
    
    -- Invoice view (only if Invoice table doesn't exist)
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

-- Create User stub view (for JOIN operations)
CREATE VIEW "User" AS
SELECT 
  'system' as id,
  'System User' as name,
  'system@example.com' as email,
  'OWNER_ADMIN' as role,
  CURRENT_TIMESTAMP as "createdAt",
  CURRENT_TIMESTAMP as "updatedAt";

-- Create JobAssignment stub view (for JOIN operations)
CREATE VIEW "JobAssignment" AS
SELECT 
  '1' as id,
  '1' as "jobId",
  '1' as "userId",
  CURRENT_TIMESTAMP as "createdAt",
  CURRENT_TIMESTAMP as "updatedAt"
WHERE false;  -- Empty view that returns no rows

-- Lead and StorageLocation views
DO $$
BEGIN
    -- Lead view (only if Lead table doesn't exist)
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
    
    -- StorageLocation view (only if StorageLocation table doesn't exist)
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
GRANT ALL ON "Customer" TO otsapp;
GRANT ALL ON "Job" TO otsapp;
GRANT SELECT ON "TimeEntry" TO otsapp;
GRANT SELECT ON "Material" TO otsapp;
GRANT SELECT ON "Invoice" TO otsapp;
GRANT SELECT ON "User" TO otsapp;
GRANT SELECT ON "JobAssignment" TO otsapp;
GRANT SELECT ON "Lead" TO otsapp;
GRANT SELECT ON "StorageLocation" TO otsapp;

-- Grant permissions on the underlying tables too
GRANT ALL ON customers TO otsapp;
GRANT ALL ON jobs TO otsapp;
GRANT ALL ON time_entries TO otsapp;
GRANT ALL ON materials TO otsapp;
GRANT ALL ON invoices TO otsapp;
GRANT ALL ON leads TO otsapp;
GRANT ALL ON storage_locations TO otsapp;

-- Test the views
SELECT 'Views created successfully' as status;
SELECT COUNT(*) as customer_count FROM "Customer";
SELECT COUNT(*) as job_count FROM "Job";