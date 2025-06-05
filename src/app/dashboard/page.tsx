'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
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
  Logout as LogoutIcon,
  Menu as MenuIcon,
  AttachMoney,
  AccessTime,
  Group,
} from '@mui/icons-material'

const drawerWidth = 240

interface User {
  id: string
  email: string
  name: string
  role: string
}

const stats = [
  {
    title: 'Active Jobs',
    value: '12',
    change: '+2 from last week',
    icon: WorkIcon,
    color: '#E53E3E', // Ortmeier red
  },
  {
    title: 'Hours Today',
    value: '48',
    subtitle: '6 crews active',
    icon: AccessTime,
    color: '#F6E05E', // Safety yellow
  },
  {
    title: 'Revenue MTD',
    value: '$45,231',
    change: '+20.1% from last month',
    icon: AttachMoney,
    color: '#68D391', // Success green
  },
  {
    title: 'Active Crews',
    value: '8',
    subtitle: 'All crews available',
    icon: Group,
    color: '#63B3ED', // Info blue
  },
]

const recentJobs = [
  { id: '25-001-A12', title: 'Service Call - Panel Upgrade', status: 'In Progress', color: 'success' },
  { id: '25-002-B34', title: 'Commercial - Office Buildout', status: 'Scheduled', color: 'warning' },
  { id: '25-003-C56', title: 'Service Call - Outlet Repair', status: 'Completed', color: 'info' },
]

const menuItems = [
  { text: 'Dashboard', icon: DashboardIcon, path: '/dashboard' },
  { text: 'Jobs', icon: WorkIcon, path: '/jobs' },
  { text: 'Schedule', icon: ScheduleIcon, path: '/schedule' },
  { text: 'Customers', icon: PeopleIcon, path: '/customers' },
  { text: 'Materials', icon: InventoryIcon, path: '/materials' },
  { text: 'Invoicing', icon: ReceiptIcon, path: '/invoicing' },
  { text: 'Reports', icon: AssessmentIcon, path: '/reports' },
  { text: 'Settings', icon: SettingsIcon, path: '/settings' },
]

export default function DashboardPage() {
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
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(225, 78, 202, 0.08)',
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
            Dashboard
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
          <Typography variant="h4" sx={{ mb: 1 }}>
            Welcome back, {user.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Here's what's happening with your jobs today
          </Typography>

          <Grid container spacing={3}>
            {stats.map((stat) => (
              <Grid item xs={12} sm={6} md={3} key={stat.title}>
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
                        <stat.icon sx={{ color: stat.color }} />
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
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Recent Jobs
                  </Typography>
                  <List>
                    {recentJobs.map((job) => (
                      <ListItem
                        key={job.id}
                        secondaryAction={
                          <Chip
                            label={job.status}
                            color={job.color as any}
                            size="small"
                          />
                        }
                      >
                        <ListItemText
                          primary={job.id}
                          secondary={job.title}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Upcoming Schedule
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Tomorrow - 8:00 AM"
                        secondary={
                          <Stack>
                            <Typography variant="body2">
                              25-004-D78 - Residential Rewire
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Crew: Team Alpha
                            </Typography>
                          </Stack>
                        }
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Tomorrow - 10:00 AM"
                        secondary={
                          <Stack>
                            <Typography variant="body2">
                              25-005-E90 - Service Call
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Crew: Team Bravo
                            </Typography>
                          </Stack>
                        }
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  )
}