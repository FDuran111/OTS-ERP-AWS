'use client'

import { useState } from 'react'
import {
  BottomNavigation as MuiBottomNavigation,
  BottomNavigationAction,
  Badge,
  Paper,
  useTheme,
  alpha,
} from '@mui/material'
import {
  Home as HomeIcon,
  Work as JobsIcon,
  People as CustomersIcon,
  Route as RouteIcon,
  Menu as MenuIcon,
} from '@mui/icons-material'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { UserRole } from '@/lib/auth'

interface BottomNavigationProps {
  onMenuOpen?: () => void
}

const navigationItems = [
  {
    label: 'Dashboard',
    icon: <HomeIcon />,
    value: '/dashboard',
    paths: ['/dashboard', '/'],
    roles: ['OWNER_ADMIN', 'FOREMAN', 'EMPLOYEE'] as UserRole[]
  },
  {
    label: 'Jobs',
    icon: <JobsIcon />,
    value: '/jobs',
    paths: ['/jobs'],
    roles: ['OWNER_ADMIN', 'FOREMAN', 'EMPLOYEE'] as UserRole[]
  },
  {
    label: 'Admin',
    icon: <CustomersIcon />,
    value: '/admin',
    paths: ['/admin', '/analytics', '/leads', '/reports'],
    roles: ['OWNER_ADMIN', 'FOREMAN'] as UserRole[] // Admin features for management
  },
  {
    label: 'Routes',
    icon: <RouteIcon />,
    value: '/route-optimization',
    paths: ['/route-optimization'],
    roles: ['OWNER_ADMIN', 'FOREMAN'] as UserRole[] // Only staff can access route optimization
  },
  {
    label: 'Menu',
    icon: <MenuIcon />,
    value: 'menu',
    paths: [],
    roles: ['OWNER_ADMIN', 'FOREMAN', 'EMPLOYEE'] as UserRole[] // Everyone can access menu
  }
]

export default function BottomNavigation({ onMenuOpen }: BottomNavigationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const theme = useTheme()
  const { user, hasRole } = useAuth()

  // Filter navigation items based on user role
  const visibleItems = navigationItems.filter(item => {
    if (!user) return false
    return hasRole(item.roles)
  })

  // Determine current value based on pathname
  const getCurrentValue = () => {
    for (const item of visibleItems) {
      if (item.paths.some(path => pathname === path || pathname.startsWith(path + '/'))) {
        return item.value
      }
    }
    return visibleItems[0]?.value || '/dashboard' // Default to dashboard or first available item
  }

  const handleChange = (event: React.SyntheticEvent, newValue: string) => {
    if (newValue === 'menu') {
      if (onMenuOpen) {
        onMenuOpen()
      }
    } else {
      router.push(newValue)
    }
  }

  // Don't render if user has no access to any navigation items
  if (!user || visibleItems.length === 0) {
    return null
  }

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: theme.zIndex.appBar,
        borderTop: 1,
        borderColor: 'divider',
        background: alpha(theme.palette.background.paper, 0.95),
        backdropFilter: 'blur(8px)',
      }}
      elevation={8}
    >
      <MuiBottomNavigation
        value={getCurrentValue()}
        onChange={handleChange}
        sx={{
          backgroundColor: 'transparent',
          '& .MuiBottomNavigationAction-root': {
            minWidth: 'auto',
            padding: theme.spacing(0.5, 1),
            '&.Mui-selected': {
              color: 'primary.main',
              '& .MuiBottomNavigationAction-label': {
                fontSize: '0.75rem',
                fontWeight: 600
              }
            },
            '& .MuiBottomNavigationAction-label': {
              fontSize: '0.7rem',
              fontWeight: 400,
              marginTop: 2
            }
          }
        }}
      >
        {visibleItems.map((item) => (
          <BottomNavigationAction
            key={item.value}
            label={item.label}
            value={item.value}
            icon={
              item.label === 'Jobs' ? (
                <Badge badgeContent={0} color="error" max={99}>
                  {item.icon}
                </Badge>
              ) : (
                item.icon
              )
            }
          />
        ))}
      </MuiBottomNavigation>
    </Paper>
  )
}