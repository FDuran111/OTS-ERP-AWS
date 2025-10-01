-- ============================================
-- ROLES & PERMISSIONS SYSTEM
-- ============================================
-- This migration creates the Role-Based Access Control (RBAC) system
-- with Role and RoleAssignment tables

-- Role table already exists, just add missing columns if needed
DO $$
BEGIN
    -- Add display_name if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'Role' AND column_name = 'display_name') THEN
        ALTER TABLE "Role" ADD COLUMN display_name VARCHAR(255);
    END IF;

    -- Add active if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'Role' AND column_name = 'active') THEN
        ALTER TABLE "Role" ADD COLUMN active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Create RoleAssignment table (junction table for User-Role many-to-many)
-- User.id is TEXT not UUID
CREATE TABLE IF NOT EXISTS "RoleAssignment" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES "User"(id) ON DELETE CASCADE,
    role_id UUID REFERENCES "Role"(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by TEXT REFERENCES "User"(id),
    UNIQUE(user_id, role_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_role_assignment_user ON "RoleAssignment"(user_id);
CREATE INDEX IF NOT EXISTS idx_role_assignment_role ON "RoleAssignment"(role_id);

-- Insert default roles with comprehensive permissions
-- Note: Role table has isSystem not is_system
INSERT INTO "Role" (name, display_name, description, permissions, "isSystem", active) VALUES
(
    'ADMIN',
    'Administrator',
    'Complete control of the entire system - all features and settings',
    '["*"]'::jsonb,
    true,
    true
),
(
    'MANAGER',
    'Manager',
    'Manage operations, view reports, approve timesheets, manage users',
    '["jobs.read", "jobs.create", "jobs.update", "jobs.delete", "time_tracking.read", "time_tracking.approve", "reports.read", "reports.export", "users.read", "customers.read", "customers.create", "customers.update", "invoices.read", "materials.read"]'::jsonb,
    true,
    true
),
(
    'EMPLOYEE',
    'Employee',
    'View assigned work, log time, add notes, and basic access',
    '["jobs.read_assigned", "time_tracking.manage_own", "materials.log_usage", "job_notes.create", "job_notes.read", "documents.upload", "documents.read", "schedule.view_own"]'::jsonb,
    true,
    true
),
(
    'FOREMAN',
    'Foreman',
    'Manage jobs, crews, schedules, materials, and time tracking',
    '["jobs.manage", "scheduling.manage", "time_tracking.manage", "materials.manage", "equipment.manage", "documents.manage", "reports.read", "customers.read", "invoices.read", "job_notes.create", "job_notes.read", "crew.manage"]'::jsonb,
    true,
    true
),
(
    'HR_MANAGER',
    'HR Manager',
    'Manage employees, payroll, benefits, and HR functions',
    '["users.read", "users.create", "users.update", "users.deactivate", "time_tracking.read", "time_tracking.approve", "payroll.manage", "reports.read", "reports.export"]'::jsonb,
    true,
    true
),
(
    'ACCOUNTANT',
    'Accountant',
    'Manage finances, invoices, expenses, and financial reports',
    '["invoices.read", "invoices.create", "invoices.update", "invoices.delete", "expenses.manage", "reports.read", "reports.export", "customers.read", "jobs.read", "materials.read"]'::jsonb,
    true,
    true
),
(
    'PROJECT_MANAGER',
    'Project Manager',
    'Manage projects, schedules, budgets, and project teams',
    '["jobs.read", "jobs.create", "jobs.update", "jobs.manage", "scheduling.manage", "time_tracking.read", "materials.read", "equipment.read", "customers.read", "reports.read", "documents.manage", "crew.manage"]'::jsonb,
    true,
    true
),
(
    'OFFICE_STAFF',
    'Office Staff',
    'Handle administrative tasks, customer service, and data entry',
    '["customers.read", "customers.create", "customers.update", "jobs.read", "jobs.create", "scheduling.read", "documents.read", "documents.upload", "invoices.read", "reports.read"]'::jsonb,
    true,
    true
)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    "updatedAt" = CURRENT_TIMESTAMP;

-- Assign admin role to existing admin user
INSERT INTO "RoleAssignment" (user_id, role_id, assigned_by)
SELECT
    u.id,
    r.id,
    u.id
FROM "User" u
CROSS JOIN "Role" r
WHERE u.email = 'admin@admin.com'
  AND r.name = 'ADMIN'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Skip grant permissions if postgres user doesn't exist
-- GRANT ALL ON TABLE "Role" TO postgres;
-- GRANT ALL ON TABLE "RoleAssignment" TO postgres;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Roles & Permissions system created successfully!';
    RAISE NOTICE 'Created 8 roles: Admin, Manager, Employee, Foreman, HR Manager, Accountant, Project Manager, Office Staff';
END $$;
