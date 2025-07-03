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
  }, [])

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen)
  }
  
  // Debug
  console.log('Sidebar open:', sidebarOpen, 'Mobile:', isMobile)

  if (!user) {
    return null
  }

  return (
    <Box className="flex min-h-screen bg-gray-50 dark:bg-gray-900 w-full overflow-x-hidden" sx={{ width: '100vw', maxWidth: '100vw', border: '3px solid purple' }}>
      {/* Responsive App Bar - Only shows on mobile */}
      {isMobile && (
        <ResponsiveAppBar
          onMenuClick={handleSidebarToggle}
          user={user}
        />
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
        className={`flex flex-col transition-all duration-300 ease-in-out ${
          isMobile ? 'pt-16 pb-16' : ''
        }`}
        sx={{
          flexGrow: 1,
          minHeight: '100vh',
          backgroundColor: 'background.default',
          marginLeft: !isMobile && sidebarOpen ? '256px' : 0,
          marginRight: 0,
          padding: 0,
          paddingTop: 0, // Remove top padding
          transition: 'margin-left 0.3s ease-in-out',
          width: !isMobile && sidebarOpen ? 'calc(100% - 256px)' : '100%',
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Desktop Sidebar Toggle Button - Inside content */}
        {!isMobile && (
          <Tooltip title={sidebarOpen ? "Hide sidebar" : "Show sidebar"} placement="right">
            <IconButton
              onClick={handleSidebarToggle}
              sx={{
                position: 'absolute',
                left: 8,
                top: 16,
                zIndex: theme.zIndex.drawer + 1,
                backgroundColor: 'background.paper',
                boxShadow: 2,
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
        
        {/* Direct children without extra container */}
        {children}
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