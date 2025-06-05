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
  TextField,
  InputAdornment,
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
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material'

const drawerWidth = 240

interface User {
  id: string
  email: string
  name: string
  role: string
}

const mockJobs = [
  {
    id: '25-001-A12',
    title: 'Service Call - Panel Upgrade',
    customer: 'Johnson Residence',
    status: 'In Progress',
    priority: 'High',
    dueDate: '2025-05-30',
    crew: 'Team Alpha',
  },
  {
    id: '25-002-B34',
    title: 'Commercial - Office Buildout',
    customer: 'Tech Corp',
    status: 'Scheduled',
    priority: 'Medium',
    dueDate: '2025-06-01',
    crew: 'Team Bravo',
  },
  {
    id: '25-003-C56',
    title: 'Service Call - Outlet Repair',
    customer: 'Smith Residence',
    status: 'Completed',
    priority: 'Low',
    dueDate: '2025-05-27',
    crew: 'Team Charlie',
  },
  {
    id: '25-004-D78',
    title: 'Residential Rewire',
    customer: 'Davis Home',
    status: 'Scheduled',
    priority: 'High',
    dueDate: '2025-05-29',
    crew: 'Team Alpha',
  },
  {
    id: '25-005-E90',
    title: 'Emergency Service - Power Outage',
    customer: 'Brown Residence',
    status: 'In Progress',
    priority: 'High',
    dueDate: '2025-05-28',
    crew: 'Team Delta',
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

const getStatusColor = (status: string) => {
  switch (status) {
    case 'In Progress':
      return 'success'
    case 'Scheduled':
      return 'warning'
    case 'Completed':
      return 'info'
    default:
      return 'default'
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'High':
      return 'error'
    case 'Medium':
      return 'warning'
    case 'Low':
      return 'info'
    default:
      return 'default'
  }
}

export default function JobsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [searchTerm, setSearchTerm] = useState('')

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
            selected={item.path === '/jobs'}
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
            Jobs
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
              Job Management
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              sx={{
                backgroundColor: '#e14eca',
                '&:hover': {
                  backgroundColor: '#d236b8',
                },
              }}
            >
              New Job
            </Button>
          </Box>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <TextField
                fullWidth
                placeholder="Search jobs by ID, title, or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </CardContent>
          </Card>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Job ID</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Crew</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mockJobs
                  .filter(job => 
                    job.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    job.customer.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((job) => (
                    <TableRow key={job.id} hover>
                      <TableCell>{job.id}</TableCell>
                      <TableCell>{job.title}</TableCell>
                      <TableCell>{job.customer}</TableCell>
                      <TableCell>
                        <Chip
                          label={job.status}
                          color={getStatusColor(job.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={job.priority}
                          color={getPriorityColor(job.priority) as any}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{job.dueDate}</TableCell>
                      <TableCell>{job.crew}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small">
                          <MoreVertIcon />
                        </IconButton>
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