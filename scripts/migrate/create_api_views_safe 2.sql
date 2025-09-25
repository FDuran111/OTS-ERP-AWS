-- Safe creation of API compatibility views
-- Only creates views where they don't conflict with existing tables

-- First, check what exists
DO $$
DECLARE
    obj_type char(1);
BEGIN
    -- Handle Customer
    SELECT relkind INTO obj_type FROM pg_class WHERE relname = 'Customer';
    IF obj_type = 'v' THEN
        DROP VIEW "Customer" CASCADE;
    END IF;
    
    -- Handle Job
    SELECT relkind INTO obj_type FROM pg_class WHERE relname = 'Job';
    IF obj_type = 'v' THEN
        DROP VIEW "Job" CASCADE;
    END IF;
    
    -- Handle User
    SELECT relkind INTO obj_type FROM pg_class WHERE relname = 'User';
    IF obj_type = 'v' THEN
        DROP VIEW "User" CASCADE;
    END IF;
    
    -- Handle JobAssignment
    SELECT relkind INTO obj_type FROM pg_class WHERE relname = 'JobAssignment';
    IF obj_type = 'v' THEN
        DROP VIEW "JobAssignment" CASCADE;
    END IF;
END $$;

-- Create Customer view with CRUD support
CREATE OR REPLACE VIEW "Customer" AS
SELECT
  id,
  company_name as "companyName",
  '' as "firstName",
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

-- Create INSTEAD OF triggers for Customer
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
  ) RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS customer_view_insert_trigger ON "Customer";
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

DROP TRIGGER IF EXISTS customer_view_update_trigger ON "Customer";
CREATE TRIGGER customer_view_update_trigger
  INSTEAD OF UPDATE ON "Customer"
  FOR EACH ROW EXECUTE FUNCTION customer_view_update();

CREATE OR REPLACE FUNCTION customer_view_delete() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM customers WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS customer_view_delete_trigger ON "Customer";
CREATE TRIGGER customer_view_delete_trigger
  INSTEAD OF DELETE ON "Customer"
  FOR EACH ROW EXECUTE FUNCTION customer_view_delete();

-- Create Job view with CRUD support
CREATE OR REPLACE VIEW "Job" AS
SELECT
  id,
  customer_id as "customerId",
  COALESCE(title, '') as title,
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
  ) RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS job_view_insert_trigger ON "Job";
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

DROP TRIGGER IF EXISTS job_view_update_trigger ON "Job";
CREATE TRIGGER job_view_update_trigger
  INSTEAD OF UPDATE ON "Job"
  FOR EACH ROW EXECUTE FUNCTION job_view_update();

CREATE OR REPLACE FUNCTION job_view_delete() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM jobs WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS job_view_delete_trigger ON "Job";
CREATE TRIGGER job_view_delete_trigger
  INSTEAD OF DELETE ON "Job"
  FOR EACH ROW EXECUTE FUNCTION job_view_delete();

-- Only create these views if they don't exist as tables
DO $$
BEGIN
    -- User view (only if User table doesn't exist)
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'User' AND relkind = 'r') THEN
        EXECUTE 'CREATE VIEW "User" AS
        SELECT 
          ''system'' as id,
          ''System User'' as name,
          ''system@example.com'' as email,
          ''OWNER_ADMIN'' as role,
          CURRENT_TIMESTAMP as "createdAt",
          CURRENT_TIMESTAMP as "updatedAt"';
    END IF;
    
    -- JobAssignment view (only if JobAssignment table doesn't exist)
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'JobAssignment' AND relkind = 'r') THEN
        EXECUTE 'CREATE VIEW "JobAssignment" AS
        SELECT 
          ''1'' as id,
          ''1'' as "jobId",
          ''1'' as "userId",
          CURRENT_TIMESTAMP as "createdAt",
          CURRENT_TIMESTAMP as "updatedAt"
        WHERE false';
    END IF;
END $$;

-- Grant all necessary permissions
GRANT ALL ON "Customer" TO otsapp;
GRANT ALL ON "Job" TO otsapp;
GRANT ALL ON customers TO otsapp;
GRANT ALL ON jobs TO otsapp;

-- If these exist as views, grant permissions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'User' AND relkind = 'v') THEN
        EXECUTE 'GRANT SELECT ON "User" TO otsapp';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'JobAssignment' AND relkind = 'v') THEN
        EXECUTE 'GRANT SELECT ON "JobAssignment" TO otsapp';
    END IF;
END $$;

-- Test the views
SELECT 'API Views Status:' as info;
SELECT relname as name, 
       CASE relkind 
         WHEN 'r' THEN 'table' 
         WHEN 'v' THEN 'view' 
       END as type
FROM pg_class
WHERE relname IN ('Customer', 'Job', 'User', 'JobAssignment', 'customers', 'jobs')
ORDER BY relname;

-- Test data
SELECT COUNT(*) as customer_count FROM "Customer";
SELECT COUNT(*) as job_count FROM "Job";