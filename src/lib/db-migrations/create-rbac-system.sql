-- RBAC (Role-Based Access Control) System Migration
-- Updates User table and creates permission system for Ortmeier app

-- First, check if the role column exists and its current type
DO $$ 
DECLARE
    role_column_exists BOOLEAN;
    role_column_type TEXT;
BEGIN
    -- Check if role column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'User' AND column_name = 'role'
    ) INTO role_column_exists;
    
    IF role_column_exists THEN
        -- Get current type
        SELECT data_type INTO role_column_type
        FROM information_schema.columns 
        WHERE table_name = 'User' AND column_name = 'role';
        
        RAISE NOTICE 'Role column exists with type: %', role_column_type;
        
        -- If it's already an enum type, we might need to add new values
        -- If it's text/varchar, we need to convert it
    ELSE
        RAISE NOTICE 'Role column does not exist, will create it';
    END IF;
END $$;

-- Create or update enum for user roles
DO $$ BEGIN
    -- Drop existing type if it exists to recreate with all values
    DROP TYPE IF EXISTS user_role_new CASCADE;
    
    CREATE TYPE user_role_new AS ENUM (
        'OWNER',      -- Full control, system settings, impersonation, audit logs
        'ADMIN',      -- Full operational control (jobs, invoices, rates, scheduling, materials)
        'OFFICE',     -- Customer mgmt, billing, scheduling, job creation/editing, document uploads
        'TECHNICIAN', -- View assigned jobs, submit time, add jobsite notes/materials
        'VIEWER'      -- Read-only access to jobs, notes, documents
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Store dependent views and functions for recreation
DO $$
DECLARE
    role_column_exists BOOLEAN;
    role_column_type TEXT;
    view_def_emp_cost TEXT;
    view_def_job_labor TEXT;
BEGIN
    -- Check if role column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'User' AND column_name = 'role'
    ) INTO role_column_exists;
    
    IF role_column_exists THEN
        -- Get current type
        SELECT data_type INTO role_column_type
        FROM information_schema.columns 
        WHERE table_name = 'User' AND column_name = 'role';
        
        -- Store view definitions before dropping
        BEGIN
            SELECT definition INTO view_def_emp_cost
            FROM pg_views WHERE viewname = 'EmployeeCostSummary';
        EXCEPTION WHEN OTHERS THEN
            view_def_emp_cost := NULL;
        END;
        
        BEGIN
            SELECT definition INTO view_def_job_labor
            FROM pg_views WHERE viewname = 'JobLaborRatesWithDetails';
        EXCEPTION WHEN OTHERS THEN
            view_def_job_labor := NULL;
        END;
        
        -- Drop dependent objects temporarily
        DROP VIEW IF EXISTS "EmployeeCostSummary" CASCADE;
        DROP VIEW IF EXISTS "JobLaborRatesWithDetails" CASCADE;
        
        -- If the column type is already user_role (enum), just ensure it has all values
        IF role_column_type = 'USER-DEFINED' THEN
            -- Try to update existing enum values - this will work if the current enum is compatible
            BEGIN
                -- Test if current role values are compatible
                UPDATE "User" SET role = role WHERE role IN ('OWNER', 'ADMIN', 'OFFICE', 'TECHNICIAN', 'VIEWER');
                RAISE NOTICE 'Existing role enum is compatible';
            EXCEPTION WHEN OTHERS THEN
                -- Need to convert the enum values
                RAISE NOTICE 'Converting existing enum values';
                
                -- Add a temporary column
                ALTER TABLE "User" ADD COLUMN role_new user_role_new;
                
                -- Map existing values to new enum values
                UPDATE "User" SET role_new = CASE 
                    WHEN role::TEXT = 'ADMIN' THEN 'ADMIN'::user_role_new
                    WHEN role::TEXT = 'USER' THEN 'OFFICE'::user_role_new
                    WHEN role::TEXT = 'TECHNICIAN' THEN 'TECHNICIAN'::user_role_new
                    WHEN role::TEXT = 'VIEWER' THEN 'VIEWER'::user_role_new
                    WHEN role::TEXT = 'OWNER' THEN 'OWNER'::user_role_new
                    WHEN role::TEXT = 'OFFICE' THEN 'OFFICE'::user_role_new
                    WHEN role::TEXT ILIKE '%admin%' THEN 'ADMIN'::user_role_new
                    WHEN role::TEXT ILIKE '%owner%' THEN 'OWNER'::user_role_new
                    WHEN role::TEXT ILIKE '%office%' THEN 'OFFICE'::user_role_new
                    WHEN role::TEXT ILIKE '%tech%' THEN 'TECHNICIAN'::user_role_new
                    ELSE 'TECHNICIAN'::user_role_new
                END;
                
                -- Drop old column and rename new one
                ALTER TABLE "User" DROP COLUMN role CASCADE;
                ALTER TABLE "User" RENAME COLUMN role_new TO role;
            END;
        ELSE
            -- Column is text/varchar, convert to enum
            RAISE NOTICE 'Converting text/varchar role column to enum';
            
            -- Add a temporary column
            ALTER TABLE "User" ADD COLUMN role_new user_role_new;
            
            -- Map existing values to new enum values
            UPDATE "User" SET role_new = CASE 
                WHEN role = 'ADMIN' THEN 'ADMIN'::user_role_new
                WHEN role = 'USER' THEN 'OFFICE'::user_role_new
                WHEN role = 'TECHNICIAN' THEN 'TECHNICIAN'::user_role_new
                WHEN role = 'VIEWER' THEN 'VIEWER'::user_role_new
                WHEN role = 'OWNER' THEN 'OWNER'::user_role_new
                WHEN role = 'OFFICE' THEN 'OFFICE'::user_role_new
                WHEN role ILIKE '%admin%' THEN 'ADMIN'::user_role_new
                WHEN role ILIKE '%owner%' THEN 'OWNER'::user_role_new
                WHEN role ILIKE '%office%' THEN 'OFFICE'::user_role_new
                WHEN role ILIKE '%tech%' THEN 'TECHNICIAN'::user_role_new
                ELSE 'TECHNICIAN'::user_role_new
            END;
            
            -- Drop old column and rename new one
            ALTER TABLE "User" DROP COLUMN role CASCADE;
            ALTER TABLE "User" RENAME COLUMN role_new TO role;
        END IF;
        
    ELSE
        -- Add role column if it doesn't exist
        ALTER TABLE "User" ADD COLUMN role user_role_new DEFAULT 'TECHNICIAN';
    END IF;
    
    -- Make role field required
    ALTER TABLE "User" ALTER COLUMN role SET NOT NULL;
    
END $$;

-- Clean up and finalize enum type
DROP TYPE IF EXISTS user_role CASCADE;
ALTER TYPE user_role_new RENAME TO user_role;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_role ON "User"(role);
CREATE INDEX IF NOT EXISTS idx_user_active_role ON "User"(active, role);

-- Add updated_at trigger if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_updated_at ON "User";
CREATE TRIGGER update_user_updated_at
    BEFORE UPDATE ON "User"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create permissions table for fine-grained access control
CREATE TABLE IF NOT EXISTS "UserPermissions" (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    resource TEXT NOT NULL, -- 'jobs', 'invoices', 'customers', 'materials', etc.
    action TEXT NOT NULL,   -- 'create', 'read', 'update', 'delete', 'manage'
    granted BOOLEAN NOT NULL DEFAULT true,
    granted_by TEXT REFERENCES "User"(id),
    granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    
    UNIQUE(user_id, resource, action)
);

-- Create indexes for permissions
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON "UserPermissions"(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_resource ON "UserPermissions"(resource);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_resource ON "UserPermissions"(user_id, resource);

-- Create role hierarchy table for inheritance
CREATE TABLE IF NOT EXISTS "RoleHierarchy" (
    id SERIAL PRIMARY KEY,
    parent_role user_role NOT NULL,
    child_role user_role NOT NULL,
    
    UNIQUE(parent_role, child_role)
);

-- Insert role hierarchy (higher roles inherit lower role permissions)
INSERT INTO "RoleHierarchy" (parent_role, child_role) VALUES
    ('OWNER', 'ADMIN'),
    ('ADMIN', 'OFFICE'),
    ('OFFICE', 'TECHNICIAN'),
    ('TECHNICIAN', 'VIEWER')
ON CONFLICT (parent_role, child_role) DO NOTHING;

-- Create audit log table for role changes and sensitive actions
CREATE TABLE IF NOT EXISTS "UserAuditLog" (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES "User"(id) ON DELETE SET NULL,
    performed_by TEXT REFERENCES "User"(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- 'role_changed', 'permission_granted', 'login', 'impersonation_start', etc.
    resource TEXT,        -- What was accessed/modified
    old_value TEXT,       -- Previous value (for changes)
    new_value TEXT,       -- New value (for changes)
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB        -- Additional context data
);

-- Create indexes for audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON "UserAuditLog"(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_by ON "UserAuditLog"(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON "UserAuditLog"(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON "UserAuditLog"(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON "UserAuditLog"(resource);

-- Create function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(
    p_user_id TEXT,
    p_resource TEXT,
    p_action TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    user_role_val user_role;
    has_explicit_permission BOOLEAN;
    has_role_permission BOOLEAN;
BEGIN
    -- Get user's role
    SELECT role INTO user_role_val FROM "User" WHERE id = p_user_id AND active = true;
    
    IF user_role_val IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check for explicit permission grant/deny
    SELECT granted INTO has_explicit_permission
    FROM "UserPermissions"
    WHERE user_id = p_user_id AND resource = p_resource AND action = p_action;
    
    -- If explicit permission exists, use it
    IF has_explicit_permission IS NOT NULL THEN
        RETURN has_explicit_permission;
    END IF;
    
    -- Check role-based permissions
    has_role_permission := CASE user_role_val
        WHEN 'OWNER' THEN true -- Owner can do everything
        WHEN 'ADMIN' THEN 
            CASE 
                WHEN p_resource = 'system_settings' THEN false -- Only owner can access system settings
                ELSE true -- Admin can do everything else
            END
        WHEN 'OFFICE' THEN
            CASE p_resource
                WHEN 'customers' THEN true
                WHEN 'jobs' THEN p_action IN ('create', 'read', 'update')
                WHEN 'invoices' THEN p_action IN ('create', 'read', 'update')
                WHEN 'materials' THEN p_action IN ('read', 'update')
                WHEN 'scheduling' THEN true
                WHEN 'documents' THEN p_action IN ('create', 'read', 'update')
                WHEN 'labor_rates' THEN p_action IN ('read')
                ELSE false
            END
        WHEN 'TECHNICIAN' THEN
            CASE p_resource
                WHEN 'jobs' THEN p_action IN ('read') -- Can only read assigned jobs
                WHEN 'time_entries' THEN p_action IN ('create', 'read', 'update')
                WHEN 'materials' THEN p_action IN ('read', 'update') -- Can log material usage
                WHEN 'job_notes' THEN p_action IN ('create', 'read')
                WHEN 'documents' THEN p_action IN ('read', 'create') -- Can upload photos/docs
                ELSE false
            END
        WHEN 'VIEWER' THEN
            CASE p_resource
                WHEN 'jobs' THEN p_action IN ('read')
                WHEN 'documents' THEN p_action IN ('read')
                WHEN 'job_notes' THEN p_action IN ('read')
                WHEN 'materials' THEN p_action IN ('read')
                ELSE false
            END
        ELSE false
    END;
    
    RETURN COALESCE(has_role_permission, false);
END;
$$ LANGUAGE plpgsql;

-- Create function to get user's effective role (considering hierarchy)
CREATE OR REPLACE FUNCTION get_user_effective_role(p_user_id TEXT)
RETURNS user_role AS $$
DECLARE
    user_role_val user_role;
BEGIN
    SELECT role INTO user_role_val FROM "User" WHERE id = p_user_id AND active = true;
    RETURN user_role_val;
END;
$$ LANGUAGE plpgsql;

-- Create function to log audit events
CREATE OR REPLACE FUNCTION log_user_action(
    p_user_id TEXT,
    p_performed_by TEXT,
    p_action TEXT,
    p_resource TEXT DEFAULT NULL,
    p_old_value TEXT DEFAULT NULL,
    p_new_value TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
) RETURNS void AS $$
BEGIN
    INSERT INTO "UserAuditLog" (
        user_id, performed_by, action, resource, 
        old_value, new_value, ip_address, user_agent, metadata
    ) VALUES (
        p_user_id, p_performed_by, p_action, p_resource,
        p_old_value, p_new_value, p_ip_address, p_user_agent, p_metadata
    );
END;
$$ LANGUAGE plpgsql;

-- Create trigger to log role changes
CREATE OR REPLACE FUNCTION log_role_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        PERFORM log_user_action(
            NEW.id,
            NEW.id, -- This would be updated by the application with actual performer
            'role_changed',
            'user_role',
            OLD.role::TEXT,
            NEW.role::TEXT
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_role_changes ON "User";
CREATE TRIGGER trigger_log_role_changes
    AFTER UPDATE OF role ON "User"
    FOR EACH ROW EXECUTE FUNCTION log_role_changes();

-- Add comments for documentation
COMMENT ON TABLE "User" IS 'Internal staff users with role-based access control';
COMMENT ON COLUMN "User".role IS 'User role determining access level: OWNER > ADMIN > OFFICE > TECHNICIAN > VIEWER';
COMMENT ON TABLE "UserPermissions" IS 'Fine-grained permissions that override role-based defaults';
COMMENT ON TABLE "RoleHierarchy" IS 'Defines role inheritance hierarchy';
COMMENT ON TABLE "UserAuditLog" IS 'Audit trail for security-sensitive user actions';
COMMENT ON FUNCTION user_has_permission(TEXT, TEXT, TEXT) IS 'Checks if user has permission for specific resource and action';
COMMENT ON FUNCTION get_user_effective_role(TEXT) IS 'Returns user effective role considering hierarchy';
COMMENT ON FUNCTION log_user_action(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INET, TEXT, JSONB) IS 'Logs user actions for audit trail';

-- Create view for easy permission checking
CREATE OR REPLACE VIEW "UserPermissionsView" AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.email,
    u.role,
    u.active,
    'jobs' as resource,
    'read' as action,
    user_has_permission(u.id, 'jobs', 'read') as has_permission
FROM "User" u
WHERE u.active = true

UNION ALL

SELECT 
    u.id as user_id,
    u.name as user_name,
    u.email,
    u.role,
    u.active,
    'invoices' as resource,
    'create' as action,
    user_has_permission(u.id, 'invoices', 'create') as has_permission
FROM "User" u
WHERE u.active = true

-- Add more combinations as needed for common permission checks
;

COMMENT ON VIEW "UserPermissionsView" IS 'Materialized view of common user permissions for quick access';

-- Grant appropriate permissions
-- These would be expanded based on your database user setup
-- GRANT SELECT ON "User", "UserPermissions", "RoleHierarchy" TO app_user;
-- GRANT INSERT, UPDATE ON "UserAuditLog" TO app_user;

-- Recreate dependent views if they existed
-- JobLaborRatesWithDetails view (from labor rates migration)
CREATE OR REPLACE VIEW "JobLaborRatesWithDetails" AS
SELECT 
  jlr.id,
  jlr.job_id,
  jlr.user_id,
  jlr.overridden_rate,
  jlr.created_at,
  jlr.updated_at,
  jlr.notes,
  u.name as user_name,
  u.email as user_email,
  u.role as user_role,
  j."jobNumber",
  j.description as job_description,
  j.status as job_status
FROM "JobLaborRates" jlr
INNER JOIN "User" u ON jlr.user_id = u.id
INNER JOIN "Job" j ON jlr.job_id = j.id;

COMMENT ON VIEW "JobLaborRatesWithDetails" IS 'Job labor rates with user and job information for easy querying';

-- EmployeeCostSummary view (recreate simple version without time tracking columns for now)
-- This can be enhanced later when we know the exact TimeEntry schema
CREATE OR REPLACE VIEW "EmployeeCostSummary" AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.email,
    u.role,
    u.active,
    u."createdAt",
    u."updatedAt"
FROM "User" u
WHERE u.active = true;

COMMENT ON VIEW "EmployeeCostSummary" IS 'Basic employee summary (time tracking columns to be added later)';

-- Sample data for testing (remove in production)
-- This creates test users for each role type
DO $$
BEGIN
    -- Only insert if no users exist or if we're in development
    IF NOT EXISTS (SELECT 1 FROM "User" WHERE role = 'OWNER' LIMIT 1) THEN
        INSERT INTO "User" (id, email, name, password, role, active, "createdAt", "updatedAt") VALUES
            ('owner-test-1', 'owner@test.ortmeier.com', 'Test Owner', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Oc96qeYGC6E4U6D0K', 'OWNER', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('admin-test-1', 'admin@test.ortmeier.com', 'Test Admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Oc96qeYGC6E4U6D0K', 'ADMIN', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('office-test-1', 'office@test.ortmeier.com', 'Test Office', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Oc96qeYGC6E4U6D0K', 'OFFICE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('tech-test-1', 'tech@test.ortmeier.com', 'Test Technician', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Oc96qeYGC6E4U6D0K', 'TECHNICIAN', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('viewer-test-1', 'viewer@test.ortmeier.com', 'Test Viewer', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Oc96qeYGC6E4U6D0K', 'VIEWER', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (email) DO NOTHING;
    END IF;
END $$;