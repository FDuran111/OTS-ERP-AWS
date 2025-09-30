import { pool } from './db'

/**
 * Set the acting user in the database session for audit logging
 * MUST be called at the start of each authenticated request
 */
export async function setActingUser(userId: string): Promise<void> {
  try {
    await pool.query('SELECT set_acting_user($1)', [userId])
  } catch (error) {
    console.error('Failed to set acting user for audit logging:', error)
    // Don't throw - we don't want to break the request if audit setup fails
  }
}

/**
 * Check if a user has a specific permission (from database)
 * Returns true if user has the permission via role or direct grant
 * THROWS on database errors (allows fallback in calling code)
 */
export async function userHasPermission(
  userId: string,
  permissionId: string
): Promise<boolean> {
  const result = await pool.query(
    'SELECT user_has_permission($1, $2) as has_permission',
    [userId, permissionId]
  )
  return result.rows[0]?.has_permission === true
}

/**
 * Get all permissions for a user (from database)
 * Returns array of permission IDs the user has
 * THROWS on database errors (allows fallback in calling code)
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const result = await pool.query(
    'SELECT get_user_permissions($1) as permissions',
    [userId]
  )
  return result.rows[0]?.permissions || []
}

/**
 * Get user's role from database
 * THROWS on database errors (allows fallback in calling code)
 */
export async function getUserRole(userId: string): Promise<string | null> {
  const result = await pool.query(
    'SELECT role FROM "User" WHERE id = $1',
    [userId]
  )
  return result.rows[0]?.role || null
}

/**
 * Check if user has a permission using wildcard matching
 * Supports patterns like 'jobs.*' matching 'jobs.read'
 * THROWS on database errors (allows fallback in calling code)
 */
export async function checkPermissionWithWildcard(
  userId: string,
  permissionPattern: string
): Promise<boolean> {
  const permissions = await getUserPermissions(userId)
  
  // Check for exact match
  if (permissions.includes(permissionPattern)) {
    return true
  }
  
  // Check for wildcard matches
  // If pattern ends with .*, check if any permission starts with the prefix
  if (permissionPattern.endsWith('.*')) {
    const prefix = permissionPattern.slice(0, -2)
    return permissions.some(p => p.startsWith(prefix + '.'))
  }
  
  // Check if user has wildcard permission that covers this pattern
  return permissions.some(p => {
    if (p.endsWith('.*')) {
      const prefix = p.slice(0, -2)
      return permissionPattern.startsWith(prefix + '.')
    }
    return false
  })
}

/**
 * Batch check multiple permissions for a user
 * More efficient than checking one by one
 * THROWS on database errors (allows fallback in calling code)
 */
export async function userHasAllPermissions(
  userId: string,
  permissionIds: string[]
): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId)
  
  // Check if user has all required permissions
  return permissionIds.every(requiredPerm => {
    // Check exact match
    if (userPermissions.includes(requiredPerm)) {
      return true
    }
    
    // Check wildcard matches
    return userPermissions.some(userPerm => {
      if (userPerm.endsWith('.*')) {
        const prefix = userPerm.slice(0, -2)
        return requiredPerm.startsWith(prefix + '.')
      }
      return false
    })
  })
}

/**
 * Batch check if user has ANY of the given permissions
 * THROWS on database errors (allows fallback in calling code)
 */
export async function userHasAnyPermission(
  userId: string,
  permissionIds: string[]
): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId)
  
  return permissionIds.some(requiredPerm => {
    // Check exact match
    if (userPermissions.includes(requiredPerm)) {
      return true
    }
    
    // Check wildcard matches
    return userPermissions.some(userPerm => {
      if (userPerm.endsWith('.*')) {
        const prefix = userPerm.slice(0, -2)
        return requiredPerm.startsWith(prefix + '.')
      }
      return false
    })
  })
}

/**
 * Check resource access: combines resource + action into permission format
 * Example: canAccessResource(userId, 'jobs', 'read') checks for 'jobs.read' permission
 * THROWS on database errors (allows fallback in calling code)
 */
export async function canAccessResourceDB(
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  const permissionId = `${resource}.${action}`
  return userHasPermission(userId, permissionId)
}

