-- Fix Audit Logging to Capture Real Actor
-- Use session variables to track who performed actions

-- ============================================================================
-- STEP 1: Update log_role_change to use session variable
-- ============================================================================

CREATE OR REPLACE FUNCTION log_role_change()
RETURNS TRIGGER AS $$
DECLARE
    acting_user_id TEXT;
BEGIN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        -- Try to get the acting user from session variable set by application
        BEGIN
            acting_user_id := current_setting('app.current_user_id', true);
        EXCEPTION WHEN OTHERS THEN
            acting_user_id := NULL;
        END;
        
        -- If no session variable, fall back to the user being modified (for self-service changes)
        IF acting_user_id IS NULL OR acting_user_id = '' THEN
            acting_user_id := NEW.id;
        END IF;
        
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
-- STEP 2: Create audit trigger for RolePermission changes
-- ============================================================================

CREATE OR REPLACE FUNCTION log_role_permission_change()
RETURNS TRIGGER AS $$
DECLARE
    acting_user_id TEXT;
    action_text TEXT;
BEGIN
    -- Get acting user from session
    BEGIN
        acting_user_id := current_setting('app.current_user_id', true);
    EXCEPTION WHEN OTHERS THEN
        acting_user_id := NULL;
    END;
    
    IF TG_OP = 'INSERT' THEN
        action_text := 'role_permission_granted';
        INSERT INTO "UserAuditLog" (
            user_id, performed_by, action, resource, "resourceId", 
            new_value, severity, metadata
        ) VALUES (
            NULL, acting_user_id, action_text, 'RolePermission', NEW.id,
            NEW."permissionId", 'INFO',
            jsonb_build_object('roleId', NEW."roleId", 'permissionId', NEW."permissionId")
        );
    ELSIF TG_OP = 'DELETE' THEN
        action_text := 'role_permission_revoked';
        INSERT INTO "UserAuditLog" (
            user_id, performed_by, action, resource, "resourceId",
            old_value, severity, metadata
        ) VALUES (
            NULL, acting_user_id, action_text, 'RolePermission', OLD.id,
            OLD."permissionId", 'WARNING',
            jsonb_build_object('roleId', OLD."roleId", 'permissionId', OLD."permissionId")
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_role_permission_change ON "RolePermission";
CREATE TRIGGER trigger_log_role_permission_change
    AFTER INSERT OR DELETE ON "RolePermission"
    FOR EACH ROW EXECUTE FUNCTION log_role_permission_change();

-- ============================================================================
-- STEP 3: Create audit trigger for Role changes
-- ============================================================================

CREATE OR REPLACE FUNCTION log_role_changes()
RETURNS TRIGGER AS $$
DECLARE
    acting_user_id TEXT;
    action_text TEXT;
BEGIN
    -- Get acting user from session
    BEGIN
        acting_user_id := current_setting('app.current_user_id', true);
    EXCEPTION WHEN OTHERS THEN
        acting_user_id := NULL;
    END;
    
    IF TG_OP = 'INSERT' THEN
        action_text := 'role_created';
        INSERT INTO "UserAuditLog" (
            user_id, performed_by, action, resource, "resourceId",
            new_value, severity, metadata
        ) VALUES (
            NULL, acting_user_id, action_text, 'Role', NEW.id,
            NEW.name, 'INFO',
            jsonb_build_object('roleId', NEW.id, 'roleName', NEW.name, 'level', NEW.level)
        );
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.name IS DISTINCT FROM NEW.name OR OLD.level IS DISTINCT FROM NEW.level THEN
            action_text := 'role_modified';
            INSERT INTO "UserAuditLog" (
                user_id, performed_by, action, resource, "resourceId",
                old_value, new_value, severity, metadata
            ) VALUES (
                NULL, acting_user_id, action_text, 'Role', NEW.id,
                jsonb_build_object('name', OLD.name, 'level', OLD.level)::text,
                jsonb_build_object('name', NEW.name, 'level', NEW.level)::text,
                'WARNING',
                jsonb_build_object('roleId', NEW.id)
            );
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        action_text := 'role_deleted';
        INSERT INTO "UserAuditLog" (
            user_id, performed_by, action, resource, "resourceId",
            old_value, severity, metadata
        ) VALUES (
            NULL, acting_user_id, action_text, 'Role', OLD.id,
            OLD.name, 'CRITICAL',
            jsonb_build_object('roleId', OLD.id, 'roleName', OLD.name)
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_role_changes ON "Role";
CREATE TRIGGER trigger_log_role_changes
    AFTER INSERT OR UPDATE OR DELETE ON "Role"
    FOR EACH ROW EXECUTE FUNCTION log_role_changes();

-- ============================================================================
-- STEP 4: Update log_permission_change to use session variable
-- ============================================================================

CREATE OR REPLACE FUNCTION log_permission_change()
RETURNS TRIGGER AS $$
DECLARE
    acting_user_id TEXT;
BEGIN
    -- Get acting user from session (prefer session over grantedBy)
    BEGIN
        acting_user_id := current_setting('app.current_user_id', true);
    EXCEPTION WHEN OTHERS THEN
        acting_user_id := NULL;
    END;
    
    -- Fall back to grantedBy if session not set
    IF acting_user_id IS NULL OR acting_user_id = '' THEN
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

-- Re-create trigger with updated function
DROP TRIGGER IF EXISTS trigger_log_permission_change ON "UserPermission";
CREATE TRIGGER trigger_log_permission_change
    AFTER INSERT OR UPDATE ON "UserPermission"
    FOR EACH ROW EXECUTE FUNCTION log_permission_change();

-- ============================================================================
-- STEP 5: Add helper function to set acting user in session
-- ============================================================================

CREATE OR REPLACE FUNCTION set_acting_user(p_user_id TEXT)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id, false);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_acting_user(TEXT) IS 'Set the current acting user ID in session for audit logging. Call this at the start of each request.';

-- ============================================================================
-- Documentation
-- ============================================================================

COMMENT ON FUNCTION log_role_change() IS 'Audit trigger for User role changes - uses session variable app.current_user_id';
COMMENT ON FUNCTION log_role_permission_change() IS 'Audit trigger for RolePermission changes - tracks permission grants/revocations';
COMMENT ON FUNCTION log_role_changes() IS 'Audit trigger for Role table changes - tracks role creation/modification/deletion';
COMMENT ON FUNCTION log_permission_change() IS 'Audit trigger for UserPermission changes - uses session variable for actor';
