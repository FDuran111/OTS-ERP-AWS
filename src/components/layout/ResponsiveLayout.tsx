'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  useTheme,
  useMediaQuery,
} from '@mui/material'
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

  // Auto-open sidebar on desktop
  useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(true)
    }
  }, [isMobile])

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen)
  }

  if (!user) {
    return null
  }

  return (
    <Box className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
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
        className={`
          flex-1 flex flex-col
          ${isMobile ? 'pt-16 pb-16' : ''}
          ${!isMobile && sidebarOpen ? 'md:ml-64' : ''}
          transition-all duration-300 ease-in-out
        `}
        sx={{
          minHeight: '100vh',
          backgroundColor: 'background.default',
          ...(isMobile && {
            paddingTop: '64px', // Account for mobile app bar
            paddingBottom: '64px', // Account for bottom navigation
          }),
          ...(!isMobile && sidebarOpen && {
            marginLeft: '256px', // Account for desktop sidebar
          }),
        }}
      >
        {/* Scrollable Content Container */}
        <Box
          className="flex-1 overflow-auto"
          sx={{
            maxWidth: '100%',
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 2, sm: 3 },
            mx: 'auto',
            width: '100%',
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