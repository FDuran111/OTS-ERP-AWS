import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export type UserRole = 'OWNER_ADMIN' | 'FOREMAN' | 'EMPLOYEE'

export interface UserPayload {
  id: string
  email: string
  name: string
  role: UserRole
}

// Role hierarchy for permission checking (higher roles inherit lower role permissions)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  'OWNER_ADMIN': 100,  // Full control of everything - complete system access
  'FOREMAN': 60,       // Manage jobs, crews, schedules, materials, time tracking
  'EMPLOYEE': 40       // View assigned work, log time, add notes, basic access
}

// Resource permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  'OWNER_ADMIN': [
    '*'  // Owner/Admin has complete control of everything
  ],
  'FOREMAN': [
    'jobs.manage', 'scheduling.manage', 'time_tracking.manage', 
    'materials.manage', 'equipment.manage', 'documents.manage',
    'reports.read', 'customers.read', 'invoices.read',
    'job_notes.create', 'job_notes.read', 'crew.manage'
  ],
  'EMPLOYEE': [
    'jobs.read_assigned', 'time_tracking.manage_own', 'materials.log_usage',
    'job_notes.create', 'job_notes.read', 'documents.upload', 'documents.read',
    'schedule.view_own'
  ]
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateToken(payload: UserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): UserPayload {
  return jwt.verify(token, JWT_SECRET) as UserPayload
}

// Role checking utility functions
export function hasRole(userRole: UserRole, requiredRoles: UserRole | UserRole[]): boolean {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]
  return roles.some(role => userRole === role || ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[role])
}

export function hasPermission(userRole: UserRole, permission: string): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || []
  
  // Owner has all permissions
  if (rolePermissions.includes('*')) {
    return true
  }
  
  // Check exact permission match
  if (rolePermissions.includes(permission)) {
    return true
  }
  
  // Check wildcard permissions (e.g., 'jobs.*' matches 'jobs.read')
  return rolePermissions.some(perm => {
    if (perm.endsWith('.*')) {
      const prefix = perm.slice(0, -2)
      return permission.startsWith(prefix + '.')
    }
    return false
  })
}

export function canAccessResource(userRole: UserRole, resource: string, action: string): boolean {
  const permission = `${resource}.${action}`
  return hasPermission(userRole, permission)
}

export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case 'OWNER_ADMIN': return 'Owner/Admin'
    case 'FOREMAN': return 'Foreman'
    case 'EMPLOYEE': return 'Employee'
    default: return role
  }
}

export function getRoleDescription(role: UserRole): string {
  switch (role) {
    case 'OWNER_ADMIN': return 'Complete control of the entire system - all features and settings'
    case 'FOREMAN': return 'Manage jobs, crews, schedules, materials, and time tracking'
    case 'EMPLOYEE': return 'View assigned work, log time, add notes, and basic access'
    default: return 'Unknown role'
  }
}

// Helper to check if user can perform action on specific resource
export function checkResourceAccess(
  userRole: UserRole, 
  resource: string, 
  action: string, 
  resourceOwnerId?: string, 
  currentUserId?: string
): boolean {
  // Owner/Admin can do everything
  if (userRole === 'OWNER_ADMIN') {
    return true
  }
  
  // Check basic permission
  if (!canAccessResource(userRole, resource, action)) {
    return false
  }
  
  // Special cases for resource ownership
  if (resourceOwnerId && currentUserId) {
    // Users can always access their own resources
    if (resourceOwnerId === currentUserId) {
      return true
    }
    
    // Employees can only access their own time entries and assigned jobs
    if (userRole === 'EMPLOYEE' && action !== 'read') {
      return resourceOwnerId === currentUserId
    }
  }
  
  return true
}

// =============================================================================
// DATABASE-BACKED PERMISSION CHECKING
// =============================================================================
// These functions check permissions from the database first, with fallback to
// hardcoded permissions for backward compatibility and resilience

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
    return canAccessResource(userRole, resource, action)
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