-- ============================================
-- CLEANUP DUPLICATE ROLES
-- ============================================
-- Remove old legacy roles that were created before the RBAC system
-- Keep only the new RBAC roles (with UPPERCASE names and display_name)

-- Delete old duplicate roles (created on Sept 29)
DELETE FROM "Role"
WHERE "createdAt" < '2025-10-01'
  AND name IN ('Accountant', 'Admin', 'Employee', 'Foreman', 'HR Manager', 'Manager');

-- Verify remaining roles
SELECT name, display_name, "isSystem", active
FROM "Role"
ORDER BY "isSystem" DESC, name;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Duplicate roles removed successfully!';
    RAISE NOTICE 'Remaining roles: 8 (ADMIN, MANAGER, EMPLOYEE, FOREMAN, HR_MANAGER, ACCOUNTANT, PROJECT_MANAGER, OFFICE_STAFF)';
END $$;
