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
  Stack,
  CircularProgress,
  Alert,
  Grid,
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
  Add as AddIcon,
  Notifications as NotificationsIcon,
  Event as EventIcon,
  Warning as WarningIcon,
  TaskAlt as TaskIcon,
  Tv as TvIcon,
} from '@mui/icons-material'
import ScheduleJobDialog from '@/components/schedule/ScheduleJobDialog'

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

interface UpcomingReminder {
  id: string
  jobId: string
  jobNumber: string
  title: string
  customer: string
  scheduledDate: string
  daysUntil: number
  priority: 'high' | 'medium' | 'low'
  type: 'start_reminder' | 'deadline_warning' | 'overdue'
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
  const [upcomingReminders, setUpcomingReminders] = useState<UpcomingReminder[]>([])
  const [scheduleJobOpen, setScheduleJobOpen] = useState(false)
  const [showReminders, setShowReminders] = useState(true)

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
      const [scheduleResponse, remindersResponse] = await Promise.all([
        fetch(`/api/schedule?viewType=${viewType}&date=${currentDate.toISOString()}`),
        fetch('/api/schedule/reminders')
      ])
      
      if (!scheduleResponse.ok) {
        throw new Error('Failed to fetch schedule data')
      }
      
      const scheduleData = await scheduleResponse.json()
      setScheduleData(scheduleData.dateRange)
      setCrewAvailability(scheduleData.crewAvailability)
      
      // Handle reminders (if API exists)
      if (remindersResponse.ok) {
        const remindersData = await remindersResponse.json()
        setUpcomingReminders(remindersData.reminders || [])
      } else {
        // Mock reminder data for now
        setUpcomingReminders([
          {
            id: '1',
            jobId: 'job1',
            jobNumber: 'J-2024-001',
            title: 'Commercial Wiring Project',
            customer: 'ABC Company',
            scheduledDate: '2024-06-18',
            daysUntil: 3,
            priority: 'high',
            type: 'start_reminder'
          },
          {
            id: '2',
            jobId: 'job2',
            jobNumber: 'J-2024-002',
            title: 'Service Call - Panel Upgrade',
            customer: 'John Smith',
            scheduledDate: '2024-06-20',
            daysUntil: 5,
            priority: 'medium',
            type: 'start_reminder'
          }
        ])
      }
      
      setError(null)
    } catch (error) {
      console.error('Error fetching schedule data:', error)
      setError('Failed to load schedule data')
      // Fallback to empty data
      setScheduleData([])
      setCrewAvailability([])
      setUpcomingReminders([])
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

  const getReminderPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'error'
      case 'medium':
        return 'warning'
      case 'low':
        return 'info'
      default:
        return 'default'
    }
  }

  const getReminderIcon = (type: string) => {
    switch (type) {
      case 'start_reminder':
        return <EventIcon />
      case 'deadline_warning':
        return <WarningIcon />
      case 'overdue':
        return <TaskIcon />
      default:
        return <NotificationsIcon />
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
          
          {/* Notification indicator */}
          <IconButton 
            onClick={() => setShowReminders(!showReminders)}
            sx={{ mr: 1 }}
          >
            <NotificationsIcon />
            {upcomingReminders.length > 0 && (
              <Chip
                label={upcomingReminders.length}
                size="small"
                color="error"
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  minWidth: 20,
                  height: 20,
                  fontSize: '0.75rem'
                }}
              />
            )}
          </IconButton>
          
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
                startIcon={<TvIcon />}
                variant="outlined"
                onClick={() => window.open('/office-display', '_blank')}
                sx={{ mr: 1 }}
              >
                Office Display
              </Button>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={() => setScheduleJobOpen(true)}
                sx={{
                  backgroundColor: '#e14eca',
                  '&:hover': {
                    backgroundColor: '#d236b8',
                  },
                }}
              >
                Schedule Job
              </Button>
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

          {/* Upcoming Reminders Section */}
          {showReminders && upcomingReminders.length > 0 && (
            <Card sx={{ mb: 3, border: '2px solid', borderColor: 'warning.main' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <NotificationsIcon sx={{ mr: 1, color: 'warning.main' }} />
                  <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    Upcoming Job Reminders
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => setShowReminders(false)}
                  >
                    Dismiss
                  </Button>
                </Box>
                <Grid container spacing={2}>
                  {upcomingReminders.map((reminder) => (
                    <Grid size={{ xs: 12, md: 6 }} key={reminder.id}>
                      <Card sx={{ backgroundColor: 'background.default' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                            <Box sx={{ color: getReminderPriorityColor(reminder.priority) }}>
                              {getReminderIcon(reminder.type)}
                            </Box>
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="subtitle1" fontWeight="medium">
                                {reminder.jobNumber} - {reminder.title}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {reminder.customer}
                              </Typography>
                              <Typography variant="body2" sx={{ mt: 1 }}>
                                Scheduled: {new Date(reminder.scheduledDate).toLocaleDateString()}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                <Chip
                                  label={`${reminder.daysUntil} days`}
                                  size="small"
                                  color={getReminderPriorityColor(reminder.priority) as any}
                                />
                                <Chip
                                  label={reminder.type.replace('_', ' ')}
                                  size="small"
                                  variant="outlined"
                                />
                              </Box>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3}>
              {scheduleData.length === 0 ? (
                <Grid xs={12}>
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

      {/* Schedule Job Dialog */}
      <ScheduleJobDialog
        open={scheduleJobOpen}
        onClose={() => setScheduleJobOpen(false)}
        onJobScheduled={() => {
          setScheduleJobOpen(false)
          fetchScheduleData()
        }}
      />
    </Box>
  )
}