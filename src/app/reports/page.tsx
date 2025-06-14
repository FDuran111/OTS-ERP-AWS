'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
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
  Select,
  FormControl,
  InputLabel,
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
  Download as DownloadIcon,
  TrendingUp,
  AttachMoney,
  Engineering,
  Description,
} from '@mui/icons-material'

const drawerWidth = 240

interface User {
  id: string
  email: string
  name: string
  role: string
}

const reportTypes = [
  {
    title: 'Revenue Report',
    description: 'Monthly revenue breakdown by job type',
    icon: AttachMoney,
    color: '#1d8cf8',
    lastGenerated: '2025-05-25',
  },
  {
    title: 'Job Performance',
    description: 'Job completion rates and efficiency metrics',
    icon: TrendingUp,
    color: '#00bf9a',
    lastGenerated: '2025-05-24',
  },
  {
    title: 'Crew Productivity',
    description: 'Hours worked and productivity by crew',
    icon: Engineering,
    color: '#e14eca',
    lastGenerated: '2025-05-23',
  },
  {
    title: 'Material Usage',
    description: 'Material consumption and cost analysis',
    icon: InventoryIcon,
    color: '#fd5d93',
    lastGenerated: '2025-05-22',
  },
  {
    title: 'Customer Report',
    description: 'Customer job history and satisfaction',
    icon: PeopleIcon,
    color: '#ff8d72',
    lastGenerated: '2025-05-21',
  },
  {
    title: 'Invoice Summary',
    description: 'Outstanding invoices and payment history',
    icon: Description,
    color: '#00f2c3',
    lastGenerated: '2025-05-20',
  },
]

interface QuickStat {
  label: string
  value: string
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

export default function ReportsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [timeRange, setTimeRange] = useState('month')
  const [quickStats, setQuickStats] = useState<QuickStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/login')
      return
    }
    setUser(JSON.parse(storedUser))
    fetchQuickStats()
  }, [router, timeRange])

  const fetchQuickStats = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/reports/quick-stats?timeRange=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        
        const rangeLabelMap: Record<string, string> = {
          week: 'This Week',
          month: 'This Month', 
          quarter: 'This Quarter',
          year: 'This Year'
        }
        
        const rangeLabel = rangeLabelMap[timeRange] || 'This Month'
        
        setQuickStats([
          { 
            label: `Revenue ${rangeLabel}`, 
            value: `$${data.revenueThisPeriod.toLocaleString()}` 
          },
          { 
            label: 'Jobs Completed', 
            value: data.jobsCompleted.toString() 
          },
          { 
            label: 'Average Job Value', 
            value: `$${Math.round(data.averageJobValue).toLocaleString()}` 
          },
          { 
            label: 'Outstanding Invoices', 
            value: `$${data.outstandingInvoices.toLocaleString()}` 
          },
        ])
      }
    } catch (error) {
      console.error('Error fetching quick stats:', error)
      // Fallback to empty stats
      setQuickStats([
        { label: 'Revenue This Month', value: '$0' },
        { label: 'Jobs Completed', value: '0' },
        { label: 'Average Job Value', value: '$0' },
        { label: 'Outstanding Invoices', value: '$0' },
      ])
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

  const handleGenerateReport = async (reportType: string) => {
    try {
      const apiEndpoints: Record<string, string> = {
        'Revenue Report': '/api/reports/revenue',
        'Job Performance': '/api/reports/job-performance',
        'Crew Productivity': '/api/reports/crew-productivity',
        'Material Usage': '/api/reports/material-usage',
        'Customer Report': '/api/reports/customer',
        'Invoice Summary': '/api/reports/invoice-summary'
      }

      const endpoint = apiEndpoints[reportType]
      if (!endpoint) {
        alert('Report type not implemented yet')
        return
      }

      const response = await fetch(`${endpoint}?timeRange=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        
        // For now, show the data in console and alert
        console.log(`${reportType} Data:`, data)
        alert(`${reportType} generated successfully! Check console for data. In a real app, this would download a PDF or open a detailed report view.`)
      } else {
        throw new Error('Failed to generate report')
      }
    } catch (error) {
      console.error('Error generating report:', error)
      alert('Failed to generate report. Please try again.')
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
            selected={item.path === '/reports'}
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
            Reports
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
              Reports & Analytics
            </Typography>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                label="Time Range"
              >
                <MenuItem value="week">This Week</MenuItem>
                <MenuItem value="month">This Month</MenuItem>
                <MenuItem value="quarter">This Quarter</MenuItem>
                <MenuItem value="year">This Year</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            {quickStats.map((stat) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.label}>
                <Paper sx={{ p: 2 }}>
                  <Typography color="text.secondary" variant="caption">
                    {stat.label}
                  </Typography>
                  <Typography variant="h5">{stat.value}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Typography variant="h6" sx={{ mb: 2 }}>
            Available Reports
          </Typography>
          <Grid container spacing={3}>
            {reportTypes.map((report) => (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={report.title}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 48,
                          height: 48,
                          borderRadius: '12px',
                          backgroundColor: `${report.color}20`,
                          mr: 2,
                        }}
                      >
                        <report.icon sx={{ color: report.color }} />
                      </Box>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6">{report.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {report.description}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        Last generated: {report.lastGenerated}
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<DownloadIcon />}
                        sx={{ color: report.color }}
                        onClick={() => handleGenerateReport(report.title)}
                      >
                        Generate
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Card sx={{ mt: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              <List>
                <ListItemText
                  primary="Monthly Revenue Report generated"
                  secondary="Generated by Sarah Johnson - 2 hours ago"
                />
                <Divider />
                <ListItemText
                  primary="Crew Productivity Report exported"
                  secondary="Exported by Mike Davis - Yesterday at 4:30 PM"
                />
                <Divider />
                <ListItemText
                  primary="Customer Satisfaction Report created"
                  secondary="Created by Admin - 3 days ago"
                />
              </List>
            </CardContent>
          </Card>
        </Container>
      </Box>
    </Box>
  )
}