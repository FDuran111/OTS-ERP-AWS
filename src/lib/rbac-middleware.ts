import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, hasRole, hasPermission, canAccessResource, UserRole, UserPayload } from './auth'

export interface RBACConfig {
  requiredRoles?: UserRole | UserRole[]
  requiredPermissions?: string | string[]
  resource?: string
  action?: string
  allowOwner?: boolean // Defaults to true
  customCheck?: (user: UserPayload, request: NextRequest) => boolean
}

export interface AuthenticatedRequest extends NextRequest {
  user: UserPayload
}

// Middleware function to check authentication and authorization
export function withRBAC(config: RBACConfig = {}) {
  return function rbacMiddleware(
    handler: (request: AuthenticatedRequest) => Promise<Response> | Response
  ) {
    return async function(request: NextRequest): Promise<Response> {
      try {
        // Get auth token from cookies
        const cookieStore = await cookies()
        const token = cookieStore.get('auth-token')?.value

        if (!token) {
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          )
        }

        // Verify and decode token
        let user: UserPayload
        try {
          user = verifyToken(token)
        } catch (error) {
          return NextResponse.json(
            { error: 'Invalid or expired token' },
            { status: 401 }
          )
        }

        // Check role requirements
        if (config.requiredRoles) {
          if (!hasRole(user.role, config.requiredRoles)) {
            return NextResponse.json(
              { error: 'Insufficient permissions' },
              { status: 403 }
            )
          }
        }

        // Check permission requirements
        if (config.requiredPermissions) {
          const permissions = Array.isArray(config.requiredPermissions) 
            ? config.requiredPermissions 
            : [config.requiredPermissions]
          
          const hasAllPermissions = permissions.every(permission => 
            hasPermission(user.role, permission)
          )

          if (!hasAllPermissions) {
            return NextResponse.json(
              { error: 'Insufficient permissions' },
              { status: 403 }
            )
          }
        }

        // Check resource access
        if (config.resource && config.action) {
          if (!canAccessResource(user.role, config.resource, config.action)) {
            return NextResponse.json(
              { error: 'Access denied for this resource' },
              { status: 403 }
            )
          }
        }

        // Custom authorization check
        if (config.customCheck && !config.customCheck(user, request)) {
          return NextResponse.json(
            { error: 'Access denied' },
            { status: 403 }
          )
        }

        // Owner bypass (enabled by default)
        const allowOwner = config.allowOwner !== false
        if (allowOwner && user.role === 'OWNER') {
          // Owner can access everything, skip other checks
        }

        // Add user to request and call handler
        const authenticatedRequest = request as AuthenticatedRequest
        authenticatedRequest.user = user

        return await handler(authenticatedRequest)

      } catch (error) {
        console.error('RBAC middleware error:', error)
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  }
}

// Convenience wrapper for common role checks
export const requireRole = (roles: UserRole | UserRole[]) => 
  withRBAC({ requiredRoles: roles })

export const requirePermission = (permissions: string | string[]) => 
  withRBAC({ requiredPermissions: permissions })

export const requireResourceAccess = (resource: string, action: string) => 
  withRBAC({ resource, action })

// Pre-defined middleware for common access patterns
export const requireOwnerOrAdmin = withRBAC({ requiredRoles: ['OWNER', 'ADMIN'] })
export const requireAdminOrOffice = withRBAC({ requiredRoles: ['ADMIN', 'OFFICE'] })
export const requireStaffAccess = withRBAC({ requiredRoles: ['OWNER', 'ADMIN', 'OFFICE'] })
export const requireAnyRole = withRBAC({ requiredRoles: ['OWNER', 'ADMIN', 'OFFICE', 'TECHNICIAN', 'VIEWER'] })

// Specific resource access middleware
export const requireJobAccess = withRBAC({ resource: 'jobs', action: 'read' })
export const requireJobManagement = withRBAC({ resource: 'jobs', action: 'manage' })
export const requireInvoiceAccess = withRBAC({ resource: 'invoices', action: 'read' })
export const requireInvoiceManagement = withRBAC({ resource: 'invoices', action: 'manage' })
export const requireCustomerManagement = withRBAC({ resource: 'customers', action: 'manage' })
export const requireSystemSettings = withRBAC({ requiredPermissions: 'system_settings.manage' })

// Helper to extract user from authenticated request
export async function getAuthenticatedUser(request: NextRequest): Promise<UserPayload | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value
    
    if (!token) return null
    
    return verifyToken(token)
  } catch {
    return null
  }
}

// Helper for client-side role checking (to be used in API routes)
export function checkUserAccess(
  token: string | undefined,
  config: RBACConfig
): { authorized: boolean; user?: UserPayload; error?: string } {
  if (!token) {
    return { authorized: false, error: 'Authentication required' }
  }

  try {
    const user = verifyToken(token)
    
    // Check role requirements
    if (config.requiredRoles && !hasRole(user.role, config.requiredRoles)) {
      return { authorized: false, user, error: 'Insufficient role permissions' }
    }

    // Check permission requirements
    if (config.requiredPermissions) {
      const permissions = Array.isArray(config.requiredPermissions) 
        ? config.requiredPermissions 
        : [config.requiredPermissions]
      
      const hasAllPermissions = permissions.every(permission => 
        hasPermission(user.role, permission)
      )

      if (!hasAllPermissions) {
        return { authorized: false, user, error: 'Insufficient permissions' }
      }
    }

    // Check resource access
    if (config.resource && config.action) {
      if (!canAccessResource(user.role, config.resource, config.action)) {
        return { authorized: false, user, error: 'Access denied for this resource' }
      }
    }

    return { authorized: true, user }
  } catch (error) {
    return { authorized: false, error: 'Invalid or expired token' }
  }
}

// Audit logging helper
export async function logUserAction(
  user: UserPayload,
  action: string,
  resource?: string,
  details?: Record<string, any>
) {
  try {
    // This would typically write to your audit log
    // For now, we'll just console.log, but in production you'd want to:
    // 1. Write to database audit log table
    // 2. Send to external logging service
    // 3. Alert on sensitive actions
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action,
      resource,
      details
    }
    
    console.log('RBAC Audit Log:', JSON.stringify(logEntry, null, 2))
    
    // TODO: Implement actual audit logging to database
    // await insertAuditLog(logEntry)
    
  } catch (error) {
    console.error('Failed to log user action:', error)
  }
}