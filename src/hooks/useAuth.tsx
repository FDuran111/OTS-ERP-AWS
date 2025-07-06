'use client'

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { UserRole, UserPayload, hasRole, hasPermission, canAccessResource, getRoleDisplayName } from '@/lib/auth'

// Types for auth context
export interface AuthContextType {
  user: UserPayload | null
  loading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  hasRole: (roles: UserRole | UserRole[]) => boolean
  hasPermission: (permission: string) => boolean
  canAccess: (resource: string, action: string) => boolean
  refreshUser: () => Promise<void>
}

// Auth context
export const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Custom hook for role checking
export function useRole() {
  const { user, hasRole: contextHasRole, hasPermission: contextHasPermission, canAccess } = useAuth()
  
  return {
    user,
    role: user?.role || null,
    roleName: user ? getRoleDisplayName(user.role) : null,
    hasRole: contextHasRole,
    hasPermission: contextHasPermission,
    canAccess,
    isOwner: user?.role === 'OWNER_ADMIN',
    isAdmin: user?.role === 'OWNER_ADMIN',
    isOffice: user?.role === 'FOREMAN',
    isTechnician: user?.role === 'EMPLOYEE',
    isViewer: user?.role === 'EMPLOYEE',
    isStaff: user ? hasRole(user.role, ['OWNER_ADMIN', 'FOREMAN']) : false,
    canManageUsers: user ? hasPermission(user.role, 'users.manage') : false,
    canManageJobs: user ? canAccessResource(user.role, 'jobs', 'manage') : false,
    canManageInvoices: user ? canAccessResource(user.role, 'invoices', 'manage') : false,
    canManageCustomers: user ? canAccessResource(user.role, 'customers', 'manage') : false,
    canViewReports: user ? hasPermission(user.role, 'reports.read') : false,
    canManageSettings: user ? hasPermission(user.role, 'system_settings.manage') : false,
  }
}

// Hook implementation for auth state management
export function useAuthState(): AuthContextType {
  const [user, setUser] = useState<UserPayload | null>(null)
  const [loading, setLoading] = useState(true)

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        // Always verify with server first to ensure correct role
        const response = await fetch('/api/auth/me')
        
        if (response.ok) {
          const userData = await response.json()
          setUser(userData)
          localStorage.setItem('user', JSON.stringify(userData))
        } else {
          // Clear any stale local data
          localStorage.removeItem('user')
          setUser(null)
        }
      } catch (error) {
        console.error('Error loading user:', error)
        // If server is unreachable, try localStorage as fallback
        const storedUser = localStorage.getItem('user')
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser)
            setUser(userData)
          } catch (e) {
            localStorage.removeItem('user')
            setUser(null)
          }
        }
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true)
      
      // Clear any existing user data first
      setUser(null)
      localStorage.removeItem('user')
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        localStorage.setItem('user', JSON.stringify(data.user))
        return true
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      
      // Call logout API
      await fetch('/api/auth/logout', { method: 'POST' })
      
      // Clear local state
      setUser(null)
      localStorage.removeItem('user')
      
      // Redirect to login
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout error:', error)
      // Still clear local state even if API call fails
      setUser(null)
      localStorage.removeItem('user')
      window.location.href = '/login'
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/auth/me')
      
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        localStorage.setItem('user', JSON.stringify(userData))
      } else if (response.status === 401) {
        // Token expired or invalid
        setUser(null)
        localStorage.removeItem('user')
      }
    } catch (error) {
      console.error('Error refreshing user:', error)
    }
  }, [])

  const contextHasRole = useCallback((roles: UserRole | UserRole[]): boolean => {
    if (!user) return false
    return hasRole(user.role, roles)
  }, [user])

  const contextHasPermission = useCallback((permission: string): boolean => {
    if (!user) return false
    return hasPermission(user.role, permission)
  }, [user])

  const contextCanAccess = useCallback((resource: string, action: string): boolean => {
    if (!user) return false
    return canAccessResource(user.role, resource, action)
  }, [user])

  return {
    user,
    loading,
    login,
    logout,
    hasRole: contextHasRole,
    hasPermission: contextHasPermission,
    canAccess: contextCanAccess,
    refreshUser,
  }
}

// HOC for protecting pages/components
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredRoles?: UserRole | UserRole[]
) {
  return function AuthenticatedComponent(props: P) {
    const { user, loading, hasRole } = useAuth()

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      )
    }

    if (!user) {
      // Redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      return null
    }

    if (requiredRoles && !hasRole(requiredRoles)) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </div>
        </div>
      )
    }

    return <Component {...props} />
  }
}

// Component for conditional rendering based on roles
export function RoleGuard({ 
  roles, 
  permissions,
  resource,
  action,
  children, 
  fallback = null 
}: {
  roles?: UserRole | UserRole[]
  permissions?: string | string[]
  resource?: string
  action?: string
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { user, hasRole, hasPermission, canAccess } = useAuth()

  if (!user) {
    return <>{fallback}</>
  }

  // Check role requirements
  if (roles && !hasRole(roles)) {
    return <>{fallback}</>
  }

  // Check permission requirements
  if (permissions) {
    const perms = Array.isArray(permissions) ? permissions : [permissions]
    const hasAllPermissions = perms.every(perm => hasPermission(perm))
    if (!hasAllPermissions) {
      return <>{fallback}</>
    }
  }

  // Check resource access
  if (resource && action && !canAccess(resource, action)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// Utility functions for common checks
export function usePermissions() {
  const { user } = useAuth()
  
  if (!user) {
    return {
      canViewDashboard: false,
      canManageJobs: false,
      canManageInvoices: false,
      canManageCustomers: false,
      canManageUsers: false,
      canManageSettings: false,
      canViewReports: false,
      canManageLaborRates: false,
      canManageEquipment: false,
      canManageMaterials: false,
      canManageScheduling: false,
      canManageTimeTracking: false,
      canUploadDocuments: false,
      canViewAuditLogs: false,
      canImpersonate: false,
    }
  }

  return {
    canViewDashboard: hasRole(user.role, ['OWNER_ADMIN', 'FOREMAN', 'EMPLOYEE']),
    canManageJobs: canAccessResource(user.role, 'jobs', 'manage'),
    canManageInvoices: canAccessResource(user.role, 'invoices', 'manage'),
    canManageCustomers: canAccessResource(user.role, 'customers', 'manage'),
    canManageUsers: hasPermission(user.role, 'users.manage'),
    canManageSettings: hasPermission(user.role, 'system_settings.manage'),
    canViewReports: hasPermission(user.role, 'reports.read'),
    canManageLaborRates: canAccessResource(user.role, 'labor_rates', 'manage'),
    canManageEquipment: canAccessResource(user.role, 'equipment', 'manage'),
    canManageMaterials: canAccessResource(user.role, 'materials', 'manage'),
    canManageScheduling: canAccessResource(user.role, 'scheduling', 'manage'),
    canManageTimeTracking: canAccessResource(user.role, 'time_tracking', 'manage'),
    canUploadDocuments: canAccessResource(user.role, 'documents', 'upload'),
    canViewAuditLogs: hasPermission(user.role, 'audit_logs.read'),
    canImpersonate: hasPermission(user.role, 'impersonation.use'),
  }
}