'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  useTheme,
  useMediaQuery,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  Menu as MenuIcon,
  MenuOpen as MenuOpenIcon,
} from '@mui/icons-material'
import { useAuth } from '@/hooks/useAuth'
import { useRouter, usePathname } from 'next/navigation'
import ResponsiveSidebar from './ResponsiveSidebar'
import MobileBottomNav from './MobileBottomNav'
import ResponsiveAppBar from './ResponsiveAppBar'

interface ResponsiveLayoutProps {
  children: React.ReactNode
}

export default function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Auto-close sidebar on route change for mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false)
    }
  }, [pathname, isMobile])

  // Keep sidebar closed by default on all screen sizes
  useEffect(() => {
    setSidebarOpen(false)
  }, [isMobile])

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen)
  }

  if (!user) {
    return null
  }

  return (
    <Box className="flex min-h-screen bg-gray-50 dark:bg-gray-900 w-full overflow-x-hidden">
      {/* Responsive App Bar - Only shows on mobile */}
      {isMobile && (
        <ResponsiveAppBar
          onMenuClick={handleSidebarToggle}
          user={user}
        />
      )}

      {/* Desktop Sidebar Toggle Button */}
      {!isMobile && (
        <Tooltip title={sidebarOpen ? "Hide sidebar" : "Show sidebar"} placement="right">
          <IconButton
            onClick={handleSidebarToggle}
            sx={{
              position: 'fixed',
              left: sidebarOpen ? 268 : 16,
              top: 16,
              zIndex: theme.zIndex.drawer + 1,
              backgroundColor: 'background.paper',
              boxShadow: 2,
              transition: 'left 0.3s ease-in-out',
              '&:hover': {
                backgroundColor: 'action.hover',
                transform: 'scale(1.05)',
              },
            }}
          >
            {sidebarOpen ? <MenuOpenIcon /> : <MenuIcon />}
          </IconButton>
        </Tooltip>
      )}

      {/* Responsive Sidebar */}
      <ResponsiveSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isMobile={isMobile}
        user={user}
      />

      {/* Main Content Area */}
      <Box
        component="main"
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out w-full ${
          isMobile ? 'pt-16 pb-16' : 'pt-4'
        }`}
        sx={{
          minHeight: '100vh',
          backgroundColor: 'background.default',
          marginLeft: !isMobile && sidebarOpen ? '256px' : 0,
          transition: 'margin-left 0.3s ease-in-out',
        }}
      >
        {/* Scrollable Content Container */}
        <Box
          className="flex-1 w-full overflow-y-auto overflow-x-hidden"
          sx={{
            pl: !isMobile && !sidebarOpen ? 7 : 0,
            transition: 'padding-left 0.3s ease-in-out',
          }}
        >
          {children}
        </Box>
      </Box>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <MobileBottomNav
          currentPath={pathname}
          onNavigate={(path) => router.push(path)}
          user={user}
        />
      )}

      {/* Overlay for mobile sidebar */}
      {isMobile && sidebarOpen && (
        <Box
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
          sx={{ zIndex: theme.zIndex.drawer - 1 }}
        />
      )}
    </Box>
  )
}