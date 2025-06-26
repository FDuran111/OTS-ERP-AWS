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
  Person as CustomerPortalIcon,
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
    roles: ['OWNER', 'ADMIN', 'OFFICE', 'TECHNICIAN', 'VIEWER']
  },
  {
    title: 'Jobs',
    icon: <JobsIcon />,
    path: '/jobs',
    roles: ['OWNER', 'ADMIN', 'OFFICE', 'TECHNICIAN', 'VIEWER'],
    children: [
      { title: 'All Jobs', icon: <JobsIcon />, path: '/jobs', roles: ['OWNER', 'ADMIN', 'OFFICE', 'TECHNICIAN', 'VIEWER'] },
      { title: 'Categories', icon: <CategoriesIcon />, path: '/job-categories', roles: ['OWNER', 'ADMIN', 'OFFICE'] },
      { title: 'Photos', icon: <PhotoIcon />, path: '/photo-gallery', roles: ['OWNER', 'ADMIN', 'OFFICE', 'TECHNICIAN'] }
    ]
  },
  {
    title: 'Schedule',
    icon: <ScheduleIcon />,
    path: '/schedule',
    roles: ['OWNER', 'ADMIN', 'OFFICE', 'TECHNICIAN']
  },
  {
    title: 'Time Tracking',
    icon: <TimeIcon />,
    path: '/time',
    roles: ['OWNER', 'ADMIN', 'OFFICE', 'TECHNICIAN']
  },
  {
    title: 'Customers',
    icon: <CustomersIcon />,
    path: '/customers',
    roles: ['OWNER', 'ADMIN', 'OFFICE']
  },
  {
    title: 'Leads',
    icon: <LeadsIcon />,
    path: '/leads',
    roles: ['OWNER', 'ADMIN', 'OFFICE']
  },
  {
    title: 'Materials',
    icon: <MaterialsIcon />,
    path: '/materials',
    roles: ['OWNER', 'ADMIN', 'OFFICE', 'TECHNICIAN']
  },
  {
    title: 'Invoicing',
    icon: <InvoicingIcon />,
    path: '/invoicing',
    roles: ['OWNER', 'ADMIN', 'OFFICE']
  },
  {
    title: 'Reports',
    icon: <ReportsIcon />,
    path: '/reports',
    roles: ['OWNER', 'ADMIN', 'OFFICE'],
    children: [
      { title: 'Overview', icon: <ReportsIcon />, path: '/reports', roles: ['OWNER', 'ADMIN', 'OFFICE'] },
      { title: 'Revenue', icon: <ReportsIcon />, path: '/reports/revenue', roles: ['OWNER', 'ADMIN'] },
      { title: 'Cost Analysis', icon: <ReportsIcon />, path: '/cost-management', roles: ['OWNER', 'ADMIN', 'OFFICE'] }
    ]
  },
  {
    title: 'Settings',
    icon: <SettingsIcon />,
    path: '/settings',
    roles: ['OWNER', 'ADMIN', 'OFFICE'],
    children: [
      { title: 'General', icon: <SettingsIcon />, path: '/settings', roles: ['OWNER', 'ADMIN', 'OFFICE'] },
      { title: 'QuickBooks', icon: <QuickBooksIcon />, path: '/settings/quickbooks', roles: ['OWNER', 'ADMIN'] }
    ]
  }
]

export default function ResponsiveSidebar({
  open,
  onClose,
  isMobile,
  user
}: ResponsiveSidebarProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>([])
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

  const isActiveRoute = (path: string) => {
    return pathname === path || pathname.startsWith(path + '/')
  }

  const renderNavItem = (item: NavItem, depth = 0) => {
    // Check if user has access to this nav item
    if (!hasRole(item.roles || [])) {
      return null
    }

    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.title)
    const isActive = isActiveRoute(item.path)

    // Filter children based on user roles
    const visibleChildren = item.children?.filter(child =>
      hasRole(child.roles || [])
    )

    return (
      <Box key={item.title}>
        <ListItemButton
          onClick={() => {
            if (hasChildren) {
              handleExpandClick(item.title)
            } else {
              handleNavigation(item.path)
            }
          }}
          className={`
            transition-all duration-200
            ${isActive
              ? 'bg-blue-50 dark:bg-blue-900/20 border-r-4 border-blue-500'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }
          `}
          sx={{
            pl: 2 + depth * 2,
            py: 1.5,
            borderRadius: depth === 0 ? 1 : 0,
            mx: depth === 0 ? 1 : 0,
            mb: depth === 0 ? 0.5 : 0,
          }}
        >
          <ListItemIcon
            className={`
              min-w-10 mr-3
              ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}
            `}
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
            className={`
              ${isActive
                ? 'text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-gray-700 dark:text-gray-300'
              }
            `}
            sx={{
              '& .MuiListItemText-primary': {
                fontSize: '0.95rem',
                fontWeight: isActive ? 600 : 500,
              }
            }}
          />
          {hasChildren && (
            <Box className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}>
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
    <Box className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <Box
        className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white"
        sx={{
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
        }}
      >
        <Typography variant="h6" className="font-bold text-white">
          Ortmeier Electric
        </Typography>
        <Typography variant="caption" className="text-blue-100 opacity-90">
          Job Management System
        </Typography>
      </Box>

      {/* Navigation */}
      <Box className="flex-1 overflow-auto py-2">
        <List disablePadding>
          {navigationItems
            .filter(item => hasRole(item.roles || []))
            .map(item => renderNavItem(item))}
        </List>
      </Box>

      {/* Footer */}
      <Box className="p-4 border-t border-gray-200 dark:border-gray-700">
        <Box className="flex items-center mb-3">
          <Avatar
            className="w-8 h-8 mr-2 bg-blue-500"
            sx={{ width: 32, height: 32 }}
          >
            {user.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box className="flex-1 min-w-0">
            <Typography
              variant="body2"
              className="font-medium text-gray-900 dark:text-gray-100 truncate"
            >
              {user.name}
            </Typography>
            <Typography
              variant="caption"
              className="text-gray-500 dark:text-gray-400 capitalize"
            >
              {user.role.toLowerCase()}
            </Typography>
          </Box>
        </Box>
        <Chip
          icon={<CustomerPortalIcon />}
          label="Customer Portal"
          size="small"
          variant="outlined"
          onClick={() => handleNavigation('/customer-portal')}
          className="w-full"
          sx={{
            '& .MuiChip-label': {
              width: '100%',
              justifyContent: 'center'
            }
          }}
        />
      </Box>
    </Box>
  )

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'persistent'}
      anchor="left"
      open={open}
      onClose={onClose}
      ModalProps={{
        keepMounted: true, // Better mobile performance
      }}
      className="transition-all duration-300"
      sx={{
        width: 256,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 256,
          boxSizing: 'border-box',
          border: 'none',
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