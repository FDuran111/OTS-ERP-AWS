'use client'

import React from 'react'
import { useAuth, RoleGuard } from '@/hooks/useAuth'
import { UserRole } from '@/lib/auth'
import { UnauthorizedAccess } from '@/components/providers/AuthProvider'

// Specific role guard components for common use cases

// Owner only access
export function OwnerOnly({ 
  children, 
  fallback = <UnauthorizedAccess message="Only system owners can access this feature." /> 
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return (
    <RoleGuard roles="OWNER" fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

// Admin or Owner access
export function AdminOrOwner({ 
  children, 
  fallback = <UnauthorizedAccess message="Administrative privileges required." /> 
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return (
    <RoleGuard roles={['OWNER', 'ADMIN']} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

// Staff access (Owner, Admin, Office)
export function StaffOnly({ 
  children, 
  fallback = <UnauthorizedAccess message="Staff access required." /> 
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return (
    <RoleGuard roles={['OWNER', 'ADMIN', 'OFFICE']} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

// Any authenticated user
export function AuthenticatedOnly({ 
  children, 
  fallback = <UnauthorizedAccess message="Please log in to access this feature." /> 
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return (
    <RoleGuard roles={['OWNER', 'ADMIN', 'OFFICE', 'TECHNICIAN', 'VIEWER']} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

// Permission-based guards
export function RequirePermission({ 
  permission,
  children, 
  fallback = <UnauthorizedAccess message="You don't have permission to access this feature." /> 
}: {
  permission: string
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return (
    <RoleGuard permissions={permission} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

// Resource access guards
export function RequireResourceAccess({ 
  resource,
  action,
  children, 
  fallback = <UnauthorizedAccess message="You don't have permission to perform this action." /> 
}: {
  resource: string
  action: string
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return (
    <RoleGuard resource={resource} action={action} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

// Button/Action guards that just hide content instead of showing error
export function HiddenForRole({ 
  roles, 
  children 
}: {
  roles: UserRole | UserRole[]
  children: React.ReactNode
}) {
  const { hasRole } = useAuth()
  
  if (hasRole(roles)) {
    return null
  }
  
  return <>{children}</>
}

export function ShowForRole({ 
  roles, 
  children 
}: {
  roles: UserRole | UserRole[]
  children: React.ReactNode
}) {
  const { hasRole } = useAuth()
  
  if (!hasRole(roles)) {
    return null
  }
  
  return <>{children}</>
}

export function ShowForPermission({ 
  permission, 
  children 
}: {
  permission: string
  children: React.ReactNode
}) {
  const { hasPermission } = useAuth()
  
  if (!hasPermission(permission)) {
    return null
  }
  
  return <>{children}</>
}

export function ShowForResourceAccess({ 
  resource,
  action,
  children 
}: {
  resource: string
  action: string
  children: React.ReactNode
}) {
  const { canAccess } = useAuth()
  
  if (!canAccess(resource, action)) {
    return null
  }
  
  return <>{children}</>
}

// Conditional rendering based on role level
export function ShowForRoleLevel({ 
  minLevel, 
  children 
}: {
  minLevel: UserRole
  children: React.ReactNode
}) {
  const { hasRole } = useAuth()
  
  if (!hasRole(minLevel)) {
    return null
  }
  
  return <>{children}</>
}

// Higher-order component for protecting entire pages
export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  requiredRoles: UserRole | UserRole[],
  fallback?: React.ReactNode
) {
  return function GuardedComponent(props: P) {
    return (
      <RoleGuard roles={requiredRoles} fallback={fallback}>
        <Component {...props} />
      </RoleGuard>
    )
  }
}

// Loading state for auth-dependent content
export function AuthLoadingWrapper({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth()
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-3 text-gray-600">Loading...</span>
      </div>
    )
  }
  
  return <>{children}</>
}

// Role badge component
export function RoleBadge({ role, className = '' }: { role: UserRole; className?: string }) {
  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'OWNER': return 'bg-red-100 text-red-800 border-red-200'
      case 'ADMIN': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'OFFICE': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'TECHNICIAN': return 'bg-green-100 text-green-800 border-green-200'
      case 'VIEWER': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case 'OWNER': return 'Owner'
      case 'ADMIN': return 'Admin'
      case 'OFFICE': return 'Office'
      case 'TECHNICIAN': return 'Tech'
      case 'VIEWER': return 'Viewer'
      default: return role
    }
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(role)} ${className}`}>
      {getRoleDisplayName(role)}
    </span>
  )
}

// Current user info component
export function CurrentUserInfo({ className = '' }: { className?: string }) {
  const { user } = useAuth()
  
  if (!user) return null
  
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
        <p className="text-xs text-gray-500 truncate">{user.email}</p>
      </div>
      <RoleBadge role={user.role} />
    </div>
  )
}