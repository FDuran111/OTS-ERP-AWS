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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
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
  PlayArrow,
  Stop,
  Timer,
  Today,
  Group,
} from '@mui/icons-material'

const drawerWidth = 240

interface User {
  id: string
  email: string
  name: string
  role: string
}

const mockTimeEntries = [
  {
    id: 1,
    employee: 'John Smith',
    jobId: '25-001-A12',
    jobTitle: 'Panel Upgrade',
    date: '2025-05-28',
    startTime: '8:00 AM',
    endTime: '12:30 PM',
    hours: 4.5,
    status: 'Approved',
  },
  {
    id: 2,
    employee: 'Mike Johnson',
    jobId: '25-002-B34',
    jobTitle: 'Office Buildout',
    date: '2025-05-28',
    startTime: '7:30 AM',
    endTime: '3:30 PM',
    hours: 8.0,
    status: 'Pending',
  },
  {
    id: 3,
    employee: 'Sarah Davis',
    jobId: '25-003-C56',
    jobTitle: 'Outlet Repair',
    date: '2025-05-27',
    startTime: '9:00 AM',
    endTime: '11:00 AM',
    hours: 2.0,
    status: 'Approved',
  },
  {
    id: 4,
    employee: 'Tom Wilson',
    jobId: '25-004-D78',
    jobTitle: 'Residential Rewire',
    date: '2025-05-28',
    startTime: '8:00 AM',
    endTime: 'Active',
    hours: 0,
    status: 'Active',
  },
]

const activeTimers = [
  {
    employee: 'Tom Wilson',
    jobId: '25-004-D78',
    jobTitle: 'Residential Rewire',
    startTime: '8:00 AM',
    elapsed: '3h 45m',
  },
  {
    employee: 'Lisa Brown',
    jobId: '25-005-E90',
    jobTitle: 'Emergency Service',
    startTime: '10:30 AM',
    elapsed: '1h 15m',
  },
]

const timeStats = [
  { title: 'Hours Today', value: '42.5', icon: Timer, color: '#1d8cf8' },
  { title: 'Active Timers', value: '2', icon: PlayArrow, color: '#00bf9a' },
  { title: 'This Week', value: '156h', icon: Today, color: '#e14eca' },
  { title: 'Employees', value: '12', icon: Group, color: '#fd5d93' },
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

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Active':
      return 'success'
    case 'Pending':
      return 'warning'
    case 'Approved':
      return 'info'
    default:
      return 'default'
  }
}

export default function TimePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

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
            selected={item.path === '/time'}
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
            Time Tracking
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
              Time Tracking
            </Typography>
            <Button
              variant="contained"
              startIcon={<PlayArrow />}
              sx={{
                backgroundColor: '#00bf9a',
                '&:hover': {
                  backgroundColor: '#00a884',
                },
              }}
            >
              Start Timer
            </Button>
          </Box>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            {timeStats.map((stat) => (
              <Grid item xs={12} sm={6} md={3} key={stat.title}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
                        <stat.icon sx={{ color: stat.color }} />
                      </Box>
                      <Box>
                        <Typography color="text.secondary" variant="caption">
                          {stat.title}
                        </Typography>
                        <Typography variant="h5">{stat.value}</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Active Timers
              </Typography>
              <Grid container spacing={2}>
                {activeTimers.map((timer, index) => (
                  <Grid item xs={12} md={6} key={index}>
                    <Paper sx={{ p: 2, backgroundColor: 'background.default' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="subtitle1">{timer.employee}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {timer.jobId} - {timer.jobTitle}
                          </Typography>
                          <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Started: {timer.startTime}
                            </Typography>
                            <Chip label={timer.elapsed} color="success" size="small" />
                          </Stack>
                        </Box>
                        <IconButton color="error">
                          <Stop />
                        </IconButton>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          <Typography variant="h6" sx={{ mb: 2 }}>
            Recent Time Entries
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Job</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Start Time</TableCell>
                  <TableCell>End Time</TableCell>
                  <TableCell>Hours</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mockTimeEntries.map((entry) => (
                  <TableRow key={entry.id} hover>
                    <TableCell>{entry.employee}</TableCell>
                    <TableCell>
                      <Stack>
                        <Typography variant="body2">{entry.jobId}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {entry.jobTitle}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{entry.date}</TableCell>
                    <TableCell>{entry.startTime}</TableCell>
                    <TableCell>{entry.endTime}</TableCell>
                    <TableCell>{entry.hours || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={entry.status}
                        color={getStatusColor(entry.status) as any}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Container>
      </Box>
    </Box>
  )
}