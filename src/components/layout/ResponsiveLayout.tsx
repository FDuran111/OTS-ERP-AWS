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
  const { user, loading } = useAuth()
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

  // Show loading spinner while auth is being verified
  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh',
          backgroundColor: 'background.default'
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Box 
            sx={{ 
              width: 40, 
              height: 40, 
              border: '3px solid',
              borderColor: 'divider',
              borderTopColor: 'primary.main',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto',
              '@keyframes spin': {
                '0%': { transform: 'rotate(0deg)' },
                '100%': { transform: 'rotate(360deg)' }
              }
            }} 
          />
        </Box>
      </Box>
    )
  }
  
  if (!user) {
    return null
  }

  return (
    <Box className="min-h-screen bg-gray-50 dark:bg-gray-900 w-full overflow-x-hidden responsive-layout" sx={{ width: '100vw', maxWidth: '100vw', position: 'relative' }}>
      {/* Responsive App Bar - Only shows on mobile */}
      {isMobile && (
        <ResponsiveAppBar
          onMenuClick={handleSidebarToggle}
          user={user}
        />
      )}

      {/* Content wrapper for sidebar and main content */}
      <Box sx={{ display: 'flex', width: '100%', minHeight: '100vh' }}>
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
          className={`flex flex-col transition-all duration-300 ease-in-out main-content-area`}
          sx={{
            flexGrow: 1,
            minHeight: '100vh',
            backgroundColor: 'background.default',
            marginLeft: 0,
            marginRight: 0,
            padding: 0,
            paddingTop: isMobile ? '64px' : 0, // Header height on mobile
            paddingBottom: isMobile ? '56px' : 0, // Bottom nav height on mobile
            transition: 'margin-left 0.3s ease-in-out',
            width: '100%',
            maxWidth: '100%',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden', // Prevent content from showing outside
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