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
  Close as CloseIcon,
} from '@mui/icons-material'
import JobSchedulingCalendar from '@/components/scheduling/JobSchedulingCalendar'
import CrewAvailabilityWidget from '@/components/scheduling/CrewAvailabilityWidget'
import ReminderManagement from '@/components/reminders/ReminderManagement'

const drawerWidth = 240

interface User {
  id: string
  email: string
  name: string
  role: string
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
  const [upcomingReminders, setUpcomingReminders] = useState<UpcomingReminder[]>([])
  const [showReminders, setShowReminders] = useState(true)
  const [reminderManagementOpen, setReminderManagementOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/login')
      return
    }
    setUser(JSON.parse(storedUser))
    fetchUpcomingReminders()
  }, [router])

  const fetchUpcomingReminders = async () => {
    try {
      setLoading(true)
      const remindersResponse = await fetch('/api/schedule/reminders')
      
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
    } catch (error) {
      console.error('Error fetching reminders:', error)
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

  const handleJobScheduled = () => {
    fetchUpcomingReminders()
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
            <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main' }}>
              Schedule Management
            </Typography>
            <Button
              startIcon={<TvIcon />}
              variant="outlined"
              size="large"
              onClick={() => window.open('/office-display', '_blank')}
              sx={{ fontWeight: 600 }}
            >
              Office Display
            </Button>
          </Box>


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
                    variant="outlined"
                    onClick={() => setReminderManagementOpen(true)}
                    sx={{ mr: 1 }}
                  >
                    Manage Reminders
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setShowReminders(false)}
                  >
                    Dismiss
                  </Button>
                </Box>
                <Grid container spacing={2}>
                  {upcomingReminders.map((reminder) => (
                    <Grid key={reminder.id} size={{ xs: 12, sm: 12, md: 6, lg: 4 }}>
                      <Card sx={{ backgroundColor: 'background.default', height: '100%' }}>
                        <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: { xs: 'row', sm: 'row' },
                            alignItems: 'flex-start', 
                            gap: 2,
                            mb: 2
                          }}>
                            <Box sx={{ 
                              color: getReminderPriorityColor(reminder.priority),
                              flexShrink: 0
                            }}>
                              {getReminderIcon(reminder.type)}
                            </Box>
                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                              <Typography 
                                variant="subtitle1" 
                                fontWeight="medium"
                                sx={{
                                  fontSize: { xs: '0.875rem', sm: '1rem' },
                                  lineHeight: 1.3,
                                  mb: 0.5
                                }}
                              >
                                {reminder.jobNumber} - {reminder.title}
                              </Typography>
                              <Typography 
                                variant="body2" 
                                color="text.secondary"
                                sx={{
                                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                  mb: 1
                                }}
                              >
                                {reminder.customer}
                              </Typography>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                  mb: 2
                                }}
                              >
                                Scheduled: {new Date(reminder.scheduledDate).toLocaleDateString()}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ 
                            display: 'flex', 
                            flexWrap: 'wrap',
                            gap: 1, 
                            mt: 'auto'
                          }}>
                            <Chip
                              label={`${reminder.daysUntil} days`}
                              size="small"
                              color={getReminderPriorityColor(reminder.priority) as any}
                              sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                            />
                            <Chip
                              label={reminder.type.replace('_', ' ')}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Job Scheduling Calendar */}
          <Box sx={{ mb: 6 }}>
            <JobSchedulingCalendar onJobScheduled={handleJobScheduled} />
          </Box>

          {/* Crew Availability Widget */}
          <Box sx={{ mb: 4 }}>
            <CrewAvailabilityWidget />
          </Box>
        </Container>
      </Box>

      {/* Reminder Management Dialog */}
      {reminderManagementOpen && (
        <Box 
          sx={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.5)', 
            zIndex: 1300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setReminderManagementOpen(false)}
        >
          <Box 
            sx={{ 
              backgroundColor: 'background.paper', 
              borderRadius: 2, 
              p: 3, 
              maxWidth: '90vw', 
              maxHeight: '90vh', 
              overflow: 'auto',
              minWidth: 600
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5">Reminder Management</Typography>
              <IconButton onClick={() => setReminderManagementOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
            <ReminderManagement />
          </Box>
        </Box>
      )}

    </Box>
  )
}