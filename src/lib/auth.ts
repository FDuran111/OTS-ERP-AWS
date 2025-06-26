import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export type UserRole = 'OWNER' | 'ADMIN' | 'OFFICE' | 'TECHNICIAN' | 'VIEWER'

export interface UserPayload {
  id: string
  email: string
  name: string
  role: UserRole
}

// Role hierarchy for permission checking (higher roles inherit lower role permissions)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  'OWNER': 100,    // Full control, system settings, impersonation, audit logs
  'ADMIN': 80,     // Full operational control (jobs, invoices, rates, scheduling, materials)
  'OFFICE': 60,    // Customer mgmt, billing, scheduling, job creation/editing, document uploads
  'TECHNICIAN': 40, // View assigned jobs, submit time, add jobsite notes/materials
  'VIEWER': 20     // Read-only access to jobs, notes, documents
}

// Resource permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  'OWNER': [
    'system_settings.manage', 'users.manage', 'audit_logs.read',
    'impersonation.use', '*'  // Owner can do everything
  ],
  'ADMIN': [
    'jobs.manage', 'invoices.manage', 'customers.manage', 'materials.manage',
    'scheduling.manage', 'labor_rates.manage', 'equipment.manage', 'reports.read',
    'purchase_orders.manage', 'time_tracking.manage', 'documents.manage'
  ],
  'OFFICE': [
    'customers.manage', 'jobs.create', 'jobs.edit', 'jobs.read',
    'invoices.create', 'invoices.edit', 'invoices.read',
    'scheduling.manage', 'documents.upload', 'documents.read',
    'materials.read', 'labor_rates.read', 'reports.read'
  ],
  'TECHNICIAN': [
    'jobs.read_assigned', 'time_tracking.manage_own', 'materials.log_usage',
    'job_notes.create', 'job_notes.read', 'documents.upload', 'documents.read'
  ],
  'VIEWER': [
    'jobs.read', 'documents.read', 'job_notes.read', 'materials.read'
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
    case 'OWNER': return 'Owner'
    case 'ADMIN': return 'Administrator'
    case 'OFFICE': return 'Office Staff'
    case 'TECHNICIAN': return 'Technician'
    case 'VIEWER': return 'Viewer'
    default: return role
  }
}

export function getRoleDescription(role: UserRole): string {
  switch (role) {
    case 'OWNER': return 'Full control, including system settings, impersonation, and audit logs'
    case 'ADMIN': return 'Full operational control (jobs, invoices, rates, scheduling, materials)'
    case 'OFFICE': return 'Customer management, billing, scheduling, job creation/editing, document uploads'
    case 'TECHNICIAN': return 'View assigned jobs, submit time, add jobsite notes/materials'
    case 'VIEWER': return 'Read-only access to jobs, notes, documents'
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
  // Owner can do everything
  if (userRole === 'OWNER') {
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
    
    // Technicians can only access their own time entries and assigned jobs
    if (userRole === 'TECHNICIAN' && action !== 'read') {
      return resourceOwnerId === currentUserId
    }
  }
  
  return true
}