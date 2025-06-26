'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  CircularProgress,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material'
import {
  Construction as ConstructionIcon,
  AccountCircle,
  Logout,
  Assignment as AssignmentIcon,
  Receipt as ReceiptIcon,
  Schedule as ScheduleIcon,
  PhotoLibrary as PhotoLibraryIcon,
} from '@mui/icons-material'

interface CustomerUser {
  id: string
  customerId: string
  email: string
  firstName?: string
  lastName?: string
}

export default function CustomerDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<CustomerUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  // Check authentication on component mount
  useEffect(() => {
    const token = localStorage.getItem('customer-token')
    const userData = localStorage.getItem('customer-user')

    if (!token || !userData) {
      router.push('/customer-portal/login')
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
    } catch (err) {
      console.error('Error parsing user data:', err)
      router.push('/customer-portal/login')
      return
    }

    setLoading(false)
  }, [router])

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('customer-token')
      if (token) {
        await fetch('/api/customer-portal/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
      }
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      localStorage.removeItem('customer-token')
      localStorage.removeItem('customer-user')
      router.push('/customer-portal/login')
    }
  }

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={60} />
      </Box>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <AppBar position="static" sx={{ backgroundColor: '#e14eca' }}>
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <ConstructionIcon sx={{ mr: 2 }} />
            <Typography variant="h6" component="div">
              Ortmeier Tech - Customer Portal
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2">
              Welcome, {user.firstName || user.email}
            </Typography>
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls="primary-search-account-menu"
              aria-haspopup="true"
              onClick={handleMenuOpen}
              color="inherit"
            >
              <AccountCircle />
            </IconButton>
            <Menu
              id="primary-search-account-menu"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={handleLogout}>
                <Logout sx={{ mr: 1 }} />
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Welcome Section */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            Welcome to Your Project Portal
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Stay updated on your construction projects, view invoices, and communicate with our team.
          </Typography>
        </Paper>

        {/* Feature Cards */}
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', cursor: 'pointer', '&:hover': { boxShadow: 4 } }}>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <AssignmentIcon sx={{ fontSize: 48, color: '#e14eca', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Project Status
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  View current project progress and milestones
                </Typography>
                <Chip label="Coming Soon" size="small" variant="outlined" />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', cursor: 'pointer', '&:hover': { boxShadow: 4 } }}>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <ScheduleIcon sx={{ fontSize: 48, color: '#e14eca', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Timeline
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Track project timeline and upcoming tasks
                </Typography>
                <Chip label="Coming Soon" size="small" variant="outlined" />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', cursor: 'pointer', '&:hover': { boxShadow: 4 } }}>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <PhotoLibraryIcon sx={{ fontSize: 48, color: '#e14eca', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Photo Gallery
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  View progress photos and documentation
                </Typography>
                <Chip label="Coming Soon" size="small" variant="outlined" />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', cursor: 'pointer', '&:hover': { boxShadow: 4 } }}>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <ReceiptIcon sx={{ fontSize: 48, color: '#e14eca', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Invoices
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  View and pay invoices online
                </Typography>
                <Chip label="Coming Soon" size="small" variant="outlined" />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Placeholder Content */}
        <Paper sx={{ p: 3, mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Recent Activity
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No recent activity to display. Check back soon for updates on your projects.
          </Typography>
        </Paper>
      </Container>
    </Box>
  )
}