'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  AppBar,
  Toolbar,
  Drawer,
  ListItemIcon,
  ListItemButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  List,
  ListItemText,
  Button,
  Paper,
  Grid2 as Grid,
  Stack,
  CircularProgress,
  Alert,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  Work as WorkIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  Inventory as InventoryIcon,
  Receipt as ReceiptIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  AccessTime as TimeIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  ChevronLeft,
  ChevronRight,
  Today,
  CalendarMonth,
  TrendingUp,
} from '@mui/icons-material'

const drawerWidth = 240

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface ScheduleJob {
  id: string
  time: string
  jobNumber: string
  title: string
  customer: string
  customerPhone?: string
  address: string
  status: string
  priority?: string
  jobType?: string
  estimatedHours?: number
  crew: string
  crewId?: string
}

interface ScheduleDay {
  date: string
  displayDate: string
  jobs: ScheduleJob[]
}

interface CrewAvailability {
  name: string
  totalHours: number
  scheduledHours: number
  availableHours: number
  status: 'available' | 'busy' | 'overbooked'
}

const menuItems = [
  { text: 'Dashboard', icon: DashboardIcon, path: '/dashboard' },
  { text: 'Jobs', icon: WorkIcon, path: '/jobs' },
  { text: 'Schedule', icon: ScheduleIcon, path: '/schedule' },
  { text: 'Time Tracking', icon: TimeIcon, path: '/time' },
  { text: 'Customers', icon: PeopleIcon, path: '/customers' },
  { text: 'Leads', icon: TrendingUp, path: '/leads' },
  { text: 'Materials', icon: InventoryIcon, path: '/materials' },
  { text: 'Invoicing', icon: ReceiptIcon, path: '/invoicing' },
  { text: 'Reports', icon: AssessmentIcon, path: '/reports' },
  { text: 'Settings', icon: SettingsIcon, path: '/settings' },
]

export default function SchedulePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [viewType, setViewType] = useState<'day' | 'week' | 'month'>('week')
  const [scheduleData, setScheduleData] = useState<ScheduleDay[]>([])
  const [crewAvailability, setCrewAvailability] = useState<CrewAvailability[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/login')
      return
    }
    setUser(JSON.parse(storedUser))
    fetchScheduleData()
  }, [router, viewType, currentDate])

  const fetchScheduleData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/schedule?viewType=${viewType}&date=${currentDate.toISOString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch schedule data')
      }
      const data = await response.json()
      setScheduleData(data.dateRange)
      setCrewAvailability(data.crewAvailability)
      setError(null)
    } catch (error) {
      console.error('Error fetching schedule data:', error)
      setError('Failed to load schedule data')
      // Fallback to empty data
      setScheduleData([])
      setCrewAvailability([])
    } finally {
      setLoading(false)
    }
  }

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    localStorage.removeItem('user')
    router.push('/login')
  }

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    switch (viewType) {
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
        break
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
        break
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
        break
    }
    setCurrentDate(newDate)
  }

  const getDateRangeDisplay = () => {
    if (viewType === 'day') {
      return currentDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    } else if (viewType === 'week') {
      const startOfWeekDate = new Date(currentDate)
      const dayOfWeek = startOfWeekDate.getDay()
      const startOfMonday = new Date(startOfWeekDate)
      startOfMonday.setDate(startOfWeekDate.getDate() - dayOfWeek + 1)
      
      const endOfSunday = new Date(startOfMonday)
      endOfSunday.setDate(startOfMonday.getDate() + 6)
      
      return `${startOfMonday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfSunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    } else {
      return currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'info'
      case 'DISPATCHED':
        return 'warning'
      case 'IN_PROGRESS':
        return 'primary'
      default:
        return 'default'
    }
  }

  const getCrewStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'success'
      case 'busy':
        return 'warning'
      case 'overbooked':
        return 'error'
      default:
        return 'default'
    }
  }

  if (!user) return null

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ px: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 300 }}>
          Ortmeier Tech
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ flexGrow: 1 }}>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.text}
            onClick={() => router.push(item.path)}
            selected={item.path === '/schedule'}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(225, 78, 202, 0.08)',
              },
              '&.Mui-selected': {
                backgroundColor: 'rgba(225, 78, 202, 0.12)',
              },
            }}
          >
            <ListItemIcon>
              <item.icon sx={{ color: 'text.secondary' }} />
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItemButton>
        ))}
      </List>
      <Divider />
      <List>
        <ListItemButton onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon sx={{ color: 'text.secondary' }} />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Schedule
          </Typography>
          <IconButton onClick={handleMenuClick}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {user.name.charAt(0)}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem>
              <Typography variant="body2">{user.name}</Typography>
            </MenuItem>
            <MenuItem>
              <Typography variant="caption" color="text.secondary">
                {user.role}
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
        }}
      >
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Typography variant="h4">
              Schedule
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                startIcon={<Today />}
                variant={viewType === 'day' ? 'contained' : 'outlined'}
                onClick={() => setViewType('day')}
                sx={{
                  ...(viewType === 'day' && {
                    backgroundColor: '#e14eca',
                    '&:hover': {
                      backgroundColor: '#d236b8',
                    },
                  }),
                }}
              >
                Day
              </Button>
              <Button
                variant={viewType === 'week' ? 'contained' : 'outlined'}
                onClick={() => setViewType('week')}
                sx={{
                  ...(viewType === 'week' && {
                    backgroundColor: '#e14eca',
                    '&:hover': {
                      backgroundColor: '#d236b8',
                    },
                  }),
                }}
              >
                Week
              </Button>
              <Button
                startIcon={<CalendarMonth />}
                variant={viewType === 'month' ? 'contained' : 'outlined'}
                onClick={() => setViewType('month')}
                sx={{
                  ...(viewType === 'month' && {
                    backgroundColor: '#e14eca',
                    '&:hover': {
                      backgroundColor: '#d236b8',
                    },
                  }),
                }}
              >
                Month
              </Button>
            </Stack>
          </Box>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <IconButton onClick={() => navigateDate('prev')}>
                  <ChevronLeft />
                </IconButton>
                <Typography variant="h6">
                  {getDateRangeDisplay()}
                </Typography>
                <IconButton onClick={() => navigateDate('next')}>
                  <ChevronRight />
                </IconButton>
              </Box>
            </CardContent>
          </Card>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3}>
              {scheduleData.length === 0 ? (
                <Grid size={12}>
                  <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                      No scheduled jobs found for this {viewType}.
                    </Typography>
                  </Paper>
                </Grid>
              ) : (
                scheduleData.map((day) => (
                  <Grid size={{ xs: 12, md: viewType === 'day' ? 12 : 6 }} key={day.date}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="h6" gutterBottom>
                        {day.displayDate}
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      {day.jobs.length === 0 ? (
                        <Typography color="text.secondary" variant="body2">
                          No jobs scheduled
                        </Typography>
                      ) : (
                        day.jobs.map((job) => (
                          <Card key={job.id} sx={{ mb: 2, backgroundColor: 'background.default' }}>
                            <CardContent>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box sx={{ flexGrow: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                      {job.time}
                                    </Typography>
                                    <Chip
                                      label={job.status}
                                      size="small"
                                      color={getStatusColor(job.status) as any}
                                    />
                                  </Box>
                                  <Typography variant="body1" fontWeight="medium">
                                    {job.jobNumber} - {job.title}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {job.customer}
                                  </Typography>
                                  {job.address && (
                                    <Typography variant="caption" color="text.secondary">
                                      {job.address}
                                    </Typography>
                                  )}
                                  <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    <Chip
                                      label={job.crew}
                                      size="small"
                                      color="primary"
                                    />
                                    {job.estimatedHours && (
                                      <Chip
                                        label={`${job.estimatedHours}h estimated`}
                                        size="small"
                                        variant="outlined"
                                      />
                                    )}
                                    {job.priority && (
                                      <Chip
                                        label={job.priority}
                                        size="small"
                                        color={job.priority === 'HIGH' ? 'error' : 'default'}
                                        variant="outlined"
                                      />
                                    )}
                                  </Box>
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </Paper>
                  </Grid>
                ))
              )}
            </Grid>
          )}

          <Box sx={{ mt: 4, p: 3, backgroundColor: 'background.paper', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              Crew Availability
            </Typography>
            {crewAvailability.length === 0 ? (
              <Typography color="text.secondary">
                No crew data available. Create crews in the settings to see availability.
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {crewAvailability.map((crew) => (
                  <Grid size={{ xs: 12, sm: 6, md: 3 }} key={crew.name}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle1">{crew.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Available: {crew.availableHours}h
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Scheduled: {crew.scheduledHours}h
                        </Typography>
                        <Chip 
                          label={crew.status.charAt(0).toUpperCase() + crew.status.slice(1)} 
                          color={getCrewStatusColor(crew.status) as any} 
                          size="small" 
                          sx={{ mt: 1 }} 
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </Container>
      </Box>
    </Box>
  )
}