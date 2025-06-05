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
  AttachMoney,
  PendingActions,
  CheckCircle,
  Warning,
} from '@mui/icons-material'

const drawerWidth = 240

interface User {
  id: string
  email: string
  name: string
  role: string
}

const mockInvoices = [
  {
    id: 'INV-2025-001',
    jobId: '25-001-A12',
    customer: 'Johnson Residence',
    amount: '$2,450.00',
    dueDate: '2025-06-15',
    status: 'Sent',
    sentDate: '2025-05-15',
  },
  {
    id: 'INV-2025-002',
    jobId: '25-002-B34',
    customer: 'Tech Corp',
    amount: '$15,750.00',
    dueDate: '2025-06-30',
    status: 'Draft',
    sentDate: '-',
  },
  {
    id: 'INV-2025-003',
    jobId: '25-003-C56',
    customer: 'Smith Residence',
    amount: '$875.00',
    dueDate: '2025-05-30',
    status: 'Paid',
    sentDate: '2025-05-10',
  },
  {
    id: 'INV-2025-004',
    jobId: '25-004-D78',
    customer: 'Davis Home',
    amount: '$3,200.00',
    dueDate: '2025-06-20',
    status: 'Overdue',
    sentDate: '2025-05-05',
  },
  {
    id: 'INV-2025-005',
    jobId: '25-005-E90',
    customer: 'Brown Residence',
    amount: '$425.00',
    dueDate: '2025-06-10',
    status: 'Sent',
    sentDate: '2025-05-20',
  },
]

const invoiceStats = [
  { title: 'Total Outstanding', value: '$22,275', icon: AttachMoney, color: '#1d8cf8' },
  { title: 'Pending', value: '4', icon: PendingActions, color: '#fd5d93' },
  { title: 'Paid This Month', value: '$8,450', icon: CheckCircle, color: '#00bf9a' },
  { title: 'Overdue', value: '1', icon: Warning, color: '#ff8d72' },
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
    case 'Paid':
      return 'success'
    case 'Sent':
      return 'info'
    case 'Draft':
      return 'default'
    case 'Overdue':
      return 'error'
    default:
      return 'default'
  }
}

export default function InvoicingPage() {
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
            selected={item.path === '/invoicing'}
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
            Invoicing
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
              Invoicing
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
              Create Invoice
            </Button>
          </Box>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            {invoiceStats.map((stat) => (
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
                placeholder="Search invoices by ID, job, or customer..."
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
                  <TableCell>Invoice ID</TableCell>
                  <TableCell>Job ID</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Sent Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mockInvoices
                  .filter(invoice => 
                    invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    invoice.jobId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    invoice.customer.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((invoice) => (
                    <TableRow key={invoice.id} hover>
                      <TableCell>{invoice.id}</TableCell>
                      <TableCell>{invoice.jobId}</TableCell>
                      <TableCell>{invoice.customer}</TableCell>
                      <TableCell sx={{ fontWeight: 'medium' }}>{invoice.amount}</TableCell>
                      <TableCell>{invoice.dueDate}</TableCell>
                      <TableCell>{invoice.sentDate}</TableCell>
                      <TableCell>
                        <Chip
                          label={invoice.status}
                          color={getStatusColor(invoice.status) as any}
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