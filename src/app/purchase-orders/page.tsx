'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
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
  CircularProgress,
  Alert,
  Grid,
  FormControl,
  InputLabel,
  Select,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  Badge,
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
  ShoppingCart as PurchaseOrderIcon,
  CheckCircle as ApprovedIcon,
  Schedule as PendingIcon,
  Cancel as RejectedIcon,
  Send as SentIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  TrendingUp,
} from '@mui/icons-material'
import CreatePurchaseOrderDialog from '@/components/purchase-orders/CreatePurchaseOrderDialog'
import EditPurchaseOrderDialog from '@/components/purchase-orders/EditPurchaseOrderDialog'
import PurchaseOrderDetailsDialog from '@/components/purchase-orders/PurchaseOrderDetailsDialog'
import ApprovalQueueDialog from '@/components/purchase-orders/ApprovalQueueDialog'

const drawerWidth = 240

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface PurchaseOrder {
  id: string
  poNumber: string
  vendorId: string
  vendorName?: string
  jobId?: string
  jobNumber?: string
  jobTitle?: string
  createdBy: string
  createdByName?: string
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SENT' | 'RECEIVED' | 'CANCELLED'
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  orderDate: Date
  requiredDate?: Date
  totalAmount: number
  approvedBy?: string
  approvedByName?: string
  approvedAt?: Date
  createdAt: Date
  updatedAt: Date
}

interface Stats {
  title: string
  value: string
  icon: React.ReactElement
  color: string
}

const menuItems = [
  { text: 'Dashboard', icon: DashboardIcon, path: '/dashboard' },
  { text: 'Jobs', icon: WorkIcon, path: '/jobs' },
  { text: 'Schedule', icon: ScheduleIcon, path: '/schedule' },
  { text: 'Time Tracking', icon: TimeIcon, path: '/time' },
  { text: 'Customers', icon: PeopleIcon, path: '/customers' },
  { text: 'Leads', icon: TrendingUp, path: '/leads' },
  { text: 'Materials', icon: InventoryIcon, path: '/materials' },
  { text: 'Purchase Orders', icon: PurchaseOrderIcon, path: '/purchase-orders' },
  { text: 'Invoicing', icon: ReceiptIcon, path: '/invoicing' },
  { text: 'Reports', icon: AssessmentIcon, path: '/reports' },
  { text: 'Settings', icon: SettingsIcon, path: '/settings' },
]

const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  switch (status) {
    case 'APPROVED':
      return 'success'
    case 'PENDING_APPROVAL':
      return 'warning'
    case 'REJECTED':
    case 'CANCELLED':
      return 'error'
    case 'SENT':
      return 'info'
    case 'RECEIVED':
      return 'primary'
    default:
      return 'default'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'APPROVED':
      return <ApprovedIcon />
    case 'PENDING_APPROVAL':
      return <PendingIcon />
    case 'REJECTED':
    case 'CANCELLED':
      return <RejectedIcon />
    case 'SENT':
      return <SentIcon />
    default:
      return <PurchaseOrderIcon />
  }
}

export default function PurchaseOrdersPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [vendorFilter, setVendorFilter] = useState('')
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [stats, setStats] = useState<Stats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [approvalQueueOpen, setApprovalQueueOpen] = useState(false)
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0)
  const [availableVendors, setAvailableVendors] = useState<string[]>([])

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/login')
      return
    }
    setUser(JSON.parse(storedUser))
  }, [router])

  useEffect(() => {
    if (user) {
      fetchPurchaseOrders()
      fetchPendingApprovalsCount()
    }
  }, [user])

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch('/api/purchase-orders', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch purchase orders: ${response.status}`)
      }
      
      const data = await response.json()
      setPurchaseOrders(data.data || [])
      
      // Extract unique vendors for filters
      const vendors = [...new Set(data.data.map((po: PurchaseOrder) => po.vendorName).filter(Boolean))] as string[]
      setAvailableVendors(vendors.sort())
      
      // Calculate stats
      const orders = data.data || []
      const totalOrders = orders.length
      const pendingOrders = orders.filter((po: PurchaseOrder) => po.status === 'PENDING_APPROVAL').length
      const approvedOrders = orders.filter((po: PurchaseOrder) => po.status === 'APPROVED').length
      const totalValue = orders.reduce((sum: number, po: PurchaseOrder) => sum + po.totalAmount, 0)
      
      setStats([
        {
          title: 'Total Orders',
          value: totalOrders.toString(),
          icon: <PurchaseOrderIcon />,
          color: '#2196f3'
        },
        {
          title: 'Pending Approval',
          value: pendingOrders.toString(),
          icon: <PendingIcon />,
          color: '#ff9800'
        },
        {
          title: 'Approved',
          value: approvedOrders.toString(),
          icon: <ApprovedIcon />,
          color: '#4caf50'
        },
        {
          title: 'Total Value',
          value: `$${totalValue.toLocaleString()}`,
          icon: <ReceiptIcon />,
          color: '#9c27b0'
        }
      ])
      
    } catch (error) {
      console.error('Error fetching purchase orders:', error)
      
      if (error instanceof Error && error.name === 'AbortError') {
        setError('Request timed out after 5 seconds - click Retry')
      } else {
        setError('Failed to load purchase orders')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingApprovalsCount = async () => {
    try {
      const response = await fetch('/api/purchase-orders/approval', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      
      if (response.ok) {
        const data = await response.json()
        setPendingApprovalsCount(data.summary?.totalPending || 0)
      }
    } catch (error) {
      console.error('Error fetching pending approvals count:', error)
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

  const handleCreatePO = () => {
    setCreateDialogOpen(true)
  }

  const handleEditPO = (po: PurchaseOrder) => {
    setSelectedPO(po)
    setEditDialogOpen(true)
  }

  const handleViewDetails = (po: PurchaseOrder) => {
    setSelectedPO(po)
    setDetailsDialogOpen(true)
  }

  const handlePOCreated = () => {
    fetchPurchaseOrders()
    fetchPendingApprovalsCount()
  }

  const handlePOUpdated = () => {
    fetchPurchaseOrders()
    fetchPendingApprovalsCount()
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('')
    setVendorFilter('')
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
            selected={item.path === '/purchase-orders'}
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

  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch = !searchTerm || 
      po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (po.vendorName && po.vendorName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (po.jobNumber && po.jobNumber.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = !statusFilter || po.status === statusFilter
    const matchesVendor = !vendorFilter || po.vendorName === vendorFilter
    
    return matchesSearch && matchesStatus && matchesVendor
  })

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
            Purchase Orders
          </Typography>
          
          {/* Approval Queue Button */}
          <IconButton
            color="inherit"
            onClick={() => setApprovalQueueOpen(true)}
            sx={{ mr: 2 }}
          >
            <Badge badgeContent={pendingApprovalsCount} color="error">
              <PendingIcon />
            </Badge>
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
            <Typography variant="h4">
              Purchase Orders
            </Typography>
            <Button
              variant="outlined"
              onClick={fetchPurchaseOrders}
              disabled={loading}
              startIcon={<RefreshIcon />}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </Box>

          {/* Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {stats.map((stat) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.title}>
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
                        {React.cloneElement(stat.icon as any, { sx: { color: stat.color } })}
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

          {/* Search and Filters */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Search & Filters
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
                <TextField
                  placeholder="Search by PO number, vendor, or job..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ flex: 1, minWidth: 250 }}
                />
                
                <FormControl sx={{ minWidth: 150 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    label="Status"
                    size="small"
                  >
                    <MenuItem value="">All Statuses</MenuItem>
                    <MenuItem value="DRAFT">Draft</MenuItem>
                    <MenuItem value="PENDING_APPROVAL">Pending Approval</MenuItem>
                    <MenuItem value="APPROVED">Approved</MenuItem>
                    <MenuItem value="REJECTED">Rejected</MenuItem>
                    <MenuItem value="SENT">Sent</MenuItem>
                    <MenuItem value="RECEIVED">Received</MenuItem>
                    <MenuItem value="CANCELLED">Cancelled</MenuItem>
                  </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 150 }}>
                  <InputLabel>Vendor</InputLabel>
                  <Select
                    value={vendorFilter}
                    onChange={(e) => setVendorFilter(e.target.value)}
                    label="Vendor"
                    size="small"
                  >
                    <MenuItem value="">All Vendors</MenuItem>
                    {availableVendors.map((vendor) => (
                      <MenuItem key={vendor} value={vendor}>
                        {vendor}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {(searchTerm || statusFilter || vendorFilter) && (
                  <Button
                    variant="outlined"
                    onClick={clearFilters}
                    startIcon={<ClearIcon />}
                    size="small"
                  >
                    Clear
                  </Button>
                )}
              </Box>

              {(searchTerm || statusFilter || vendorFilter) && (
                <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Showing {filteredPOs.length} of {purchaseOrders.length} purchase orders
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 3 }}
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={fetchPurchaseOrders}
                >
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          {/* Purchase Orders Table */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>PO Number</TableCell>
                    <TableCell>Vendor</TableCell>
                    <TableCell>Job</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Total Amount</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Required Date</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPOs.map((po) => (
                    <TableRow key={po.id} hover onClick={() => handleViewDetails(po)} sx={{ cursor: 'pointer' }}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {po.poNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {po.vendorName || 'Unknown Vendor'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {po.jobNumber ? (
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {po.jobNumber}
                            </Typography>
                            {po.jobTitle && (
                              <Typography variant="caption" color="text.secondary">
                                {po.jobTitle}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No Job
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={po.status.replace('_', ' ')}
                          color={getStatusColor(po.status)}
                          size="small"
                          icon={getStatusIcon(po.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          ${po.totalAmount.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(po.createdAt).toLocaleDateString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          by {po.createdByName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {po.requiredDate ? (
                          <Typography variant="body2">
                            {new Date(po.requiredDate).toLocaleDateString()}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Not specified
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton 
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditPO(po)
                          }}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredPOs.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography color="text.secondary">
                          No purchase orders found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Container>
      </Box>

      {/* Floating Action Button for Mobile */}
      <Fab
        color="primary"
        aria-label="add purchase order"
        onClick={handleCreatePO}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          backgroundColor: '#e14eca',
          '&:hover': {
            backgroundColor: '#d236b8',
          },
        }}
      >
        <AddIcon />
      </Fab>

      {/* Dialogs */}
      <CreatePurchaseOrderDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onPurchaseOrderCreated={handlePOCreated}
        currentUser={user}
      />

      <EditPurchaseOrderDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false)
          setSelectedPO(null)
        }}
        onPurchaseOrderUpdated={handlePOUpdated}
        purchaseOrder={selectedPO}
        currentUser={user}
      />

      <PurchaseOrderDetailsDialog
        open={detailsDialogOpen}
        onClose={() => {
          setDetailsDialogOpen(false)
          setSelectedPO(null)
        }}
        purchaseOrder={selectedPO}
      />

      <ApprovalQueueDialog
        open={approvalQueueOpen}
        onClose={() => setApprovalQueueOpen(false)}
      />
    </Box>
  )
}