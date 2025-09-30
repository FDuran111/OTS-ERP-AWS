-- Robust Audit Logging - No Silent Failures
-- Ensures every audit entry has a valid actor

-- ============================================================================
-- STEP 1: Strict actor tracking with safe fallbacks
-- ============================================================================

CREATE OR REPLACE FUNCTION get_acting_user()
RETURNS TEXT AS $$
DECLARE
    acting_user_id TEXT;
BEGIN
    -- Try to get from session variable
    BEGIN
        acting_user_id := current_setting('app.current_user_id', true);
    EXCEPTION WHEN OTHERS THEN
        acting_user_id := NULL;
    END;
    
    -- If not set, return SYSTEM placeholder (never NULL)
    IF acting_user_id IS NULL OR acting_user_id = '' THEN
        RETURN 'SYSTEM';
    END IF;
    
    RETURN acting_user_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_acting_user() IS 'Get acting user from session variable, returns SYSTEM if not set';

-- ============================================================================
-- STEP 2: Update log_role_change - strict actor, no self-attribution
-- ============================================================================

CREATE OR REPLACE FUNCTION log_role_change()
RETURNS TRIGGER AS $$
DECLARE
    acting_user_id TEXT;
BEGIN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        acting_user_id := get_acting_user();
        
        INSERT INTO "UserAuditLog" (
            user_id, performed_by, action, resource, old_value, new_value, severity
        ) VALUES (
            NEW.id, acting_user_id, 'role_changed', 'User', 
            OLD.role::text, NEW.role::text, 'WARNING'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 3: Enhanced log_role_changes - track ALL significant changes
-- ============================================================================

CREATE OR REPLACE FUNCTION log_role_changes()
RETURNS TRIGGER AS $$
DECLARE
    acting_user_id TEXT;
    action_text TEXT;
    changes JSONB := '{}';
BEGIN
    acting_user_id := get_acting_user();
    
    IF TG_OP = 'INSERT' THEN
        INSERT INTO "UserAuditLog" (
            user_id, performed_by, action, resource, "resourceId",
            new_value, severity, metadata
        ) VALUES (
            NULL, acting_user_id, 'role_created', 'Role', NEW.id,
            NEW.name, 'INFO',
            jsonb_build_object('roleId', NEW.id, 'roleName', NEW.name, 'level', NEW.level)
        );
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Track name changes
        IF OLD.name IS DISTINCT FROM NEW.name THEN
            changes := changes || jsonb_build_object(
                'name', jsonb_build_object('old', OLD.name, 'new', NEW.name)
            );
        END IF;
        
        -- Track level changes
        IF OLD.level IS DISTINCT FROM NEW.level THEN
            changes := changes || jsonb_build_object(
                'level', jsonb_build_object('old', OLD.level, 'new', NEW.level)
            );
        END IF;
        
        -- Track isActive changes (critical for role lifecycle)
        IF OLD."isActive" IS DISTINCT FROM NEW."isActive" THEN
            changes := changes || jsonb_build_object(
                'isActive', jsonb_build_object('old', OLD."isActive", 'new', NEW."isActive")
            );
            action_text := CASE 
                WHEN NEW."isActive" THEN 'role_activated' 
                ELSE 'role_deactivated' 
            END;
        END IF;
        
        -- Track isSystem changes
        IF OLD."isSystem" IS DISTINCT FROM NEW."isSystem" THEN
            changes := changes || jsonb_build_object(
                'isSystem', jsonb_build_object('old', OLD."isSystem", 'new', NEW."isSystem")
            );
        END IF;
        
        -- Only log if there were changes
        IF changes != '{}' THEN
            INSERT INTO "UserAuditLog" (
                user_id, performed_by, action, resource, "resourceId",
                old_value, new_value, severity, metadata
            ) VALUES (
                NULL, acting_user_id, 
                COALESCE(action_text, 'role_modified'), 
                'Role', NEW.id,
                changes::text, NULL,
                CASE WHEN action_text LIKE '%deactivated' THEN 'CRITICAL' ELSE 'WARNING' END,
                jsonb_build_object('roleId', NEW.id, 'roleName', NEW.name, 'changes', changes)
            );
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO "UserAuditLog" (
            user_id, performed_by, action, resource, "resourceId",
            old_value, severity, metadata
        ) VALUES (
            NULL, acting_user_id, 'role_deleted', 'Role', OLD.id,
            OLD.name, 'CRITICAL',
            jsonb_build_object('roleId', OLD.id, 'roleName', OLD.name, 'level', OLD.level)
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 4: Update log_role_permission_change - use grantedBy fallback
-- ============================================================================

CREATE OR REPLACE FUNCTION log_role_permission_change()
RETURNS TRIGGER AS $$
DECLARE
    acting_user_id TEXT;
BEGIN
    acting_user_id := get_acting_user();
    
    -- If SYSTEM and we have grantedBy, use that
    IF acting_user_id = 'SYSTEM' AND TG_OP = 'INSERT' AND NEW."grantedBy" IS NOT NULL THEN
        acting_user_id := NEW."grantedBy";
    END IF;
    
    IF TG_OP = 'INSERT' THEN
        INSERT INTO "UserAuditLog" (
            user_id, performed_by, action, resource, "resourceId", 
            new_value, severity, metadata
        ) VALUES (
            NULL, acting_user_id, 'role_permission_granted', 'RolePermission', NEW.id,
            NEW."permissionId", 'INFO',
            jsonb_build_object('roleId', NEW."roleId", 'permissionId', NEW."permissionId")
        );
        
    ELSIF TG_OP = 'DELETE' THEN
        -- For DELETE, we don't have grantedBy, so use session or SYSTEM
        INSERT INTO "UserAuditLog" (
            user_id, performed_by, action, resource, "resourceId",
            old_value, severity, metadata
        ) VALUES (
            NULL, acting_user_id, 'role_permission_revoked', 'RolePermission', OLD.id,
            OLD."permissionId", 'WARNING',
            jsonb_build_object('roleId', OLD."roleId", 'permissionId', OLD."permissionId")
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 5: Update log_permission_change - use grantedBy, never NULL
-- ============================================================================

CREATE OR REPLACE FUNCTION log_permission_change()
RETURNS TRIGGER AS $$
DECLARE
    acting_user_id TEXT;
BEGIN
    acting_user_id := get_acting_user();
    
    -- Prefer grantedBy over SYSTEM for user permissions
    IF acting_user_id = 'SYSTEM' AND NEW."grantedBy" IS NOT NULL THEN
        acting_user_id := NEW."grantedBy";
    END IF;
    
    IF TG_OP = 'INSERT' THEN
        INSERT INTO "UserAuditLog" (
            user_id, performed_by, action, resource, "resourceId", new_value, severity
        ) VALUES (
            NEW."userId", acting_user_id,
            CASE WHEN NEW.granted THEN 'permission_granted' ELSE 'permission_revoked' END,
            'UserPermission', NEW.id, NEW."permissionId", 'WARNING'
        );
        
    ELSIF TG_OP = 'UPDATE' AND OLD.granted IS DISTINCT FROM NEW.granted THEN
        INSERT INTO "UserAuditLog" (
            user_id, performed_by, action, resource, "resourceId",
            old_value, new_value, severity
        ) VALUES (
            NEW."userId", acting_user_id, 'permission_changed', 'UserPermission', NEW.id,
            OLD.granted::TEXT, NEW.granted::TEXT, 'WARNING'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 6: Recreate all triggers with updated functions
-- ============================================================================

-- User role change trigger
DROP TRIGGER IF EXISTS trigger_log_role_change ON "User";
CREATE TRIGGER trigger_log_role_change
    AFTER UPDATE OF role ON "User"
    FOR EACH ROW EXECUTE FUNCTION log_role_change();

-- Role table change trigger
DROP TRIGGER IF EXISTS trigger_log_role_changes ON "Role";
CREATE TRIGGER trigger_log_role_changes
    AFTER INSERT OR UPDATE OR DELETE ON "Role"
    FOR EACH ROW EXECUTE FUNCTION log_role_changes();

-- Role permission change trigger
DROP TRIGGER IF EXISTS trigger_log_role_permission_change ON "RolePermission";
CREATE TRIGGER trigger_log_role_permission_change
    AFTER INSERT OR DELETE ON "RolePermission"
    FOR EACH ROW EXECUTE FUNCTION log_role_permission_change();

-- User permission change trigger
DROP TRIGGER IF EXISTS trigger_log_permission_change ON "UserPermission";
CREATE TRIGGER trigger_log_permission_change
    AFTER INSERT OR UPDATE ON "UserPermission"
    FOR EACH ROW EXECUTE FUNCTION log_permission_change();

-- ============================================================================
-- Documentation
-- ============================================================================

COMMENT ON FUNCTION get_acting_user() IS 'Returns session user or SYSTEM, never NULL - ensures audit integrity';
COMMENT ON FUNCTION log_role_change() IS 'Audit User role changes - uses get_acting_user() for reliable actor';
COMMENT ON FUNCTION log_role_changes() IS 'Audit Role lifecycle - tracks name, level, isActive, isSystem changes';
COMMENT ON FUNCTION log_role_permission_change() IS 'Audit RolePermission - uses grantedBy fallback if session not set';
COMMENT ON FUNCTION log_permission_change() IS 'Audit UserPermission - prefers grantedBy, never NULL performer';
