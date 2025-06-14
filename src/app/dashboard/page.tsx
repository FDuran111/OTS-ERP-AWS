'use client'

import React, { useState, useEffect } from 'react'
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
  TrendingUp,
} from '@mui/icons-material'

const drawerWidth = 240

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
}

const colorMap = {
  'primary': '#E53E3E', // Ortmeier red
  'success': '#68D391', // Success green
  'warning': '#F6E05E', // Safety yellow
  'info': '#63B3ED', // Info blue
}

const menuItems = [
  { text: 'Dashboard', icon: DashboardIcon, path: '/dashboard' },
  { text: 'Jobs', icon: WorkIcon, path: '/jobs' },
  { text: 'Schedule', icon: ScheduleIcon, path: '/schedule' },
  { text: 'Time Tracking', icon: AccessTime, path: '/time' },
  { text: 'Customers', icon: PeopleIcon, path: '/customers' },
  { text: 'Leads', icon: TrendingUp, path: '/leads' },
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
  const [stats, setStats] = useState<Stat[]>([])
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([])
  const [phaseData, setPhaseData] = useState<PhaseData | null>(null)
  const [loading, setLoading] = useState(true)

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
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
                  <Card>
                    <CardContent>
                      <Typography>Loading...</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            ) : (
              stats.map((stat) => (
                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.title}>
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
                </Grid>
              ))
            )}
          </Grid>

          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid size={{ xs: 12, md: 6 }}>
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
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Job Phases Progress
                  </Typography>
                  {loading ? (
                    <Typography>Loading phases...</Typography>
                  ) : phaseData ? (
                    <Box>
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid size={4}>
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
                        </Grid>
                        <Grid size={4}>
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
                        </Grid>
                        <Grid size={4}>
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
        </Container>
      </Box>
    </Box>
  )
}