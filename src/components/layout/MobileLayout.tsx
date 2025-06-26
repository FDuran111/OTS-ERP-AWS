'use client'

import { useState, useEffect } from 'react'
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Box,
  Badge,
  Fab,
  useTheme,
  useMediaQuery,
  Divider,
  Avatar,
  Menu,
  MenuItem,
  Collapse,
  Chip,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  Work as JobsIcon,
  People as CustomersIcon,
  Inventory as MaterialsIcon,
  Route as RouteIcon,
  Assessment as ReportsIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Add as AddIcon,
  ExpandLess,
  ExpandMore,
  Dashboard as DashboardIcon,
  AccountCircle as ProfileIcon,
  Logout as LogoutIcon,
  Assignment as LeadsIcon,
  Category as CategoriesIcon,
  Photo as PhotoIcon,
  AccountBalance as QuickBooksIcon,
  Person as CustomerPortalIcon,
  Speed as OptimizeIcon,
} from '@mui/icons-material'
import { useRouter, usePathname } from 'next/navigation'

interface MobileLayoutProps {
  children: React.ReactNode
}

interface NavItem {
  title: string
  icon: React.ReactElement
  path: string
  badge?: number
  children?: NavItem[]
}

const navigationItems: NavItem[] = [
  {
    title: 'Dashboard',
    icon: <DashboardIcon />,
    path: '/dashboard'
  },
  {
    title: 'Jobs',
    icon: <JobsIcon />,
    path: '/jobs',
    children: [
      { title: 'All Jobs', icon: <JobsIcon />, path: '/jobs' },
      { title: 'Categories', icon: <CategoriesIcon />, path: '/job-categories' },
      { title: 'Photos', icon: <PhotoIcon />, path: '/job-photos' }
    ]
  },
  {
    title: 'Customers',
    icon: <CustomersIcon />,
    path: '/customers'
  },
  {
    title: 'Leads',
    icon: <LeadsIcon />,
    path: '/leads'
  },
  {
    title: 'Materials',
    icon: <MaterialsIcon />,
    path: '/materials'
  },
  {
    title: 'Routes',
    icon: <RouteIcon />,
    path: '/route-optimization'
  },
  {
    title: 'Reports',
    icon: <ReportsIcon />,
    path: '/reports',
    children: [
      { title: 'P&L by Job', icon: <ReportsIcon />, path: '/reports/pnl' },
      { title: 'Cost Analysis', icon: <ReportsIcon />, path: '/reports/cost-analysis' },
      { title: 'Equipment Billing', icon: <ReportsIcon />, path: '/reports/equipment' }
    ]
  },
  {
    title: 'Settings',
    icon: <SettingsIcon />,
    path: '/settings',
    children: [
      { title: 'General', icon: <SettingsIcon />, path: '/settings' },
      { title: 'QuickBooks', icon: <QuickBooksIcon />, path: '/settings/quickbooks' },
      { title: 'Integrations', icon: <SettingsIcon />, path: '/settings/integrations' }
    ]
  }
]

const quickActions = [
  { title: 'Add Job', icon: <JobsIcon />, path: '/jobs/new', color: 'primary' as const },
  { title: 'Add Customer', icon: <CustomersIcon />, path: '/customers/new', color: 'secondary' as const },
  { title: 'Add Lead', icon: <LeadsIcon />, path: '/leads/new', color: 'success' as const },
  { title: 'Optimize Routes', icon: <OptimizeIcon />, path: '/route-optimization', color: 'warning' as const }
]

export default function MobileLayout({ children }: MobileLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null)
  const [quickActionMenuOpen, setQuickActionMenuOpen] = useState(false)
  const [notificationCount, setNotificationCount] = useState(3) // Mock notification count
  
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const router = useRouter()
  const pathname = usePathname()

  // Auto-close drawer on route change for mobile
  useEffect(() => {
    if (isMobile) {
      setDrawerOpen(false)
    }
  }, [pathname, isMobile])

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen)
  }

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
      setDrawerOpen(false)
    }
  }

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setProfileMenuAnchor(event.currentTarget)
  }

  const handleProfileMenuClose = () => {
    setProfileMenuAnchor(null)
  }

  const isActiveRoute = (path: string) => {
    return pathname === path || pathname.startsWith(path + '/')
  }

  const renderNavItem = (item: NavItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.title)
    const isActive = isActiveRoute(item.path)

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
          sx={{
            pl: 2 + depth * 2,
            backgroundColor: isActive ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
            borderRight: isActive ? `3px solid ${theme.palette.primary.main}` : 'none'
          }}
        >
          <ListItemIcon sx={{ color: isActive ? 'primary.main' : 'inherit' }}>
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
            sx={{ 
              '& .MuiListItemText-primary': {
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'primary.main' : 'inherit'
              }
            }}
          />
          {hasChildren && (isExpanded ? <ExpandLess /> : <ExpandMore />)}
        </ListItemButton>
        
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children?.map(child => renderNavItem(child, depth + 1))}
            </List>
          </Collapse>
        )}
      </Box>
    )
  }

  const drawerContent = (
    <Box sx={{ width: 280, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, backgroundColor: 'primary.main', color: 'white' }}>
        <Typography variant="h6" fontWeight="bold">
          Ortmeier Electric
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          Job Management System
        </Typography>
      </Box>

      {/* Navigation */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <List disablePadding>
          {navigationItems.map(item => renderNavItem(item))}
        </List>
      </Box>

      {/* Footer */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Avatar sx={{ width: 32, height: 32, mr: 1 }}>
            <ProfileIcon />
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body2" fontWeight="medium">
              Admin User
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Administrator
            </Typography>
          </Box>
        </Box>
        <Chip
          icon={<CustomerPortalIcon />}
          label="Customer Portal"
          size="small"
          variant="outlined"
          onClick={() => handleNavigation('/customer-portal')}
          sx={{ mr: 1 }}
        />
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Mobile App Bar */}
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: theme.zIndex.drawer + 1,
          display: { xs: 'block', md: isMobile ? 'block' : 'none' }
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Ortmeier Electric
          </Typography>

          <IconButton color="inherit" onClick={() => router.push('/notifications')}>
            <Badge badgeContent={notificationCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          <IconButton color="inherit" onClick={handleProfileMenuOpen}>
            <ProfileIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        anchor="left"
        open={isMobile ? drawerOpen : true}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
            boxSizing: 'border-box',
            ...(isMobile && {
              marginTop: '64px', // Account for app bar
              height: 'calc(100% - 64px)'
            })
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: isMobile ? '64px' : 0, // Account for app bar on mobile
          pl: isMobile ? 0 : '280px', // Account for persistent drawer on desktop
          minHeight: '100vh',
          backgroundColor: 'grey.50'
        }}
      >
        {children}
      </Box>

      {/* Mobile Quick Action FAB */}
      {isMobile && (
        <Fab
          color="primary"
          aria-label="add"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: theme.zIndex.fab
          }}
          onClick={() => setQuickActionMenuOpen(true)}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Quick Action Menu */}
      {quickActionMenuOpen && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 16,
            zIndex: theme.zIndex.fab + 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}
        >
          {quickActions.map((action, index) => (
            <Fab
              key={action.title}
              size="small"
              color={action.color}
              onClick={() => {
                handleNavigation(action.path)
                setQuickActionMenuOpen(false)
              }}
              sx={{
                animation: `fadeInUp 0.3s ease-out ${index * 0.1}s both`,
                '@keyframes fadeInUp': {
                  '0%': {
                    opacity: 0,
                    transform: 'translateY(20px)'
                  },
                  '100%': {
                    opacity: 1,
                    transform: 'translateY(0)'
                  }
                }
              }}
            >
              {action.icon}
            </Fab>
          ))}
          <Fab
            size="small"
            color="default"
            onClick={() => setQuickActionMenuOpen(false)}
            sx={{ mt: 1 }}
          >
            <ExpandLess />
          </Fab>
        </Box>
      )}

      {/* Mobile backdrop for quick actions */}
      {quickActionMenuOpen && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: theme.zIndex.fab,
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }}
          onClick={() => setQuickActionMenuOpen(false)}
        />
      )}

      {/* Profile Menu */}
      <Menu
        anchorEl={profileMenuAnchor}
        open={Boolean(profileMenuAnchor)}
        onClose={handleProfileMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={() => { handleNavigation('/profile'); handleProfileMenuClose() }}>
          <ListItemIcon>
            <ProfileIcon fontSize="small" />
          </ListItemIcon>
          Profile
        </MenuItem>
        <MenuItem onClick={() => { handleNavigation('/settings'); handleProfileMenuClose() }}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          Settings
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleProfileMenuClose}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </Box>
  )
}