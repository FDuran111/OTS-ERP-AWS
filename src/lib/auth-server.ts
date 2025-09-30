// SERVER-ONLY: Database-backed permission checking
// This file should ONLY be imported in server-side code (API routes, server components)

import { UserRole, hasPermission, ROLE_PERMISSIONS } from './auth'
import { 
  userHasPermission as dbUserHasPermission,
  getUserPermissions as dbGetUserPermissions,
  userHasAllPermissions as dbUserHasAllPermissions,
  canAccessResourceDB,
  setActingUser
} from './db-permissions'

/**
 * Database-backed permission check with hardcoded fallback
 * Use this in new code for database-driven RBAC
 */
export async function hasPermissionDB(
  userId: string,
  userRole: UserRole,
  permission: string
): Promise<boolean> {
  try {
    // Try database first
    const hasPermDB = await dbUserHasPermission(userId, permission)
    return hasPermDB
  } catch (error) {
    console.warn('Database permission check failed, falling back to hardcoded:', error)
    // Fall back to hardcoded permissions
    return hasPermission(userRole, permission)
  }
}

/**
 * Check multiple permissions from database with fallback
 */
export async function hasAllPermissionsDB(
  userId: string,
  userRole: UserRole,
  permissions: string[]
): Promise<boolean> {
  try {
    // Try database first
    const hasAllDB = await dbUserHasAllPermissions(userId, permissions)
    return hasAllDB
  } catch (error) {
    console.warn('Database permissions check failed, falling back to hardcoded:', error)
    // Fall back to hardcoded permissions
    return permissions.every(perm => hasPermission(userRole, perm))
  }
}

/**
 * Check resource access from database with fallback
 */
export async function canAccessResourceDB_Wrapper(
  userId: string,
  userRole: UserRole,
  resource: string,
  action: string
): Promise<boolean> {
  try {
    // Try database first
    const canAccessDB = await canAccessResourceDB(userId, resource, action)
    return canAccessDB
  } catch (error) {
    console.warn('Database resource access check failed, falling back to hardcoded:', error)
    // Fall back to hardcoded permissions
    const permission = `${resource}.${action}`
    return hasPermission(userRole, permission)
  }
}

/**
 * Get all user permissions from database with fallback
 */
export async function getUserPermissionsWithFallback(
  userId: string,
  userRole: UserRole
): Promise<string[]> {
  try {
    // Try database first
    const perms = await dbGetUserPermissions(userId)
    if (perms && perms.length > 0) {
      return perms
    }
    // If no permissions in DB, fall back to hardcoded
    return ROLE_PERMISSIONS[userRole] || []
  } catch (error) {
    console.warn('Database get permissions failed, falling back to hardcoded:', error)
    // Fall back to hardcoded permissions
    return ROLE_PERMISSIONS[userRole] || []
  }
}

/**
 * Initialize audit logging for current request
 * MUST be called at the start of every authenticated request
 */
export async function initializeAuditLogging(userId: string): Promise<void> {
  try {
    await setActingUser(userId)
  } catch (error) {
    console.error('Failed to initialize audit logging:', error)
    // Don't throw - we don't want to break the request
  }
}

// Export database permission functions for direct use
export { 
  dbUserHasPermission,
  dbGetUserPermissions,
  dbUserHasAllPermissions,
  canAccessResourceDB,
  setActingUser
}
