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
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/login')
      return
    }
    setUser(JSON.parse(storedUser))
    fetchDashboardData()
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
    <Stack direction={isMobile ? 'column' : 'row'} spacing={2} className="w-full md:w-auto">
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => handleQuickAction('/jobs/new')}
        className="w-full md:w-auto"
        size={isMobile ? 'large' : 'medium'}
      >
        New Job
      </Button>
      <Button
        variant="outlined"
        startIcon={<TrendingUp />}
        onClick={() => handleQuickAction('/reports')}
        className="w-full md:w-auto"
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

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <Box key={index} sx={{ flex: '1 1 calc(25% - 18px)', minWidth: '200px' }}>
                  <Card>
                    <CardContent>
                      <Typography>Loading...</Typography>
                    </CardContent>
                  </Card>
                </Box>
              ))
            ) : (
              stats.map((stat) => (
                <Box key={stat.title} sx={{ flex: '1 1 calc(25% - 18px)', minWidth: '200px' }}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 48,
                            height: 48,
                            borderRadius: '12px',
                            backgroundColor: `${stat.color}20`,
                            mr: 2,
                          }}
                        >
                          {React.createElement(stat.icon, { sx: { color: stat.color } })}
                        </Box>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography color="text.secondary" variant="caption">
                            {stat.title}
                          </Typography>
                          <Typography variant="h5">{stat.value}</Typography>
                        </Box>
                      </Box>
                      {stat.change && (
                        <Typography variant="caption" color="success.main">
                          {stat.change}
                        </Typography>
                      )}
                      {stat.subtitle && (
                        <Typography variant="caption" color="text.secondary">
                          {stat.subtitle}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Box>
              ))
            )}
          </Box>

        {/* Recent Jobs and Phases - Side by Side on Desktop, Stacked on Mobile */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 2 }}>
          <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '400px' }}>
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
                        secondaryAction={
                          <Chip
                            label={job.status.replace('_', ' ')}
                            color={job.status === 'completed' ? 'success' : 
                                   job.status === 'in_progress' ? 'warning' : 'default'}
                            size="small"
                          />
                        }
                      >
                        <ListItemText
                          primary={job.title}
                          secondary={job.customer}
                        />
                      </ListItem>
                    ))
                  )}
                </List>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '400px' }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Job Phases Progress
                </Typography>
                {loading ? (
                  <Typography>Loading phases...</Typography>
                ) : phaseData ? (
                  <Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                      <Box sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: '120px' }}>
                        <Typography variant="caption" color="text.secondary">
                          Underground
                        </Typography>
                        <Stack direction="row" spacing={1}>
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
                      </Box>
                      <Box sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: '120px' }}>
                        <Typography variant="caption" color="text.secondary">
                          Rough-in
                        </Typography>
                        <Stack direction="row" spacing={1}>
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
                      </Box>
                      <Box sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: '120px' }}>
                        <Typography variant="caption" color="text.secondary">
                          Finish
                        </Typography>
                        <Stack direction="row" spacing={1}>
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
                      </Box>
                    </Box>
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
          </Box>
        </Box>
      </ResponsiveContainer>
    </ResponsiveLayout>
  )
}