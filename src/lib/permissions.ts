import { UserRole } from './auth'

// Permission checks for various features
export const permissions = {
  // Pricing visibility - only OWNER_ADMIN and FOREMAN can see costs
  canViewPricing: (role: UserRole): boolean => {
    return role === 'OWNER_ADMIN' || role === 'FOREMAN'
  },

  // Material costs - only OWNER_ADMIN and FOREMAN
  canViewMaterialCosts: (role: UserRole): boolean => {
    return role === 'OWNER_ADMIN' || role === 'FOREMAN'
  },

  // Labor rates - only OWNER_ADMIN and FOREMAN
  canViewLaborRates: (role: UserRole): boolean => {
    return role === 'OWNER_ADMIN' || role === 'FOREMAN'
  },

  // Job estimates and costs - only OWNER_ADMIN and FOREMAN
  canViewJobCosts: (role: UserRole): boolean => {
    return role === 'OWNER_ADMIN' || role === 'FOREMAN'
  },

  // Invoice amounts - only OWNER_ADMIN and FOREMAN
  canViewInvoiceAmounts: (role: UserRole): boolean => {
    return role === 'OWNER_ADMIN' || role === 'FOREMAN'
  },

  // Revenue reports - only OWNER_ADMIN and FOREMAN
  canViewRevenueReports: (role: UserRole): boolean => {
    return role === 'OWNER_ADMIN' || role === 'FOREMAN'
  },

  // Payroll information - only OWNER_ADMIN
  canViewPayroll: (role: UserRole): boolean => {
    return role === 'OWNER_ADMIN'
  },

  // Profit margins - only OWNER_ADMIN
  canViewProfitMargins: (role: UserRole): boolean => {
    return role === 'OWNER_ADMIN'
  },

  // Employee costs - only OWNER_ADMIN
  canViewEmployeeCosts: (role: UserRole): boolean => {
    return role === 'OWNER_ADMIN'
  },

  // Manage pricing - only OWNER_ADMIN
  canManagePricing: (role: UserRole): boolean => {
    return role === 'OWNER_ADMIN'
  },
}

// Helper to strip pricing data from objects based on role
export function stripPricingData<T extends Record<string, any>>(
  data: T,
  role: UserRole,
  pricingFields: string[]
): T {
  if (permissions.canViewPricing(role)) {
    return data
  }

  const stripped = { ...data }
  for (const field of pricingFields) {
    delete stripped[field]
  }
  return stripped
}

// Helper to strip pricing from arrays of objects
export function stripPricingFromArray<T extends Record<string, any>>(
  data: T[],
  role: UserRole,
  pricingFields: string[]
): T[] {
  if (permissions.canViewPricing(role)) {
    return data
  }

  return data.map(item => stripPricingData(item, role, pricingFields))
}