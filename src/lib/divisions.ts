// Electrical divisions for calendar filtering
export const DIVISIONS = {
  LOW_VOLTAGE: 'LOW_VOLTAGE',
  LINE_VOLTAGE: 'LINE_VOLTAGE',
} as const

export type Division = typeof DIVISIONS[keyof typeof DIVISIONS]

export const divisionConfig = {
  [DIVISIONS.LOW_VOLTAGE]: {
    label: 'Low Voltage',
    color: '#9c27b0', // Purple
    description: 'Security, data, communication systems',
    requiredRole: 'FOREMAN', // Minimum role to view
    restrictedUsers: ['todd'] as string[] // Specific users with restricted access
  },
  [DIVISIONS.LINE_VOLTAGE]: {
    label: 'Line Voltage',
    color: '#ff9800', // Orange
    description: 'Standard electrical, 120V/240V systems',
    requiredRole: 'EMPLOYEE', // Anyone can view
    restrictedUsers: [] as string[] // No restrictions
  }
}

// Check if user can access division
export function canAccessDivision(
  division: Division, 
  userRole: string, 
  userName?: string
): boolean {
  const config = divisionConfig[division]
  
  // Check if user is specifically restricted
  if (userName && config.restrictedUsers.includes(userName.toLowerCase())) {
    return false
  }
  
  // Check role hierarchy
  const roleHierarchy: Record<string, number> = {
    OWNER_ADMIN: 100,
    FOREMAN: 60,
    EMPLOYEE: 40,
  }
  
  const userLevel = roleHierarchy[userRole] || 0
  const requiredLevel = roleHierarchy[config.requiredRole] || 0
  
  return userLevel >= requiredLevel
}

// Get accessible divisions for a user
export function getAccessibleDivisions(
  userRole: string, 
  userName?: string
): Division[] {
  return Object.values(DIVISIONS).filter(division => 
    canAccessDivision(division, userRole, userName)
  )
}