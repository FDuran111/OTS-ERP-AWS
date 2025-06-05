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
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Warning,
  CheckCircle,
  Error,
} from '@mui/icons-material'

const drawerWidth = 240

interface User {
  id: string
  email: string
  name: string
  role: string
}

const mockMaterials = [
  {
    id: 'MAT001',
    name: '12 AWG THHN Wire - Black',
    category: 'Wire',
    quantity: 2500,
    unit: 'ft',
    minStock: 1000,
    location: 'A1-B2',
    cost: '$0.45/ft',
    status: 'In Stock',
  },
  {
    id: 'MAT002',
    name: '200A Main Breaker Panel',
    category: 'Panels',
    quantity: 5,
    unit: 'units',
    minStock: 3,
    location: 'C3-D1',
    cost: '$425.00',
    status: 'In Stock',
  },
  {
    id: 'MAT003',
    name: 'Duplex Receptacle - White',
    category: 'Devices',
    quantity: 45,
    unit: 'units',
    minStock: 50,
    location: 'B2-C4',
    cost: '$3.25',
    status: 'Low Stock',
  },
  {
    id: 'MAT004',
    name: '1/2" EMT Conduit',
    category: 'Conduit',
    quantity: 0,
    unit: 'sticks',
    minStock: 20,
    location: 'D1-E2',
    cost: '$8.50',
    status: 'Out of Stock',
  },
  {
    id: 'MAT005',
    name: 'Single Pole Switch - Ivory',
    category: 'Devices',
    quantity: 120,
    unit: 'units',
    minStock: 25,
    location: 'B2-C5',
    cost: '$2.75',
    status: 'In Stock',
  },
]

const inventoryStats = [
  { title: 'Total Items', value: '156', icon: InventoryIcon, color: '#1d8cf8' },
  { title: 'Low Stock', value: '12', icon: Warning, color: '#fd5d93' },
  { title: 'Out of Stock', value: '3', icon: Error, color: '#ff8d72' },
  { title: 'In Stock', value: '141', icon: CheckCircle, color: '#00bf9a' },
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
    case 'In Stock':
      return 'success'
    case 'Low Stock':
      return 'warning'
    case 'Out of Stock':
      return 'error'
    default:
      return 'default'
  }
}

export default function MaterialsPage() {
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
            selected={item.path === '/materials'}
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
            Materials & Inventory
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
              Materials & Inventory
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
              Add Material
            </Button>
          </Box>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            {inventoryStats.map((stat) => (
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
              <TextField
                fullWidth
                placeholder="Search materials by name, ID, or category..."
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
                  <TableCell>Category</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Min Stock</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Unit Cost</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mockMaterials
                  .filter(material => 
                    material.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    material.category.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((material) => (
                    <TableRow key={material.id} hover>
                      <TableCell>{material.id}</TableCell>
                      <TableCell>{material.name}</TableCell>
                      <TableCell>{material.category}</TableCell>
                      <TableCell>
                        {material.quantity} {material.unit}
                      </TableCell>
                      <TableCell>
                        {material.minStock} {material.unit}
                      </TableCell>
                      <TableCell>{material.location}</TableCell>
                      <TableCell>{material.cost}</TableCell>
                      <TableCell>
                        <Chip
                          label={material.status}
                          color={getStatusColor(material.status) as any}
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