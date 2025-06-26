'use client'

// Force dynamic rendering to prevent caching issues
export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  Stack,
  Grid,
  Button,
  useTheme,
  useMediaQuery,
  Paper,
} from '@mui/material'
import {
  Work as WorkIcon,
  AttachMoney,
  AccessTime,
  Group,
  TrendingUp,
  ShoppingCart as PurchaseOrderIcon,
  Add as AddIcon,
  Home as HomeIcon,
} from '@mui/icons-material'
import ResponsiveLayout from '@/components/layout/ResponsiveLayout'
import ResponsiveContainer from '@/components/layout/ResponsiveContainer'
import LowStockNotification from '@/components/notifications/LowStockNotification'


interface User {
  id: string
  email: string
  name: string
  role: string
}

interface Stat {
  title: string
  value: string
  change?: string
  subtitle?: string
  icon: string
  color: string
}

interface RecentJob {
  id: string
  title: string
  customer: string
  status: string
  updatedAt: string
}

interface PhaseData {
  summary: {
    UG: { NOT_STARTED: number, IN_PROGRESS: number, COMPLETED: number }
    RI: { NOT_STARTED: number, IN_PROGRESS: number, COMPLETED: number }
    FN: { NOT_STARTED: number, IN_PROGRESS: number, COMPLETED: number }
  }
  totalPhases: number
  completedPhases: number
  inProgressPhases: number
  completionRate: number
  recentUpdates: Array<{
    id: string
    phaseName: string
    status: string
    jobNumber: string
    customer: string
    updatedAt: string
  }>
}

// Icon mapping for stats
const iconMap = {
  'work': WorkIcon,
  'access_time': AccessTime,
  'attach_money': AttachMoney,
  'pending_actions': Group,
  'shopping_cart': PurchaseOrderIcon,
}

const colorMap = {
  'primary': '#E53E3E', // Ortmeier red
  'success': '#68D391', // Success green
  'warning': '#F6E05E', // Safety yellow
  'info': '#63B3ED', // Info blue
}


export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<Stat[]>([])
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([])
  const [phaseData, setPhaseData] = useState<PhaseData | null>(null)
  const [loading, setLoading] = useState(true)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  useEffect(() => {
    const verifyAuth = async () => {
      // First check localStorage
      const storedUser = localStorage.getItem('user')
      if (!storedUser) {
        console.log('No user in localStorage, redirecting to login')
        router.push('/login')
        return
      }
      
      // Verify authentication with server
      try {
        const response = await fetch('/api/auth/me')
        if (!response.ok) {
          console.log('Auth verification failed, redirecting to login')
          localStorage.removeItem('user')
          router.push('/login')
          return
        }
        
        const userData = await response.json()
        setUser(userData)
        localStorage.setItem('user', JSON.stringify(userData))
        fetchDashboardData()
      } catch (error) {
        console.error('Auth check error:', error)
        localStorage.removeItem('user')
        router.push('/login')
      }
    }
    
    verifyAuth()
  }, [router])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [statsResponse, phasesResponse] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/dashboard/phases')
      ])
      
      if (!statsResponse.ok) {
        throw new Error('Failed to fetch dashboard data')
      }
      
      const statsData = await statsResponse.json()
      
      // Transform stats with icons
      const transformedStats = statsData.stats.map((stat: any) => ({
        ...stat,
        icon: iconMap[stat.icon as keyof typeof iconMap] || WorkIcon,
        color: colorMap[stat.color as keyof typeof colorMap] || '#E53E3E',
      }))
      
      setStats(transformedStats)
      setRecentJobs(statsData.recentJobs)
      
      if (phasesResponse.ok) {
        const phasesData = await phasesResponse.json()
        setPhaseData(phasesData)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickAction = (path: string) => {
    router.push(path)
  }

  if (!user) return null

  // Quick action buttons for mobile and desktop
  const quickActions = (
    <Stack 
      direction={isMobile ? 'column' : 'row'} 
      spacing={2} 
      sx={{
        width: { xs: '100%', md: 'auto' },
        alignItems: { xs: 'stretch', md: 'center' }
      }}
    >
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => handleQuickAction('/jobs/new')}
        sx={{
          width: { xs: '100%', md: 'auto' },
          minWidth: { xs: 'auto', md: '120px' },
          backgroundColor: '#e14eca',
          '&:hover': {
            backgroundColor: '#d236b8',
          },
        }}
        size={isMobile ? 'large' : 'medium'}
      >
        New Job
      </Button>
      <Button
        variant="outlined"
        startIcon={<TrendingUp />}
        onClick={() => handleQuickAction('/reports')}
        sx={{
          width: { xs: '100%', md: 'auto' },
          minWidth: { xs: 'auto', md: '140px' },
          whiteSpace: 'nowrap'
        }}
        size={isMobile ? 'large' : 'medium'}
      >
        View Reports
      </Button>
    </Stack>
  )

  const breadcrumbs = [
    {
      label: 'Home',
      path: '/dashboard',
      icon: <HomeIcon fontSize="small" />
    }
  ]

  return (
    <ResponsiveLayout>
      <ResponsiveContainer
        title={`Welcome back, ${user.name}`}
        subtitle="Here's what's happening with your jobs today"
        breadcrumbs={breadcrumbs}
        actions={quickActions}
      >
        {/* Low Stock Notification */}
        <Box className="mb-6">
          <LowStockNotification refreshTrigger={loading ? 0 : 1} />
        </Box>

        {/* Stats Cards - Responsive Grid */}
        <Grid container spacing={3}>
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography>Loading...</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))
          ) : (
            stats.map((stat) => (
              <Grid key={stat.title} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: { xs: 'row', sm: 'column', md: 'row' },
                      alignItems: { xs: 'center', sm: 'flex-start', md: 'center' },
                      mb: 2 
                    }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: { xs: 40, sm: 48 },
                          height: { xs: 40, sm: 48 },
                          borderRadius: '12px',
                          backgroundColor: `${stat.color}20`,
                          mr: { xs: 2, sm: 0, md: 2 },
                          mb: { xs: 0, sm: 2, md: 0 },
                          flexShrink: 0,
                        }}
                      >
                        {React.createElement(stat.icon, { 
                          sx: { 
                            color: stat.color,
                            fontSize: { xs: '1.25rem', sm: '1.5rem' }
                          } 
                        })}
                      </Box>
                      <Box sx={{ flexGrow: 1, textAlign: { xs: 'left', sm: 'center', md: 'left' } }}>
                        <Typography 
                          color="text.secondary" 
                          variant="caption"
                          sx={{ 
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            display: 'block',
                            mb: 0.5
                          }}
                        >
                          {stat.title}
                        </Typography>
                        <Typography 
                          variant="h5" 
                          sx={{ 
                            fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.875rem' },
                            fontWeight: 600,
                            lineHeight: 1.2
                          }}
                        >
                          {stat.value}
                        </Typography>
                      </Box>
                    </Box>
                    {stat.change && (
                      <Typography 
                        variant="caption" 
                        color="success.main"
                        sx={{ 
                          fontSize: { xs: '0.7rem', sm: '0.75rem' },
                          display: 'block',
                          mb: stat.subtitle ? 0.5 : 0
                        }}
                      >
                        {stat.change}
                      </Typography>
                    )}
                    {stat.subtitle && (
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{ 
                          fontSize: { xs: '0.7rem', sm: '0.75rem' },
                          display: 'block'
                        }}
                      >
                        {stat.subtitle}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>

        {/* Recent Jobs and Phases - Responsive Layout */}
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid size={{ xs: 12, lg: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Jobs
                </Typography>
                <List>
                  {loading ? (
                    <ListItem>
                      <ListItemText primary="Loading recent jobs..." />
                    </ListItem>
                  ) : recentJobs.length === 0 ? (
                    <ListItem>
                      <ListItemText primary="No recent jobs" />
                    </ListItem>
                  ) : (
                    recentJobs.map((job) => (
                      <ListItem
                        key={job.id}
                        sx={{
                          flexDirection: { xs: 'column', sm: 'row' },
                          alignItems: { xs: 'stretch', sm: 'center' },
                          py: { xs: 2, sm: 1 }
                        }}
                      >
                        <ListItemText
                          primary={
                            <Typography
                              variant="subtitle2"
                              sx={{
                                fontSize: { xs: '0.875rem', sm: '1rem' },
                                fontWeight: 500,
                                mb: { xs: 0.5, sm: 0 }
                              }}
                            >
                              {job.title}
                            </Typography>
                          }
                          secondary={
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                fontSize: { xs: '0.75rem', sm: '0.875rem' }
                              }}
                            >
                              {job.customer}
                            </Typography>
                          }
                          sx={{ mb: { xs: 1, sm: 0 } }}
                        />
                        <Chip
                          label={job.status.replace('_', ' ')}
                          color={job.status === 'completed' ? 'success' : 
                                 job.status === 'in_progress' ? 'warning' : 'default'}
                          size="small"
                          sx={{
                            alignSelf: { xs: 'flex-start', sm: 'center' },
                            fontSize: { xs: '0.7rem', sm: '0.75rem' }
                          }}
                        />
                      </ListItem>
                    ))
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Job Phases Progress
                </Typography>
                {loading ? (
                  <Typography>Loading phases...</Typography>
                ) : phaseData ? (
                  <Box>
                    {/* Phase Summary - Responsive Grid */}
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            Underground
                          </Typography>
                          <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                            <Chip 
                              label={phaseData.summary?.UG?.COMPLETED || 0} 
                              color="success" 
                              size="small" 
                            />
                            <Chip 
                              label={phaseData.summary?.UG?.IN_PROGRESS || 0} 
                              color="warning" 
                              size="small" 
                            />
                            <Chip 
                              label={phaseData.summary?.UG?.NOT_STARTED || 0} 
                              color="default" 
                              size="small" 
                            />
                          </Stack>
                        </Paper>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            Rough-in
                          </Typography>
                          <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                            <Chip 
                              label={phaseData.summary?.RI?.COMPLETED || 0} 
                              color="success" 
                              size="small" 
                            />
                            <Chip 
                              label={phaseData.summary?.RI?.IN_PROGRESS || 0} 
                              color="warning" 
                              size="small" 
                            />
                            <Chip 
                              label={phaseData.summary?.RI?.NOT_STARTED || 0} 
                              color="default" 
                              size="small" 
                            />
                          </Stack>
                        </Paper>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            Finish
                          </Typography>
                          <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                            <Chip 
                              label={phaseData.summary?.FN?.COMPLETED || 0} 
                              color="success" 
                              size="small" 
                            />
                            <Chip 
                              label={phaseData.summary?.FN?.IN_PROGRESS || 0} 
                              color="warning" 
                              size="small" 
                            />
                            <Chip 
                              label={phaseData.summary?.FN?.NOT_STARTED || 0} 
                              color="default" 
                              size="small" 
                            />
                          </Stack>
                        </Paper>
                      </Grid>
                    </Grid>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Overall completion: {phaseData.completionRate || 0}% ({phaseData.completedPhases || 0}/{phaseData.totalPhases || 0} phases)
                    </Typography>
                    <Typography variant="subtitle2" gutterBottom>
                      Recent Updates
                    </Typography>
                    <List dense>
                      {(phaseData.recentUpdates || []).slice(0, 3).map((update) => (
                        <ListItem key={update.id}>
                          <ListItemText
                            primary={`${update.jobNumber} - ${update.phaseName}`}
                            secondary={
                              <Stack>
                                <Typography variant="body2">
                                  {update.customer}
                                </Typography>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Chip
                                    label={update.status.replace('_', ' ')}
                                    color={update.status === 'COMPLETED' ? 'success' : 'warning'}
                                    size="small"
                                  />
                                  <Typography variant="caption" color="text.secondary">
                                    {new Date(update.updatedAt).toLocaleDateString()}
                                  </Typography>
                                </Box>
                              </Stack>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                ) : (
                  <Typography color="text.secondary">
                    No phase data available
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </ResponsiveContainer>
    </ResponsiveLayout>
  )
}