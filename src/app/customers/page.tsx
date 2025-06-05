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
  PersonAdd as PersonAddIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Phone,
  Email,
  LocationOn,
} from '@mui/icons-material'

const drawerWidth = 240

interface User {
  id: string
  email: string
  name: string
  role: string
}

const mockCustomers = [
  {
    id: 'C001',
    name: 'Johnson Residence',
    type: 'Residential',
    phone: '(555) 123-4567',
    email: 'johnson@email.com',
    address: '123 Main St, Anytown, ST 12345',
    totalJobs: 5,
    status: 'Active',
  },
  {
    id: 'C002',
    name: 'Tech Corp',
    type: 'Commercial',
    phone: '(555) 234-5678',
    email: 'contact@techcorp.com',
    address: '456 Business Blvd, Suite 100, Anytown, ST 12345',
    totalJobs: 12,
    status: 'Active',
  },
  {
    id: 'C003',
    name: 'Smith Residence',
    type: 'Residential',
    phone: '(555) 345-6789',
    email: 'smith.family@email.com',
    address: '789 Oak Lane, Anytown, ST 12345',
    totalJobs: 3,
    status: 'Active',
  },
  {
    id: 'C004',
    name: 'Davis Home',
    type: 'Residential',
    phone: '(555) 456-7890',
    email: 'davis@email.com',
    address: '321 Elm Street, Anytown, ST 12345',
    totalJobs: 2,
    status: 'Inactive',
  },
  {
    id: 'C005',
    name: 'Brown Residence',
    type: 'Residential',
    phone: '(555) 567-8901',
    email: 'brown.res@email.com',
    address: '654 Pine Road, Anytown, ST 12345',
    totalJobs: 8,
    status: 'Active',
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

export default function CustomersPage() {
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
            selected={item.path === '/customers'}
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
            Customers
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
              Customer Management
            </Typography>
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              sx={{
                backgroundColor: '#e14eca',
                '&:hover': {
                  backgroundColor: '#d236b8',
                },
              }}
            >
              New Customer
            </Button>
          </Box>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <TextField
                fullWidth
                placeholder="Search customers by name, email, or phone..."
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
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell>Total Jobs</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mockCustomers
                  .filter(customer => 
                    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    customer.phone.includes(searchTerm)
                  )
                  .map((customer) => (
                    <TableRow key={customer.id} hover>
                      <TableCell>{customer.id}</TableCell>
                      <TableCell>{customer.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={customer.type}
                          color={customer.type === 'Commercial' ? 'primary' : 'default'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Phone sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2">{customer.phone}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Email sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2">{customer.email}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2">{customer.address}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{customer.totalJobs}</TableCell>
                      <TableCell>
                        <Chip
                          label={customer.status}
                          color={customer.status === 'Active' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
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