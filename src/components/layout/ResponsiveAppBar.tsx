'use client'

import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Badge,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
  Box,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  AccountCircle as ProfileIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
} from '@mui/icons-material'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@mui/material/styles'
import { UserRole } from '@/lib/auth'

interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

interface ResponsiveAppBarProps {
  onMenuClick: () => void
  user: User
}

export default function ResponsiveAppBar({
  onMenuClick,
  user
}: ResponsiveAppBarProps) {
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null)
  const [notificationCount] = useState(3) // Mock notification count
  const router = useRouter()
  const theme = useTheme()

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setProfileMenuAnchor(event.currentTarget)
  }

  const handleProfileMenuClose = () => {
    setProfileMenuAnchor(null)
  }

  const handleNavigation = (path: string) => {
    router.push(path)
    handleProfileMenuClose()
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      localStorage.removeItem('user')
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
    handleProfileMenuClose()
  }

  return (
    <>
      <AppBar
        position="fixed"
        className="z-50"
        sx={{
          backgroundColor: 'background.paper',
          color: 'text.primary',
          boxShadow: theme.shadows[2],
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Toolbar className="min-h-16">
          {/* Menu Button */}
          <IconButton
            edge="start"
            color="inherit"
            aria-label="open drawer"
            onClick={onMenuClick}
            className="mr-2 text-gray-700 dark:text-gray-300"
          >
            <MenuIcon />
          </IconButton>

          {/* Title */}
          <Typography
            variant="h6"
            noWrap
            component="div"
            className="flex-1 font-semibold text-gray-900 dark:text-gray-100"
          >
            Ortmeier Electric
          </Typography>

          {/* Notifications */}
          <IconButton
            color="inherit"
            onClick={() => router.push('/notifications')}
            className="mr-2 text-gray-700 dark:text-gray-300"
          >
            <Badge
              badgeContent={notificationCount}
              color="error"
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.75rem',
                  minWidth: '18px',
                  height: '18px'
                }
              }}
            >
              <NotificationsIcon />
            </Badge>
          </IconButton>

          {/* Profile Menu */}
          <IconButton
            edge="end"
            color="inherit"
            onClick={handleProfileMenuOpen}
            className="text-gray-700 dark:text-gray-300"
          >
            <Avatar
              className="w-8 h-8 bg-blue-500 text-white"
              sx={{
                width: 32,
                height: 32,
                backgroundColor: 'primary.main',
                fontSize: '0.875rem',
                fontWeight: 600
              }}
            >
              {user.name.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

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
        className="mt-2"
        PaperProps={{
          className: 'min-w-48',
          sx: {
            boxShadow: theme.shadows[8],
            border: 1,
            borderColor: 'divider',
          }
        }}
      >
        {/* User Info */}
        <Box className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <Typography variant="body2" className="font-medium text-gray-900 dark:text-gray-100">
            {user.name}
          </Typography>
          <Typography variant="caption" className="text-gray-500 dark:text-gray-400 capitalize">
            {user.role.toLowerCase()}
          </Typography>
          <Typography variant="caption" className="block text-gray-500 dark:text-gray-400">
            {user.email}
          </Typography>
        </Box>

        {/* Menu Items */}
        <MenuItem
          onClick={() => handleNavigation('/profile')}
          className="py-3"
        >
          <ListItemIcon>
            <ProfileIcon fontSize="small" className="text-gray-600 dark:text-gray-400" />
          </ListItemIcon>
          <Typography variant="body2">Profile</Typography>
        </MenuItem>

        <MenuItem
          onClick={() => handleNavigation('/settings')}
          className="py-3"
        >
          <ListItemIcon>
            <SettingsIcon fontSize="small" className="text-gray-600 dark:text-gray-400" />
          </ListItemIcon>
          <Typography variant="body2">Settings</Typography>
        </MenuItem>

        <Divider />

        <MenuItem
          onClick={handleLogout}
          className="py-3 text-red-600 dark:text-red-400"
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" className="text-red-600 dark:text-red-400" />
          </ListItemIcon>
          <Typography variant="body2">Logout</Typography>
        </MenuItem>
      </Menu>
    </>
  )
}