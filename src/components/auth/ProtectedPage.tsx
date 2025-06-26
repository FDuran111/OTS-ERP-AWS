'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { UserRole } from '@/lib/auth'
import { AuthLoadingSpinner, UnauthorizedAccess } from '@/components/providers/AuthProvider'

interface ProtectedPageProps {
  children: React.ReactNode
  requiredRoles?: UserRole | UserRole[]
  requiredPermissions?: string | string[]
  resource?: string
  action?: string
  redirectTo?: string
  showUnauthorized?: boolean
  customFallback?: React.ReactNode
}

export function ProtectedPage({
  children,
  requiredRoles,
  requiredPermissions,
  resource,
  action,
  redirectTo = '/login',
  showUnauthorized = true,
  customFallback,
}: ProtectedPageProps) {
  const { user, loading, hasRole, hasPermission, canAccess } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Only redirect after loading is complete and we know there's no user
    if (!loading && !user) {
      router.push(redirectTo)
    }
  }, [user, loading, router, redirectTo])

  // Show loading spinner while checking auth
  if (loading) {
    return <AuthLoadingSpinner />
  }

  // Redirect if not authenticated (don't render anything)
  if (!user) {
    return null
  }

  // Check role requirements
  if (requiredRoles && !hasRole(requiredRoles)) {
    if (customFallback) {
      return <>{customFallback}</>
    }
    if (showUnauthorized) {
      return <UnauthorizedAccess message="You don't have the required role to access this page." />
    }
    return null
  }

  // Check permission requirements
  if (requiredPermissions) {
    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions]
    const hasAllPermissions = permissions.every(permission => hasPermission(permission))
    
    if (!hasAllPermissions) {
      if (customFallback) {
        return <>{customFallback}</>
      }
      if (showUnauthorized) {
        return <UnauthorizedAccess message="You don't have the required permissions to access this page." />
      }
      return null
    }
  }

  // Check resource access
  if (resource && action && !canAccess(resource, action)) {
    if (customFallback) {
      return <>{customFallback}</>
    }
    if (showUnauthorized) {
      return <UnauthorizedAccess message="You don't have access to this resource." />
    }
    return null
  }

  // All checks passed, render the protected content
  return <>{children}</>
}

// Convenience wrappers for common access patterns
export function OwnerOnlyPage({ children, ...props }: Omit<ProtectedPageProps, 'requiredRoles'>) {
  return (
    <ProtectedPage requiredRoles="OWNER" {...props}>
      {children}
    </ProtectedPage>
  )
}

export function AdminPage({ children, ...props }: Omit<ProtectedPageProps, 'requiredRoles'>) {
  return (
    <ProtectedPage requiredRoles={['OWNER', 'ADMIN']} {...props}>
      {children}
    </ProtectedPage>
  )
}

export function StaffPage({ children, ...props }: Omit<ProtectedPageProps, 'requiredRoles'>) {
  return (
    <ProtectedPage requiredRoles={['OWNER', 'ADMIN', 'OFFICE']} {...props}>
      {children}
    </ProtectedPage>
  )
}

export function AuthenticatedPage({ children, ...props }: Omit<ProtectedPageProps, 'requiredRoles'>) {
  return (
    <ProtectedPage requiredRoles={['OWNER', 'ADMIN', 'OFFICE', 'TECHNICIAN', 'VIEWER']} {...props}>
      {children}
    </ProtectedPage>
  )
}

// Higher-order component version
export function withProtectedPage<P extends object>(
  Component: React.ComponentType<P>,
  protection: Omit<ProtectedPageProps, 'children'>
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedPage {...protection}>
        <Component {...props} />
      </ProtectedPage>
    )
  }
}

// Hook for imperative access checking in components
export function useRequireAuth(
  requirements: {
    roles?: UserRole | UserRole[]
    permissions?: string | string[]
    resource?: string
    action?: string
  } = {}
) {
  const { user, loading, hasRole, hasPermission, canAccess } = useAuth()
  const router = useRouter()

  const checkAccess = React.useCallback(() => {
    if (loading) return { authorized: false, loading: true }
    if (!user) return { authorized: false, loading: false, error: 'Not authenticated' }

    // Check role requirements
    if (requirements.roles && !hasRole(requirements.roles)) {
      return { authorized: false, loading: false, error: 'Insufficient role permissions' }
    }

    // Check permission requirements
    if (requirements.permissions) {
      const permissions = Array.isArray(requirements.permissions) ? requirements.permissions : [requirements.permissions]
      const hasAllPermissions = permissions.every(permission => hasPermission(permission))
      
      if (!hasAllPermissions) {
        return { authorized: false, loading: false, error: 'Insufficient permissions' }
      }
    }

    // Check resource access
    if (requirements.resource && requirements.action && !canAccess(requirements.resource, requirements.action)) {
      return { authorized: false, loading: false, error: 'Access denied for this resource' }
    }

    return { authorized: true, loading: false }
  }, [user, loading, hasRole, hasPermission, canAccess, requirements])

  const requireAuth = React.useCallback((redirectTo = '/login') => {
    const result = checkAccess()
    if (!result.loading && !result.authorized) {
      if (!user) {
        router.push(redirectTo)
      }
      return false
    }
    return result.authorized
  }, [checkAccess, user, router])

  return {
    ...checkAccess(),
    requireAuth,
    user,
  }
}