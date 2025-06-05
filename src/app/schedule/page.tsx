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
  Grid,
  Stack,
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
} from '@mui/icons-material'

const drawerWidth = 240

interface User {
  id: string
  email: string
  name: string
  role: string
}

const mockScheduleData = [
  {
    date: '2025-05-29',
    jobs: [
      { time: '8:00 AM', jobId: '25-001-A12', title: 'Panel Upgrade', crew: 'Team Alpha' },
      { time: '10:00 AM', jobId: '25-004-D78', title: 'Residential Rewire', crew: 'Team Bravo' },
      { time: '2:00 PM', jobId: '25-006-F23', title: 'Service Call', crew: 'Team Charlie' },
    ]
  },
  {
    date: '2025-05-30',
    jobs: [
      { time: '9:00 AM', jobId: '25-002-B34', title: 'Office Buildout', crew: 'Team Alpha' },
      { time: '11:00 AM', jobId: '25-007-G45', title: 'Emergency Repair', crew: 'Team Delta' },
    ]
  },
]

const menuItems = [
  { text: 'Dashboard', icon: DashboardIcon, path: '/dashboard' },
  { text: 'Jobs', icon: WorkIcon, path: '/jobs' },
  { text: 'Schedule', icon: ScheduleIcon, path: '/schedule' },
  { text: 'Time Tracking', icon: TimeIcon, path: '/time' },
  { text: 'Customers', icon: PeopleIcon, path: '/customers' },
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

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/login')
      return
    }
    setUser(JSON.parse(storedUser))
  }, [router])

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
                <IconButton>
                  <ChevronLeft />
                </IconButton>
                <Typography variant="h6">
                  May 29 - June 4, 2025
                </Typography>
                <IconButton>
                  <ChevronRight />
                </IconButton>
              </Box>
            </CardContent>
          </Card>

          <Grid container spacing={3}>
            {mockScheduleData.map((day) => (
              <Grid item xs={12} md={6} key={day.date}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  {day.jobs.map((job, index) => (
                    <Card key={index} sx={{ mb: 2, backgroundColor: 'background.default' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary">
                              {job.time}
                            </Typography>
                            <Typography variant="body1">
                              {job.jobId} - {job.title}
                            </Typography>
                            <Chip
                              label={job.crew}
                              size="small"
                              sx={{ mt: 1 }}
                              color="primary"
                            />
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ mt: 4, p: 3, backgroundColor: 'background.paper', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              Crew Availability
            </Typography>
            <Grid container spacing={2}>
              {['Team Alpha', 'Team Bravo', 'Team Charlie', 'Team Delta'].map((crew) => (
                <Grid item xs={12} sm={6} md={3} key={crew}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1">{crew}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Available: 6 hours
                      </Typography>
                      <Chip label="Available" color="success" size="small" sx={{ mt: 1 }} />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Container>
      </Box>
    </Box>
  )
}