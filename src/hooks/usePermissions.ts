'use client'

import { useState, useEffect } from 'react'
import { permissions } from '@/lib/permissions'
import { UserRole } from '@/lib/auth'

export function usePermissions() {
  const [user, setUser] = useState<{ role: UserRole } | null>(null)
  
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
  }, [])
  
  const userRole = user?.role || 'EMPLOYEE'
  
  return {
    canViewPricing: permissions.canViewPricing(userRole),
    canViewMaterialCosts: permissions.canViewMaterialCosts(userRole),
    canViewLaborRates: permissions.canViewLaborRates(userRole),
    canViewJobCosts: permissions.canViewJobCosts(userRole),
    canViewInvoiceAmounts: permissions.canViewInvoiceAmounts(userRole),
    canViewRevenueReports: permissions.canViewRevenueReports(userRole),
    canViewPayroll: permissions.canViewPayroll(userRole),
    canViewProfitMargins: permissions.canViewProfitMargins(userRole),
    canViewEmployeeCosts: permissions.canViewEmployeeCosts(userRole),
    canManagePricing: permissions.canManagePricing(userRole),
    userRole,
  }
}