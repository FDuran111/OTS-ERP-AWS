'use client'

import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
  Collapse,
  Badge,
  Avatar,
  Chip,
  useTheme,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  Work as JobsIcon,
  People as CustomersIcon,
  Inventory as MaterialsIcon,
  Receipt as InvoicingIcon,
  Assessment as ReportsIcon,
  Settings as SettingsIcon,
  Schedule as ScheduleIcon,
  AccessTime as TimeIcon,
  Assignment as LeadsIcon,
  ExpandLess,
  ExpandMore,
  Category as CategoriesIcon,
  Photo as PhotoIcon,
  AccountBalance as QuickBooksIcon,
  Logout as LogoutIcon,
  Map as MapIcon,
} from '@mui/icons-material'
import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { UserRole } from '@/lib/auth'

interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

interface ResponsiveSidebarProps {
  open: boolean
  onClose: () => void
  isMobile: boolean
  user: User
}

interface NavItem {
  title: string
  icon: React.ReactElement
  path: string
  badge?: number
  children?: NavItem[]
  roles?: UserRole[]
}

const navigationItems: NavItem[] = [
  {
    title: 'Dashboard',
    icon: <DashboardIcon />,
    path: '/dashboard',
    roles: ['OWNER_ADMIN', 'FOREMAN', 'EMPLOYEE']
  },
  {
    title: 'Jobs',
    icon: <JobsIcon />,
    path: '/jobs',
    roles: ['OWNER_ADMIN', 'FOREMAN', 'EMPLOYEE'],
    children: [
      { title: 'All Jobs', icon: <JobsIcon />, path: '/jobs', roles: ['OWNER_ADMIN', 'FOREMAN'] },
      { title: 'Categories', icon: <CategoriesIcon />, path: '/job-categories', roles: ['OWNER_ADMIN', 'FOREMAN'] },
      { title: 'Photos', icon: <PhotoIcon />, path: '/photo-gallery', roles: ['OWNER_ADMIN', 'FOREMAN'] }
    ]
  },
  {
    title: 'Photo Gallery',
    icon: <PhotoIcon />,
    path: '/photo-gallery',
    roles: ['EMPLOYEE'] // Only show as standalone for employees
  },
  {
    title: 'Schedule',
    icon: <ScheduleIcon />,
    path: '/schedule',
    roles: ['OWNER_ADMIN', 'FOREMAN', 'EMPLOYEE']
  },
  {
    title: 'Time Tracking',
    icon: <TimeIcon />,
    path: '/time',
    roles: ['OWNER_ADMIN', 'FOREMAN', 'EMPLOYEE']
  },
  {
    title: 'Customers',
    icon: <CustomersIcon />,
    path: '/customers',
    roles: ['OWNER_ADMIN', 'FOREMAN']
  },
  {
    title: 'Leads',
    icon: <LeadsIcon />,
    path: '/leads',
    roles: ['OWNER_ADMIN', 'FOREMAN']
  },
  {
    title: 'Materials',
    icon: <MaterialsIcon />,
    path: '/materials',
    roles: ['OWNER_ADMIN', 'FOREMAN', 'EMPLOYEE']
  },
  {
    title: 'Invoicing',
    icon: <InvoicingIcon />,
    path: '/invoicing',
    roles: ['OWNER_ADMIN', 'FOREMAN']
  },
  {
    title: 'Reports',
    icon: <ReportsIcon />,
    path: '/reports',
    roles: ['OWNER_ADMIN', 'FOREMAN'],
    children: [
      { title: 'Overview', icon: <ReportsIcon />, path: '/reports', roles: ['OWNER_ADMIN', 'FOREMAN'] },
      { title: 'Revenue', icon: <ReportsIcon />, path: '/reports/revenue', roles: ['OWNER_ADMIN'] },
      { title: 'Cost Analysis', icon: <ReportsIcon />, path: '/cost-management', roles: ['OWNER_ADMIN'] }
    ]
  },
  {
    title: 'Settings',
    icon: <SettingsIcon />,
    path: '/settings',
    roles: ['OWNER_ADMIN', 'FOREMAN', 'EMPLOYEE']
  }
]

export default function ResponsiveSidebar({
  open,
  onClose,
  isMobile,
  user
}: ResponsiveSidebarProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const theme = useTheme()
  const router = useRouter()
  const pathname = usePathname()
  const { hasRole } = useAuth()

  const handleExpandClick = (title: string) => {
    setExpandedItems(prev =>
      prev.includes(title)
        ? prev.filter(item => item !== title)
        : [...prev, title]
    )
  }

  const handleNavigation = (path: string) => {
    router.push(path)
    if (isMobile) {
      onClose()
    }
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = async () => {
    handleMenuClose()
    try {
      // Call logout API
      await fetch('/api/auth/logout', {
        method: 'POST',
      })
      
      // Clear localStorage
      localStorage.removeItem('auth-token')
      localStorage.removeItem('user')
      
      // Redirect to login
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      // Even if API fails, still clear local data and redirect
      localStorage.removeItem('auth-token')
      localStorage.removeItem('user')
      router.push('/login')
    }
  }

  const isActiveRoute = (path: string) => {
    return pathname === path || pathname.startsWith(path + '/')
  }

  const renderNavItem = (item: NavItem, depth = 0) => {
    // Check if user has access to this nav item
    if (!hasRole(item.roles || [])) {
      return null
    }

    // Filter children based on user roles and special conditions
    let visibleChildren = item.children?.filter(child =>
      hasRole(child.roles || [])
    )
    
    // Add Service Area Analytics for admin@admin.com only in Reports section
    if (item.title === 'Reports' && user.email === 'admin@admin.com' && visibleChildren) {
      visibleChildren = [...visibleChildren, {
        title: 'Service Area Heat Map',
        icon: <MapIcon />,
        path: '/analytics/service-area',
        roles: ['OWNER_ADMIN']
      }]
    }

    // Check if there are visible children
    const hasVisibleChildren = visibleChildren && visibleChildren.length > 0
    const isExpanded = expandedItems.includes(item.title)
    const isActive = isActiveRoute(item.path)

    return (
      <Box key={item.title}>
        <ListItemButton
          onClick={() => {
            if (hasVisibleChildren) {
              handleExpandClick(item.title)
            } else {
              handleNavigation(item.path)
            }
          }}
          className={`
            transition-all duration-200
            ${isActive
              ? 'border-r-4 border-red-500'
              : ''
            }
          `}
          style={{
            backgroundColor: isActive ? 'rgba(229, 62, 62, 0.1)' : 'transparent',
          }}
          sx={{
            pl: 2 + depth * 2,
            py: 1.5,
            borderRadius: depth === 0 ? 1 : 0,
            mx: depth === 0 ? 1 : 0,
            mb: depth === 0 ? 0.5 : 0,
          }}
        >
          <ListItemIcon
            className="min-w-10 mr-3"
            style={{
              color: isActive ? '#E53E3E' : '#A0AEC0'
            }}
          >
            {item.badge ? (
              <Badge badgeContent={item.badge} color="error">
                {item.icon}
              </Badge>
            ) : (
              item.icon
            )}
          </ListItemIcon>
          <ListItemText
            primary={item.title}
            style={{
              color: isActive ? '#E53E3E' : '#CBD5E0'
            }}
            sx={{
              '& .MuiListItemText-primary': {
                fontSize: '0.95rem',
                fontWeight: isActive ? 600 : 500,
              }
            }}
          />
          {hasVisibleChildren && (
            <Box style={{ color: isActive ? '#E53E3E' : '#A0AEC0' }}>
              {isExpanded ? <ExpandLess /> : <ExpandMore />}
            </Box>
          )}
        </ListItemButton>

        {visibleChildren && visibleChildren.length > 0 && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {visibleChildren.map(child => renderNavItem(child, depth + 1))}
            </List>
          </Collapse>
        )}
      </Box>
    )
  }

  const drawerContent = (
    <Box
      className="h-full flex flex-col"
      style={{
        backgroundColor: '#2D3748',
        backgroundImage: 'none',
      }}>
      {/* Header */}
      <Box
        className="p-4 text-white"
        style={{
          background: 'linear-gradient(135deg, #E53E3E 0%, #C53030 100%)',
        }}
      >
        <Typography variant="h6" className="font-bold text-white">
          Ortmeier Technical Service
        </Typography>
        <Typography variant="caption" className="text-blue-100 opacity-90">
          Job Management System
        </Typography>
      </Box>

      {/* Navigation */}
      <Box
        className="flex-1 overflow-auto py-2"
        style={{
          backgroundColor: '#2D3748',
          boxShadow: 'none',
        }}>
        <List disablePadding>
          {navigationItems
            .filter(item => hasRole(item.roles || []))
            .map(item => renderNavItem(item))}
        </List>
      </Box>

      {/* Footer */}
      <Box
        className="p-4 border-t"
        style={{
          borderColor: '#4A5568',
          backgroundColor: '#1A202C',
        }}>
        <Box className="flex items-center mb-3">
          <IconButton
            onClick={handleMenuOpen}
            className="p-0 mr-2"
            sx={{ padding: 0 }}
          >
            <Avatar
              className="w-8 h-8 bg-blue-500 cursor-pointer hover:bg-blue-600 transition-colors"
              sx={{ width: 32, height: 32 }}
            >
              {user.name.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
          <Box className="flex-1 min-w-0">
            <Typography
              variant="body2"
              className="font-medium truncate"
              style={{ color: '#FFFFFF' }}
            >
              {user.name}
            </Typography>
            <Typography
              variant="caption"
              className="capitalize"
              style={{ color: '#A0AEC0' }}
            >
              {user.role.toLowerCase()}
            </Typography>
          </Box>
        </Box>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
        >
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Logout</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  )

  return (
    <Drawer
      variant="temporary"
      anchor="left"
      open={open}
      onClose={onClose}
      ModalProps={{
        keepMounted: true, // Better mobile performance
      }}
      className="transition-all duration-300"
      sx={{
        width: { xs: '80%', sm: 280, md: 256 },
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: { xs: '80%', sm: 280, md: 256 },
          maxWidth: '100vw',
          boxSizing: 'border-box',
          border: 'none',
          backgroundColor: '#2D3748 !important',
          backgroundImage: 'none !important',
          boxShadow: isMobile ? theme.shadows[8] : theme.shadows[2],
          ...(isMobile && {
            marginTop: '64px',
            height: 'calc(100% - 64px)',
          }),
        },
      }}
    >
      {drawerContent}
    </Drawer>
  )
}