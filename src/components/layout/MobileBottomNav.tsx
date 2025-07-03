'use client'

import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Badge,
  Fab,
  Box,
  useTheme,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  Work as JobsIcon,
  Schedule as ScheduleIcon,
  People as CustomersIcon,
  Add as AddIcon,
} from '@mui/icons-material'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { UserRole } from '@/lib/auth'
import MobileQuickActions from './MobileQuickActions'

interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

interface MobileBottomNavProps {
  currentPath: string
  onNavigate: (path: string) => void
  user: User
}

interface BottomNavItem {
  label: string
  icon: React.ReactElement
  path: string
  roles?: UserRole[]
  badge?: number
}

const bottomNavItems: BottomNavItem[] = [
  {
    label: 'Dashboard',
    icon: <DashboardIcon />,
    path: '/dashboard',
    roles: ['OWNER_ADMIN', 'FOREMAN', 'EMPLOYEE']
  },
  {
    label: 'Jobs',
    icon: <JobsIcon />,
    path: '/jobs',
    roles: ['OWNER_ADMIN', 'FOREMAN']
  },
  {
    label: 'My Jobs',
    icon: <JobsIcon />,
    path: '/jobs/mobile',
    roles: ['EMPLOYEE']
  },
  {
    label: 'Schedule',
    icon: <ScheduleIcon />,
    path: '/schedule',
    roles: ['OWNER_ADMIN', 'FOREMAN', 'EMPLOYEE']
  },
  {
    label: 'Customers',
    icon: <CustomersIcon />,
    path: '/customers',
    roles: ['OWNER_ADMIN', 'FOREMAN']
  }
]

export default function MobileBottomNav({
  currentPath,
  onNavigate,
  user
}: MobileBottomNavProps) {
  const [quickActionsOpen, setQuickActionsOpen] = useState(false)
  const { hasRole } = useAuth()
  const theme = useTheme()

  // Filter nav items based on user role
  const availableNavItems = bottomNavItems.filter(item =>
    hasRole(item.roles || [])
  )

  const getCurrentValue = () => {
    const activeItem = availableNavItems.find(item =>
      currentPath === item.path || currentPath.startsWith(item.path + '/')
    )
    return activeItem ? availableNavItems.indexOf(activeItem) : 0
  }

  const handleNavChange = (event: React.SyntheticEvent, newValue: number) => {
    const selectedItem = availableNavItems[newValue]
    if (selectedItem) {
      onNavigate(selectedItem.path)
    }
  }

  return (
    <>
      {/* Bottom Navigation */}
      <Paper
        className="fixed bottom-0 left-0 right-0 z-50"
        elevation={8}
        sx={{
          borderTop: 1,
          borderColor: 'divider',
          backgroundColor: 'background.paper',
        }}
      >
        <BottomNavigation
          value={getCurrentValue()}
          onChange={handleNavChange}
          className="h-16"
          sx={{
            '& .MuiBottomNavigationAction-root': {
              minWidth: 0,
              maxWidth: 'none',
              padding: '6px 8px 8px',
              '&.Mui-selected': {
                color: 'primary.main',
                '& .MuiBottomNavigationAction-label': {
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }
              },
              '& .MuiBottomNavigationAction-label': {
                fontSize: '0.6875rem',
                fontWeight: 500,
              }
            }
          }}
        >
          {availableNavItems.map((item, index) => (
            <BottomNavigationAction
              key={item.path}
              label={item.label}
              icon={
                item.badge ? (
                  <Badge badgeContent={item.badge} color="error">
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )
              }
              className="transition-colors duration-200"
            />
          ))}
        </BottomNavigation>
      </Paper>

      {/* Floating Action Button for Quick Actions */}
      {hasRole(['OWNER_ADMIN', 'FOREMAN']) && (
        <Fab
          color="primary"
          className="fixed bottom-20 right-4 z-50"
          onClick={() => setQuickActionsOpen(true)}
          sx={{
            boxShadow: theme.shadows[6],
            '&:hover': {
              transform: 'scale(1.05)',
              transition: 'transform 0.2s ease-in-out'
            }
          }}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Quick Actions Menu */}
      <MobileQuickActions
        open={quickActionsOpen}
        onClose={() => setQuickActionsOpen(false)}
        onNavigate={(path) => {
          onNavigate(path)
          setQuickActionsOpen(false)
        }}
        user={user}
      />
    </>
  )
}