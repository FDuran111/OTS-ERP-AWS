'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MobileTimeClock from '@/components/time-tracking/MobileTimeClock'
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton,
  Container
} from '@mui/material'
import { ArrowBack as BackIcon, Computer as DesktopIcon } from '@mui/icons-material'

interface User {
  id: string
  email: string
  name: string
  role: string
}

export default function MobileTimeClockPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/login')
      return
    }
    setUser(JSON.parse(storedUser))
    setLoading(false)
  }, [router])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Loading...</Typography>
      </Box>
    )
  }

  if (!user) return null

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Mobile Header */}
      <AppBar position="fixed" sx={{ bgcolor: 'primary.main' }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => router.push('/time')}
            sx={{ mr: 2 }}
          >
            <BackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Mobile Time Clock
          </Typography>
          <IconButton
            color="inherit"
            onClick={() => router.push('/time')}
            title="Switch to Desktop View"
          >
            <DesktopIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="sm" sx={{ pt: 10, pb: 3 }}>
        <MobileTimeClock 
          userId={user.id} 
          userName={user.name} 
        />
      </Container>
    </Box>
  )
}