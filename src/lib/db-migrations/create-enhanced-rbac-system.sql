-- Enhanced RBAC (Role-Based Access Control) System Migration
-- Database-driven permissions with audit trails and permission templates
-- For Ortmeier Technical Service Job Management Platform

-- ============================================================================
-- STEP 1: Create Permission System Tables
-- ============================================================================

-- Permission table: All available permissions in the system
CREATE TABLE IF NOT EXISTS "Permission" (
    id TEXT PRIMARY KEY,  -- e.g., 'jobs.manage', 'accounting.gl_view'
    name TEXT NOT NULL,   -- Human-readable name
    description TEXT,
    category TEXT,        -- Group permissions (e.g., 'Jobs', 'Accounting', 'Materials')
    "isSystem" BOOLEAN NOT NULL DEFAULT false,  -- System permissions can't be deleted
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Role table: Custom roles with descriptions
CREATE TABLE IF NOT EXISTS "Role" (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,  -- System roles (OWNER_ADMIN, FOREMAN, EMPLOYEE) can't be deleted
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    level INTEGER NOT NULL DEFAULT 50,  -- Hierarchy level (100=OWNER_ADMIN, 60=FOREMAN, 40=EMPLOYEE)
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT REFERENCES "User"(id) ON DELETE SET NULL
);

-- RolePermission: Links roles to permissions
CREATE TABLE IF NOT EXISTS "RolePermission" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "roleId" TEXT NOT NULL REFERENCES "Role"(id) ON DELETE CASCADE,
    "permissionId" TEXT NOT NULL REFERENCES "Permission"(id) ON DELETE CASCADE,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedBy" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
    
    UNIQUE("roleId", "permissionId")
);

-- UserPermission: Override permissions for specific users
CREATE TABLE IF NOT EXISTS "UserPermission" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    "permissionId" TEXT NOT NULL REFERENCES "Permission"(id) ON DELETE CASCADE,
    granted BOOLEAN NOT NULL DEFAULT true,  -- true = grant, false = revoke
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedBy" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
    "expiresAt" TIMESTAMP(3),  -- Optional expiration for temporary permissions
    notes TEXT,
    
    UNIQUE("userId", "permissionId")
);

-- PermissionGroup: Templates for bulk permission assignment
CREATE TABLE IF NOT EXISTS "PermissionGroup" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT REFERENCES "User"(id) ON DELETE SET NULL
);

-- PermissionGroupMember: Permissions in a group
CREATE TABLE IF NOT EXISTS "PermissionGroupMember" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "groupId" TEXT NOT NULL REFERENCES "PermissionGroup"(id) ON DELETE CASCADE,
    "permissionId" TEXT NOT NULL REFERENCES "Permission"(id) ON DELETE CASCADE,
    
    UNIQUE("groupId", "permissionId")
);

-- ============================================================================
-- STEP 2: Create Audit Log System
-- ============================================================================

-- AuditLog: Track all system changes and sensitive operations
CREATE TABLE IF NOT EXISTS "AuditLog" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT REFERENCES "User"(id) ON DELETE SET NULL,  -- Who was affected
    "performedBy" TEXT REFERENCES "User"(id) ON DELETE SET NULL,  -- Who did it
    action TEXT NOT NULL,  -- 'role_changed', 'permission_granted', 'login', 'gl_entry_posted', etc.
    resource TEXT,  -- What was affected (table name or resource type)
    "resourceId" TEXT,  -- Specific record ID
    "oldValue" TEXT,
    "newValue" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    timestamp TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,  -- Additional context
    severity TEXT DEFAULT 'INFO'  -- INFO, WARNING, CRITICAL
);

-- ============================================================================
-- STEP 3: Create Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS "idx_role_permission_role" ON "RolePermission"("roleId");
CREATE INDEX IF NOT EXISTS "idx_role_permission_permission" ON "RolePermission"("permissionId");
CREATE INDEX IF NOT EXISTS "idx_user_permission_user" ON "UserPermission"("userId");
CREATE INDEX IF NOT EXISTS "idx_user_permission_permission" ON "UserPermission"("permissionId");
CREATE INDEX IF NOT EXISTS "idx_permission_group_member_group" ON "PermissionGroupMember"("groupId");
CREATE INDEX IF NOT EXISTS "idx_audit_log_user" ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "idx_audit_log_performed_by" ON "AuditLog"("performedBy");
CREATE INDEX IF NOT EXISTS "idx_audit_log_action" ON "AuditLog"(action);
CREATE INDEX IF NOT EXISTS "idx_audit_log_timestamp" ON "AuditLog"(timestamp);
CREATE INDEX IF NOT EXISTS "idx_audit_log_resource" ON "AuditLog"(resource, "resourceId");

-- ============================================================================
-- STEP 4: Seed System Roles (OWNER_ADMIN, FOREMAN, EMPLOYEE)
-- ============================================================================

INSERT INTO "Role" (id, name, description, "isSystem", level) VALUES
    ('OWNER_ADMIN', 'Owner/Admin', 'Complete control of the entire system - all features and settings', true, 100),
    ('FOREMAN', 'Foreman', 'Manage jobs, crews, schedules, materials, and time tracking', true, 60),
    ('EMPLOYEE', 'Employee', 'View assigned work, log time, add notes, and basic access', true, 40)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    level = EXCLUDED.level;

-- ============================================================================
-- STEP 5: Seed System Permissions
-- ============================================================================

-- Core system permissions
INSERT INTO "Permission" (id, name, description, category, "isSystem") VALUES
    -- Jobs
    ('jobs.read', 'View Jobs', 'View job information', 'Jobs', true),
    ('jobs.read_assigned', 'View Assigned Jobs', 'View only assigned jobs', 'Jobs', true),
    ('jobs.create', 'Create Jobs', 'Create new jobs', 'Jobs', true),
    ('jobs.update', 'Update Jobs', 'Edit job information', 'Jobs', true),
    ('jobs.delete', 'Delete Jobs', 'Delete jobs', 'Jobs', true),
    ('jobs.manage', 'Manage Jobs', 'Full job management', 'Jobs', true),
    
    -- Scheduling
    ('scheduling.read', 'View Schedules', 'View schedules', 'Scheduling', true),
    ('scheduling.manage', 'Manage Schedules', 'Create and edit schedules', 'Scheduling', true),
    ('schedule.view_own', 'View Own Schedule', 'View personal schedule', 'Scheduling', true),
    
    -- Time Tracking
    ('time_tracking.read', 'View Time Entries', 'View time entries', 'Time Tracking', true),
    ('time_tracking.manage', 'Manage Time Entries', 'Full time entry management', 'Time Tracking', true),
    ('time_tracking.manage_own', 'Manage Own Time', 'Manage personal time entries', 'Time Tracking', true),
    
    -- Materials
    ('materials.read', 'View Materials', 'View material information', 'Materials', true),
    ('materials.create', 'Create Materials', 'Add new materials', 'Materials', true),
    ('materials.update', 'Update Materials', 'Edit materials', 'Materials', true),
    ('materials.delete', 'Delete Materials', 'Delete materials', 'Materials', true),
    ('materials.manage', 'Manage Materials', 'Full material management', 'Materials', true),
    ('materials.log_usage', 'Log Material Usage', 'Record material usage', 'Materials', true),
    ('materials.view_costs', 'View Material Costs', 'View material pricing', 'Materials', true),
    
    -- Equipment
    ('equipment.read', 'View Equipment', 'View equipment', 'Equipment', true),
    ('equipment.manage', 'Manage Equipment', 'Full equipment management', 'Equipment', true),
    
    -- Documents
    ('documents.read', 'View Documents', 'View documents', 'Documents', true),
    ('documents.upload', 'Upload Documents', 'Upload new documents', 'Documents', true),
    ('documents.manage', 'Manage Documents', 'Full document management', 'Documents', true),
    
    -- Reports
    ('reports.read', 'View Reports', 'View reports', 'Reports', true),
    ('reports.revenue', 'View Revenue Reports', 'View revenue and financial reports', 'Reports', true),
    
    -- Customers
    ('customers.read', 'View Customers', 'View customer information', 'Customers', true),
    ('customers.create', 'Create Customers', 'Add new customers', 'Customers', true),
    ('customers.update', 'Update Customers', 'Edit customers', 'Customers', true),
    ('customers.delete', 'Delete Customers', 'Delete customers', 'Customers', true),
    ('customers.manage', 'Manage Customers', 'Full customer management', 'Customers', true),
    
    -- Invoices
    ('invoices.read', 'View Invoices', 'View invoices', 'Invoices', true),
    ('invoices.create', 'Create Invoices', 'Create new invoices', 'Invoices', true),
    ('invoices.update', 'Update Invoices', 'Edit invoices', 'Invoices', true),
    ('invoices.delete', 'Delete Invoices', 'Delete invoices', 'Invoices', true),
    ('invoices.manage', 'Manage Invoices', 'Full invoice management', 'Invoices', true),
    ('invoices.view_amounts', 'View Invoice Amounts', 'View invoice totals and amounts', 'Invoices', true),
    
    -- Crew Management
    ('crew.read', 'View Crews', 'View crew assignments', 'Crew', true),
    ('crew.manage', 'Manage Crews', 'Manage crew assignments', 'Crew', true),
    
    -- Job Notes
    ('job_notes.read', 'View Job Notes', 'View job notes', 'Job Notes', true),
    ('job_notes.create', 'Create Job Notes', 'Add job notes', 'Job Notes', true),
    
    -- Accounting
    ('accounting.gl_view', 'View General Ledger', 'View GL accounts and balances', 'Accounting', true),
    ('accounting.gl_manage', 'Manage General Ledger', 'Create and edit GL accounts', 'Accounting', true),
    ('accounting.journal_entries_view', 'View Journal Entries', 'View journal entries', 'Accounting', true),
    ('accounting.journal_entries_create', 'Create Journal Entries', 'Create journal entries', 'Accounting', true),
    ('accounting.journal_entries_post', 'Post Journal Entries', 'Post journal entries', 'Accounting', true),
    ('accounting.periods_manage', 'Manage Accounting Periods', 'Open and close accounting periods', 'Accounting', true),
    ('accounting.trial_balance_view', 'View Trial Balance', 'View trial balance reports', 'Accounting', true),
    
    -- Financial Data Visibility
    ('financial.view_labor_rates', 'View Labor Rates', 'View employee hourly rates', 'Financial', true),
    ('financial.view_job_costs', 'View Job Costs', 'View job cost breakdowns', 'Financial', true),
    ('financial.view_profit_margins', 'View Profit Margins', 'View profit margin analysis', 'Financial', true),
    ('financial.view_payroll', 'View Payroll', 'View payroll information', 'Financial', true),
    ('financial.view_employee_costs', 'View Employee Costs', 'View employee cost data', 'Financial', true),
    ('financial.manage_pricing', 'Manage Pricing', 'Manage system pricing', 'Financial', true),
    
    -- System
    ('system.settings', 'System Settings', 'Manage system settings', 'System', true),
    ('system.users', 'Manage Users', 'Manage user accounts', 'System', true),
    ('system.roles', 'Manage Roles', 'Manage roles and permissions', 'System', true),
    ('system.audit_log', 'View Audit Log', 'View system audit logs', 'System', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category;

-- ============================================================================
-- STEP 6: Assign Permissions to System Roles
-- ============================================================================

-- OWNER_ADMIN gets all permissions (wildcard handled in code)
-- For database queries, we'll still insert explicit permissions

-- FOREMAN permissions
INSERT INTO "RolePermission" ("roleId", "permissionId") 
SELECT 'FOREMAN', id FROM "Permission" WHERE id IN (
    'jobs.manage', 'scheduling.manage', 'time_tracking.manage',
    'materials.manage', 'materials.view_costs', 'equipment.manage', 'documents.manage',
    'reports.read', 'reports.revenue', 'customers.read', 'invoices.read', 'invoices.view_amounts',
    'job_notes.create', 'job_notes.read', 'crew.manage',
    'financial.view_labor_rates', 'financial.view_job_costs'
)
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- EMPLOYEE permissions
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT 'EMPLOYEE', id FROM "Permission" WHERE id IN (
    'jobs.read_assigned', 'time_tracking.manage_own', 'materials.log_usage',
    'job_notes.create', 'job_notes.read', 'documents.upload', 'documents.read',
    'schedule.view_own'
)
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- ============================================================================
-- STEP 7: Create Permission Groups (Templates)
-- ============================================================================

-- Accounting Access template
INSERT INTO "PermissionGroup" (id, name, description, "isSystem") VALUES
    ('accounting_access', 'Accounting Access', 'Full access to accounting features', true),
    ('job_site_manager', 'Job Site Manager', 'Manage job sites without financial access', true),
    ('office_manager', 'Office Manager', 'Office management with customer and scheduling access', true),
    ('materials_manager', 'Materials Manager', 'Manage inventory and materials', true)
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- Populate Accounting Access template
INSERT INTO "PermissionGroupMember" ("groupId", "permissionId")
SELECT 'accounting_access', id FROM "Permission" WHERE category = 'Accounting'
ON CONFLICT ("groupId", "permissionId") DO NOTHING;

-- Populate Job Site Manager template
INSERT INTO "PermissionGroupMember" ("groupId", "permissionId")
SELECT 'job_site_manager', id FROM "Permission" WHERE id IN (
    'jobs.manage', 'scheduling.manage', 'crew.manage', 'materials.manage',
    'equipment.manage', 'time_tracking.manage', 'job_notes.create', 'job_notes.read'
)
ON CONFLICT ("groupId", "permissionId") DO NOTHING;

-- Populate Office Manager template
INSERT INTO "PermissionGroupMember" ("groupId", "permissionId")
SELECT 'office_manager', id FROM "Permission" WHERE id IN (
    'customers.manage', 'invoices.manage', 'invoices.view_amounts',
    'scheduling.manage', 'documents.manage', 'reports.read'
)
ON CONFLICT ("groupId", "permissionId") DO NOTHING;

-- Populate Materials Manager template
INSERT INTO "PermissionGroupMember" ("groupId", "permissionId")
SELECT 'materials_manager', id FROM "Permission" WHERE id IN (
    'materials.manage', 'materials.view_costs', 'equipment.manage',
    'documents.upload', 'documents.read'
)
ON CONFLICT ("groupId", "permissionId") DO NOTHING;

-- ============================================================================
-- STEP 8: Create Helper Functions
-- ============================================================================

-- Function to check if user has a specific permission
CREATE OR REPLACE FUNCTION user_has_permission(
    p_user_id TEXT,
    p_permission_id TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    user_role_id TEXT;
    has_permission BOOLEAN;
    user_override BOOLEAN;
BEGIN
    -- Get user's current role
    SELECT role INTO user_role_id FROM "User" WHERE id = p_user_id AND active = true;
    
    IF user_role_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check for user-specific permission override
    SELECT granted INTO user_override
    FROM "UserPermission"
    WHERE "userId" = p_user_id 
    AND "permissionId" = p_permission_id
    AND ("expiresAt" IS NULL OR "expiresAt" > CURRENT_TIMESTAMP);
    
    -- If user has explicit grant/deny, use it
    IF user_override IS NOT NULL THEN
        RETURN user_override;
    END IF;
    
    -- OWNER_ADMIN has all permissions
    IF user_role_id = 'OWNER_ADMIN' THEN
        RETURN true;
    END IF;
    
    -- Check role permissions
    SELECT EXISTS(
        SELECT 1 FROM "RolePermission"
        WHERE "roleId" = user_role_id AND "permissionId" = p_permission_id
    ) INTO has_permission;
    
    RETURN COALESCE(has_permission, false);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get all permissions for a user
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id TEXT)
RETURNS TABLE(permission_id TEXT, permission_name TEXT, source TEXT) AS $$
BEGIN
    RETURN QUERY
    WITH user_role AS (
        SELECT role FROM "User" WHERE id = p_user_id AND active = true
    ),
    role_perms AS (
        SELECT p.id, p.name, 'role' as source
        FROM "Permission" p
        INNER JOIN "RolePermission" rp ON p.id = rp."permissionId"
        INNER JOIN user_role ur ON rp."roleId" = ur.role
    ),
    user_perms AS (
        SELECT p.id, p.name, 
            CASE WHEN up.granted THEN 'user_grant' ELSE 'user_deny' END as source
        FROM "Permission" p
        INNER JOIN "UserPermission" up ON p.id = up."permissionId"
        WHERE up."userId" = p_user_id
        AND (up."expiresAt" IS NULL OR up."expiresAt" > CURRENT_TIMESTAMP)
    )
    SELECT * FROM role_perms
    UNION
    SELECT * FROM user_perms
    ORDER BY permission_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- STEP 9: Create Audit Triggers
-- ============================================================================

-- Trigger to log role changes
CREATE OR REPLACE FUNCTION log_role_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        INSERT INTO "AuditLog" (
            "userId", "performedBy", action, resource, "resourceId",
            "oldValue", "newValue", severity
        ) VALUES (
            NEW.id, NEW.id, 'role_changed', 'User', NEW.id,
            OLD.role, NEW.role, 'WARNING'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_role_change ON "User";
CREATE TRIGGER trigger_log_role_change
    AFTER UPDATE OF role ON "User"
    FOR EACH ROW EXECUTE FUNCTION log_role_change();

-- Trigger to log permission grants/revocations
CREATE OR REPLACE FUNCTION log_permission_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO "AuditLog" (
            "userId", "performedBy", action, resource, "resourceId",
            "newValue", severity
        ) VALUES (
            NEW."userId", NEW."grantedBy", 
            CASE WHEN NEW.granted THEN 'permission_granted' ELSE 'permission_revoked' END,
            'UserPermission', NEW.id, NEW."permissionId", 'WARNING'
        );
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.granted IS DISTINCT FROM NEW.granted THEN
            INSERT INTO "AuditLog" (
                "userId", "performedBy", action, resource, "resourceId",
                "oldValue", "newValue", severity
            ) VALUES (
                NEW."userId", NEW."grantedBy",
                'permission_changed', 'UserPermission', NEW.id,
                OLD.granted::TEXT, NEW.granted::TEXT, 'WARNING'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_permission_change ON "UserPermission";
CREATE TRIGGER trigger_log_permission_change
    AFTER INSERT OR UPDATE ON "UserPermission"
    FOR EACH ROW EXECUTE FUNCTION log_permission_change();

-- ============================================================================
-- STEP 10: Update triggers for updatedAt columns
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_permission_updated_at ON "Permission";
CREATE TRIGGER update_permission_updated_at
    BEFORE UPDATE ON "Permission"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_role_updated_at ON "Role";
CREATE TRIGGER update_role_updated_at
    BEFORE UPDATE ON "Role"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_permission_group_updated_at ON "PermissionGroup";
CREATE TRIGGER update_permission_group_updated_at
    BEFORE UPDATE ON "PermissionGroup"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 11: Add Comments for Documentation
-- ============================================================================

COMMENT ON TABLE "Permission" IS 'All available permissions in the system';
COMMENT ON TABLE "Role" IS 'User roles (system and custom) with hierarchy levels';
COMMENT ON TABLE "RolePermission" IS 'Links roles to their permissions';
COMMENT ON TABLE "UserPermission" IS 'User-specific permission overrides (grants or revokes)';
COMMENT ON TABLE "PermissionGroup" IS 'Permission templates for bulk assignment';
COMMENT ON TABLE "PermissionGroupMember" IS 'Permissions included in a group/template';
COMMENT ON TABLE "AuditLog" IS 'Complete audit trail of system actions and changes';

COMMENT ON FUNCTION user_has_permission(TEXT, TEXT) IS 'Checks if user has a specific permission (considers role + overrides)';
COMMENT ON FUNCTION get_user_permissions(TEXT) IS 'Returns all permissions for a user with their source (role/override)';
