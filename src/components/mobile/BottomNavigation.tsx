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

interface BottomNavigationProps {
  onMenuOpen?: () => void
}

const navigationItems = [
  {
    label: 'Dashboard',
    icon: <HomeIcon />,
    value: '/dashboard',
    paths: ['/dashboard', '/']
  },
  {
    label: 'Jobs',
    icon: <JobsIcon />,
    value: '/jobs',
    paths: ['/jobs']
  },
  {
    label: 'Customers',
    icon: <CustomersIcon />,
    value: '/customers',
    paths: ['/customers']
  },
  {
    label: 'Routes',
    icon: <RouteIcon />,
    value: '/route-optimization',
    paths: ['/route-optimization']
  },
  {
    label: 'Menu',
    icon: <MenuIcon />,
    value: 'menu',
    paths: []
  }
]

export default function BottomNavigation({ onMenuOpen }: BottomNavigationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const theme = useTheme()

  // Determine current value based on pathname
  const getCurrentValue = () => {
    for (const item of navigationItems) {
      if (item.paths.some(path => pathname === path || pathname.startsWith(path + '/'))) {
        return item.value
      }
    }
    return navigationItems[0].value // Default to dashboard
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
        {navigationItems.map((item) => (
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