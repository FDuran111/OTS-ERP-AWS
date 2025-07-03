'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
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
  MenuItem,
} from '@mui/material'
import {
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
} from '@mui/icons-material'
import ResponsiveLayout from '@/components/layout/ResponsiveLayout'
import ResponsiveContainer from '@/components/layout/ResponsiveContainer'
import CreatePurchaseOrderDialog from '@/components/purchase-orders/CreatePurchaseOrderDialog'
import EditPurchaseOrderDialog from '@/components/purchase-orders/EditPurchaseOrderDialog'
import PurchaseOrderDetailsDialog from '@/components/purchase-orders/PurchaseOrderDetailsDialog'
import ApprovalQueueDialog from '@/components/purchase-orders/ApprovalQueueDialog'

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
  deliveryDate?: Date
  totalAmount: number
  notes?: string
  createdAt: Date
  updatedAt: Date
}

interface Stats {
  pendingApproval: number
  draft: number
  approved: number
  totalThisMonth: number
  avgProcessingTime: number
}

const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  switch (status) {
    case 'APPROVED':
      return 'success'
    case 'PENDING_APPROVAL':
      return 'warning'
    case 'REJECTED':
      return 'error'
    case 'SENT':
      return 'primary'
    case 'RECEIVED':
      return 'success'
    case 'DRAFT':
      return 'default'
    case 'CANCELLED':
      return 'error'
    default:
      return 'default'
  }
}

const getPriorityColor = (priority?: string): 'default' | 'error' | 'warning' | 'info' => {
  switch (priority) {
    case 'URGENT':
      return 'error'
    case 'HIGH':
      return 'warning'
    case 'NORMAL':
      return 'info'
    case 'LOW':
      return 'default'
    default:
      return 'default'
  }
}

export default function PurchaseOrdersPage() {
  const router = useRouter()
  const { user: authUser } = useAuth()
  const [user, setUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [stats, setStats] = useState<Stats>({
    pendingApproval: 0,
    draft: 0,
    approved: 0,
    totalThisMonth: 0,
    avgProcessingTime: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [approvalQueueOpen, setApprovalQueueOpen] = useState(false)
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/login')
      return
    }
    setUser(JSON.parse(storedUser))
    fetchPurchaseOrders()
    fetchStats()
  }, [router])

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/purchase-orders')
      if (!response.ok) {
        throw new Error('Failed to fetch purchase orders')
      }
      const data = await response.json()
      setPurchaseOrders(data)
      setError(null)
    } catch (err) {
      setError('Failed to load purchase orders')
      console.error('Error fetching purchase orders:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/purchase-orders/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
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

  const handleDeletePO = async (id: string) => {
    if (!confirm('Are you sure you want to delete this purchase order?')) {
      return
    }

    try {
      const response = await fetch(`/api/purchase-orders/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete purchase order')
      }

      await fetchPurchaseOrders()
      await fetchStats()
    } catch (error) {
      console.error('Error deleting purchase order:', error)
      alert('Failed to delete purchase order')
    }
  }

  const handlePOCreated = () => {
    fetchPurchaseOrders()
    fetchStats()
  }

  const handlePOUpdated = () => {
    fetchPurchaseOrders()
    fetchStats()
  }

  const handleApprovalComplete = () => {
    fetchPurchaseOrders()
    fetchStats()
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch = searchTerm === '' || 
      po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.jobNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'ALL' || po.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  if (!user) return null


  return (
    <ResponsiveLayout>
      <ResponsiveContainer
        title="Purchase Orders"
        subtitle="Manage purchase orders and approvals"
        actions={
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Badge badgeContent={stats.pendingApproval} color="warning">
              <Button
                variant="outlined"
                onClick={() => setApprovalQueueOpen(true)}
                disabled={stats.pendingApproval === 0}
              >
                Approval Queue
              </Button>
            </Badge>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreatePO}
              sx={{
                backgroundColor: '#e14eca',
                '&:hover': {
                  backgroundColor: '#d236b8',
                },
              }}
            >
              Create PO
            </Button>
          </Box>
        }
      >
        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Pending Approval
                    </Typography>
                    <Typography variant="h4">
                      {stats.pendingApproval}
                    </Typography>
                  </Box>
                  <PendingIcon sx={{ fontSize: 40, color: 'warning.main', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Draft
                    </Typography>
                    <Typography variant="h4">
                      {stats.draft}
                    </Typography>
                  </Box>
                  <PurchaseOrderIcon sx={{ fontSize: 40, color: 'info.main', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Approved
                    </Typography>
                    <Typography variant="h4">
                      {stats.approved}
                    </Typography>
                  </Box>
                  <ApprovedIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Total This Month
                    </Typography>
                    <Typography variant="h4">
                      {stats.totalThisMonth}
                    </Typography>
                  </Box>
                  <SentIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Search and Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                sx={{ flex: 1, minWidth: 300 }}
                variant="outlined"
                placeholder="Search by PO number, vendor, or job..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchTerm('')}>
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Status Filter</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status Filter"
                  startAdornment={
                    <InputAdornment position="start">
                      <FilterIcon />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="ALL">All Statuses</MenuItem>
                  <MenuItem value="DRAFT">Draft</MenuItem>
                  <MenuItem value="PENDING_APPROVAL">Pending Approval</MenuItem>
                  <MenuItem value="APPROVED">Approved</MenuItem>
                  <MenuItem value="REJECTED">Rejected</MenuItem>
                  <MenuItem value="SENT">Sent</MenuItem>
                  <MenuItem value="RECEIVED">Received</MenuItem>
                  <MenuItem value="CANCELLED">Cancelled</MenuItem>
                </Select>
              </FormControl>
              <IconButton onClick={fetchPurchaseOrders} sx={{ alignSelf: 'center' }}>
                <RefreshIcon />
              </IconButton>
            </Box>
          </CardContent>
        </Card>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

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
                  <TableCell>Amount</TableCell>
                  <TableCell>Order Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPOs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No purchase orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPOs.map((po) => (
                    <TableRow key={po.id} hover>
                      <TableCell>{po.poNumber}</TableCell>
                      <TableCell>{po.vendorName || 'Unknown Vendor'}</TableCell>
                      <TableCell>
                        {po.jobNumber ? (
                          <Box>
                            <Typography variant="body2">{po.jobNumber}</Typography>
                            {po.jobTitle && (
                              <Typography variant="caption" color="text.secondary">
                                {po.jobTitle}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'medium' }}>
                        {formatCurrency(po.totalAmount)}
                      </TableCell>
                      <TableCell>{formatDate(po.orderDate)}</TableCell>
                      <TableCell>
                        <Chip
                          label={po.status.replace(/_/g, ' ')}
                          color={getStatusColor(po.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {po.priority && (
                          <Chip
                            label={po.priority}
                            color={getPriorityColor(po.priority)}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(po)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <CreatePurchaseOrderDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          onPurchaseOrderCreated={handlePOCreated}
          currentUser={user || authUser || { id: '', email: '', name: '', role: 'EMPLOYEE' }}
        />

        {selectedPO && (
          <>
            <EditPurchaseOrderDialog
              open={editDialogOpen}
              onClose={() => {
                setEditDialogOpen(false)
                setSelectedPO(null)
              }}
              onPurchaseOrderUpdated={handlePOUpdated}
              purchaseOrder={selectedPO}
              currentUser={user || authUser || { id: '', email: '', name: '', role: 'EMPLOYEE' }}
            />

            <PurchaseOrderDetailsDialog
              open={detailsDialogOpen}
              onClose={() => {
                setDetailsDialogOpen(false)
                setSelectedPO(null)
              }}
              purchaseOrder={selectedPO}
            />
          </>
        )}

        <ApprovalQueueDialog
          open={approvalQueueOpen}
          onClose={() => setApprovalQueueOpen(false)}
        />
      </ResponsiveContainer>
    </ResponsiveLayout>
  )
}