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
  Snackbar,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  LinearProgress,
} from '@mui/material'
import {
  Work as WorkIcon,
  AttachMoney,
  AccessTime,
  AccessTime as TimeIcon,
  Group,
  TrendingUp,
  ShoppingCart as PurchaseOrderIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
  Dashboard as DashboardIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material'
import ResponsiveLayout from '@/components/layout/ResponsiveLayout'
import ResponsiveContainer from '@/components/layout/ResponsiveContainer'
import LowStockNotification from '@/components/notifications/LowStockNotification'
import EmployeeJobQuickAccess from '@/components/dashboard/EmployeeJobQuickAccess'
import NewEmployeeJobs from '@/components/dashboard/NewEmployeeJobs'
import { useAuthCheck } from '@/hooks/useAuthCheck'


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
  clickable?: boolean
  link?: string
}

interface RecentJob {
  id: string
  title: string
  customer: string
  status: string
  updatedAt: string
  jobNumber?: string
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
  'schedule': ScheduleIcon,
}

const colorMap = {
  'primary': '#E53E3E', // Ortmeier red
  'success': '#68D391', // Success green
  'warning': '#F6E05E', // Safety yellow
  'info': '#63B3ED', // Info blue
}


export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuthCheck()
  const [stats, setStats] = useState<Stat[]>([])
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([])
  const [phaseData, setPhaseData] = useState<PhaseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [snackbar, setSnackbar] = useState<{open: boolean, message: string, severity: 'success' | 'error'}>({
    open: false,
    message: '',
    severity: 'success'
  })
  const [cardSettingsOpen, setCardSettingsOpen] = useState(false)
  const [visibleCards, setVisibleCards] = useState<Record<string, boolean>>({})
  const [expectedHoursView, setExpectedHoursView] = useState<'day' | 'week'>('day')
  const [confirmDialog, setConfirmDialog] = useState<{open: boolean, jobId: string, jobNumber: string}>({
    open: false,
    jobId: '',
    jobNumber: ''
  })
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  useEffect(() => {
    if (!authLoading && user) {
      fetchDashboardData()
      loadCardPreferences()
    }
  }, [authLoading, user])

  const loadCardPreferences = () => {
    const saved = localStorage.getItem(`dashboard-cards-${user?.id}`)
    if (saved) {
      setVisibleCards(JSON.parse(saved))
    } else {
      // Default all cards to visible
      setVisibleCards({
        'Active Jobs': true,
        'Jobs Marked Done': true,
        'Pending Purchase Orders': true,
        'Revenue This Month': true,
        'Hours Today': true,
        'Expected Hours': true,
      })
    }
  }

  const saveCardPreferences = (newPreferences: Record<string, boolean>) => {
    localStorage.setItem(`dashboard-cards-${user?.id}`, JSON.stringify(newPreferences))
    setVisibleCards(newPreferences)
  }

  const handleMarkComplete = async (jobId: string, jobNumber: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          completedBy: user?.id,
          completedByName: user?.name,
        })
      })

      if (response.ok) {
        setSnackbar({
          open: true,
          message: `Job ${jobNumber} marked as done! Admin notified for final closure.`,
          severity: 'success'
        })

        // Remove job from list
        setRecentJobs(prev => prev.filter(job => job.id !== jobId))
      } else {
        throw new Error('Failed to mark job as complete')
      }
    } catch (error) {
      console.error('Error marking job complete:', error)
      setSnackbar({
        open: true,
        message: 'Failed to mark job as complete',
        severity: 'error'
      })
    }
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Only fetch phases data for non-employees
      const requests = [fetch('/api/dashboard/stats')]
      if (user?.role !== 'EMPLOYEE') {
        requests.push(fetch('/api/dashboard/phases'))
      }
      
      const responses = await Promise.all(requests)
      const [statsResponse, phasesResponse] = responses
      
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

      // Add Expected Hours card for employees
      if (user?.role === 'EMPLOYEE') {
        const expectedHours = statsData.recentJobs.reduce((total: number, job: any) => {
          // Only count today's jobs
          const jobDate = new Date(job.date || job.updatedAt)
          const today = new Date()
          if (jobDate.toDateString() === today.toDateString()) {
            return total + (job.estimatedHours || 0)
          }
          return total
        }, 0)

        transformedStats.push({
          title: 'Expected Hours',
          value: expectedHours.toFixed(1),
          change: 'Today\'s scheduled work',
          icon: ScheduleIcon,
          color: '#9c27b0', // Purple color for expected hours
        })
      }

      setStats(transformedStats)
      setRecentJobs(statsData.recentJobs)

      // Only process phases data if it was fetched
      if (phasesResponse && phasesResponse.ok) {
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

  // Show loading state while auth is checking
  if (authLoading) {
    return (
      <ResponsiveLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <Typography>Loading...</Typography>
        </Box>
      </ResponsiveLayout>
    )
  }

  // Redirect if not authenticated
  if (!user) {
    router.push('/login')
    return null
  }

  // Quick action buttons for mobile and desktop
  const quickActions = user.role === 'EMPLOYEE' ? (
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
        startIcon={<WorkIcon />}
        onClick={() => handleQuickAction(isMobile ? '/jobs/mobile' : '/jobs')}
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
        My Jobs
      </Button>
      <Button
        variant="outlined"
        startIcon={<AccessTime />}
        onClick={() => handleQuickAction('/time')}
        sx={{
          width: { xs: '100%', md: 'auto' },
          minWidth: { xs: 'auto', md: '140px' },
          whiteSpace: 'nowrap'
        }}
        size={isMobile ? 'large' : 'medium'}
      >
        Time Clock
      </Button>
    </Stack>
  ) : (
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
        onClick={() => handleQuickAction('/jobs')}
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

  return (
    <ResponsiveLayout>
      <ResponsiveContainer
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h5" component="h1">
              Welcome back, {user.name}
            </Typography>
            {user.role !== 'EMPLOYEE' && (
              <Tooltip title="Customize Dashboard">
                <IconButton
                  onClick={() => setCardSettingsOpen(true)}
                  size="small"
                  sx={{
                    bgcolor: 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' }
                  }}
                >
                  <DashboardIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        }
        actions={quickActions}
      >
        {/* Employee Job Quick Access - Only for employees on mobile */}
        {user.role === 'EMPLOYEE' && isMobile && (
          <Box sx={{ mb: 3 }}>
            <EmployeeJobQuickAccess userName={user.name} />
          </Box>
        )}

        {/* Low Stock Notification - Only for managers/admins */}
        {user.role !== 'EMPLOYEE' && (
          <Box sx={{ mb: 3 }}>
            <LowStockNotification refreshTrigger={loading ? 0 : 1} />
          </Box>
        )}

        {/* New Employee Jobs - Only for admins/managers - TEMPORARILY DISABLED */}
        {false && user.role !== 'EMPLOYEE' && (
          <Box sx={{ mb: 3 }}>
            <NewEmployeeJobs />
          </Box>
        )}

        {/* Stats Cards - Responsive Grid */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ 
                  height: '100%',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    boxShadow: 3,
                    transform: 'translateY(-2px)',
                  },
                }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography>Loading...</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))
          ) : (
            stats.filter(stat => visibleCards[stat.title] !== false).map((stat) => (
              <Grid key={stat.title} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card
                  onClick={() => stat.clickable && stat.link && router.push(stat.link)}
                  sx={{
                    height: '100%',
                    transition: 'all 0.2s ease-in-out',
                    cursor: stat.clickable ? 'pointer' : 'default',
                    '&:hover': {
                      boxShadow: 3,
                      transform: 'translateY(-2px)',
                    },
                  }}>
                  <CardContent sx={{ p: 2.5 }}>
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
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: user.role === 'EMPLOYEE' ? 12 : 6 }}>
            <Card sx={{ 
              height: '100%',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                boxShadow: 3,
              },
            }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                  {user.role === 'EMPLOYEE' ? 'Upcoming Jobs' : 'Recent Jobs'}
                </Typography>
                <Box sx={{ px: 0 }}>
                  {loading ? (
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText primary={`Loading ${user.role === 'EMPLOYEE' ? 'upcoming' : 'recent'} jobs...`} />
                    </ListItem>
                  ) : recentJobs.length === 0 ? (
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText primary={`No ${user.role === 'EMPLOYEE' ? 'upcoming' : 'recent'} jobs`} />
                    </ListItem>
                  ) : user.role === 'EMPLOYEE' ? (
                    // Group jobs by date for employees
                    (() => {
                      const groupedJobs = recentJobs.reduce((groups: any, job: any) => {
                        const date = job.date || 'No Date';
                        if (!groups[date]) {
                          groups[date] = [];
                        }
                        groups[date].push(job);
                        return groups;
                      }, {});

                      return Object.entries(groupedJobs).map(([date, jobs]: [string, any]) => (
                        <Box
                          key={date}
                          sx={{
                            border: '2px solid',
                            borderColor: '#000000',
                            borderRadius: 2,
                            mb: 2,
                            p: 1.5,
                            backgroundColor: 'background.paper',
                            '&:last-child': {
                              mb: 0,
                            },
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 600,
                              color: 'primary.main',
                              mb: 1,
                              px: 1,
                            }}
                          >
                            {date}
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {(jobs as any[]).map((job: any, index: number) => (
                              <Box
                                key={job.id}
                                sx={{
                                  border: '1px solid',
                                  borderColor: '#000000',
                                  borderRadius: 1,
                                  p: 1.5,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  backgroundColor: 'background.paper',
                                  '&:hover': {
                                    backgroundColor: 'action.hover',
                                    boxShadow: 1,
                                  },
                                }}
                                onClick={() => router.push(`/jobs/${job.id}`)}
                              >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Box sx={{ flex: 1 }}>
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        fontSize: { xs: '0.875rem', sm: '0.95rem' },
                                        fontWeight: 500,
                                        mb: 0.25
                                      }}
                                    >
                                      <strong>{job.jobNumber}</strong> - {job.title}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {job.customer}
                                    </Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {job.estimatedHours && (
                                      <Chip
                                        label={`${job.estimatedHours}h`}
                                        color="primary"
                                        size="small"
                                        sx={{
                                          fontSize: { xs: '0.7rem', sm: '0.75rem' }
                                        }}
                                      />
                                    )}
                                    <Button
                                      size="small"
                                      variant="contained"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setConfirmDialog({
                                          open: true,
                                          jobId: job.id,
                                          jobNumber: job.jobNumber
                                        })
                                      }}
                                      sx={{
                                        minWidth: 'auto',
                                        px: 1.5,
                                        py: 0.5,
                                        fontSize: '0.7rem',
                                        backgroundColor: '#1976d2', // Theme blue
                                        color: 'white',
                                        fontWeight: 600,
                                        '&:hover': {
                                          backgroundColor: '#1565c0' // Darker blue on hover
                                        }
                                      }}
                                    >
                                      Mark Done
                                    </Button>
                                  </Box>
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      ));
                    })()
                  ) : (
                    // Regular list for non-employees
                    <List sx={{ px: 0 }}>
                      {recentJobs.map((job: any) => (
                        <ListItem
                          key={job.id}
                          sx={{
                            flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: { xs: 'stretch', sm: 'center' },
                            py: { xs: 1.5, sm: 1 },
                            px: 0,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            '&:last-child': {
                              borderBottom: 'none',
                            },
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: 'action.hover',
                              borderRadius: 1,
                            },
                          }}
                          onClick={() => router.push(`/jobs/${job.id}`)}
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
                              <>
                                <Typography component="span" variant="body2" color="text.secondary" display="block">
                                  {job.customer}
                                </Typography>
                              </>
                            }
                            secondaryTypographyProps={{
                              component: 'div'
                            }}
                            sx={{ mb: { xs: 1, sm: 0 } }}
                          />
                          <Chip
                            label={job.status?.replace('_', ' ')}
                            color={job.status === 'completed' ? 'success' :
                                   job.status === 'in_progress' ? 'warning' : 'default'}
                            size="small"
                            sx={{
                              alignSelf: { xs: 'flex-start', sm: 'center' },
                              fontSize: { xs: '0.7rem', sm: '0.75rem' }
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {user && user.role !== 'EMPLOYEE' && (
            <Grid size={{ xs: 12, lg: 6 }}>
              <Card sx={{ 
                height: '100%',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  boxShadow: 3,
                },
              }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                    Job Phases Progress
                  </Typography>
                  {loading ? (
                    <Typography>Loading phases...</Typography>
                  ) : phaseData ? (
                    <Box>
                      {/* Phase Summary - Responsive Grid */}
                      <Grid container spacing={1.5} sx={{ mb: 2 }}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <Paper sx={{ 
                            p: 2, 
                            textAlign: 'center',
                            backgroundColor: 'background.paper',
                            boxShadow: 1,
                            transition: 'box-shadow 0.2s',
                            '&:hover': {
                              boxShadow: 2,
                            },
                          }}>
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
                          <Paper sx={{ 
                            p: 2, 
                            textAlign: 'center',
                            backgroundColor: 'background.paper',
                            boxShadow: 1,
                            transition: 'box-shadow 0.2s',
                            '&:hover': {
                              boxShadow: 2,
                            },
                          }}>
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
                          <Paper sx={{ 
                            p: 2, 
                            textAlign: 'center',
                            backgroundColor: 'background.paper',
                            boxShadow: 1,
                            transition: 'box-shadow 0.2s',
                            '&:hover': {
                              boxShadow: 2,
                            },
                          }}>
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
                      <List dense sx={{ px: 0 }}>
                        {(phaseData.recentUpdates || []).slice(0, 3).map((update) => (
                          <ListItem key={update.id} sx={{ px: 0, py: 1 }}>
                            <ListItemText
                              primary={`${update.jobNumber} - ${update.phaseName}`}
                              secondary={
                                <>
                                  <span style={{ display: 'block' }}>
                                    {update.customer}
                                  </span>
                                  <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                    <Chip
                                      label={update.status.replace('_', ' ')}
                                      color={update.status === 'COMPLETED' ? 'success' : 'warning'}
                                      size="small"
                                      component="span"
                                    />
                                    <span style={{ fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                                      {new Date(update.updatedAt).toLocaleDateString()}
                                    </span>
                                  </span>
                                </>
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
          )}
        </Grid>
      </ResponsiveContainer>

      {/* Confirmation Dialog for Mark Done */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, jobId: '', jobNumber: '' })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          Confirm Job Completion
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to mark <strong>Job #{confirmDialog.jobNumber}</strong> as done?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This will notify administrators that the physical work is complete and ready for final review.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setConfirmDialog({ open: false, jobId: '', jobNumber: '' })}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              handleMarkComplete(confirmDialog.jobId, confirmDialog.jobNumber)
              setConfirmDialog({ open: false, jobId: '', jobNumber: '' })
            }}
            variant="contained"
            sx={{
              backgroundColor: '#1976d2',
              '&:hover': {
                backgroundColor: '#1565c0'
              }
            }}
          >
            Yes, Mark as Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Card Settings Modal */}
      <Dialog
        open={cardSettingsOpen}
        onClose={() => setCardSettingsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DashboardIcon />
            <Typography variant="h6">Customize Dashboard</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select which cards you want to display on your dashboard
          </Typography>
          <FormGroup>
            {stats.map((stat) => (
              <FormControlLabel
                key={stat.title}
                control={
                  <Checkbox
                    checked={visibleCards[stat.title] !== false}
                    onChange={(e) => {
                      const newPrefs = {
                        ...visibleCards,
                        [stat.title]: e.target.checked
                      }
                      saveCardPreferences(newPrefs)
                    }}
                    color="primary"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: stat.color,
                      }}
                    />
                    <Typography>{stat.title}</Typography>
                  </Box>
                }
              />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCardSettingsOpen(false)}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              // Reset to all visible
              const allVisible = stats.reduce((acc, stat) => ({
                ...acc,
                [stat.title]: true
              }), {})
              saveCardPreferences(allVisible)
            }}
          >
            Show All
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </ResponsiveLayout>
  )
}