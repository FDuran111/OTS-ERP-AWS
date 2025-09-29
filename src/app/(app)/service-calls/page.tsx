'use client'

import { useState, useEffect } from 'react'
import {
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  Alert,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
  Stack,
  Avatar
} from '@mui/material'
import ResponsiveLayout from '@/components/layout/ResponsiveLayout'
import ResponsiveContainer from '@/components/layout/ResponsiveContainer'
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  MoreVert as MoreVertIcon,
  Emergency as EmergencyIcon,
  Warning as WarningIcon,
  Assignment as AssignmentIcon,
  Check as CheckIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material'
import ServiceCallForm from '@/components/service-calls/ServiceCallForm'
import { ServiceCall } from '@/lib/service-calls'

interface ServiceCallStats {
  total: number
  new: number
  active: number
  completed: number
  urgent: number
  today: number
  avgSatisfaction: number
}

const STATUS_COLORS = {
  NEW: '#2196f3',
  ASSIGNED: '#ff9800',
  DISPATCHED: '#9c27b0',
  EN_ROUTE: '#673ab7',
  ON_SITE: '#3f51b5',
  IN_PROGRESS: '#f44336',
  COMPLETED: '#4caf50',
  CANCELLED: '#757575',
  BILLED: '#009688'
}

const PRIORITY_COLORS = {
  LOW: '#4caf50',
  NORMAL: '#2196f3',
  HIGH: '#ff9800',
  URGENT: '#f44336',
  EMERGENCY: '#9c27b0'
}

export default function ServiceCallsPage() {
  const [serviceCalls, setServiceCalls] = useState<ServiceCall[]>([])
  const [stats, setStats] = useState<ServiceCallStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [formOpen, setFormOpen] = useState(false)
  const [editingCall, setEditingCall] = useState<ServiceCall | null>(null)
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [priorityFilter, setPriorityFilter] = useState<string[]>([])
  
  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedCall, setSelectedCall] = useState<ServiceCall | null>(null)
  
  // Status update dialog
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [statusNotes, setStatusNotes] = useState('')

  const [customers, setCustomers] = useState([])
  const [technicians, setTechnicians] = useState([])

  useEffect(() => {
    loadServiceCalls()
    loadStats()
    loadCustomers()
    loadTechnicians()
  }, [statusFilter, priorityFilter, searchQuery])

  const loadServiceCalls = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter.length > 0) params.append('status', statusFilter.join(','))
      if (priorityFilter.length > 0) params.append('priority', priorityFilter.join(','))
      if (searchQuery) params.append('search', searchQuery)
      
      const token = localStorage.getItem('auth-token')
      const response = await fetch(`/api/service-calls?${params}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include'
      })
      const data = await response.json()
      
      if (data.success) {
        setServiceCalls(data.data)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to load service calls')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('auth-token')
      const response = await fetch('/api/service-calls/stats', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include'
      })
      const data = await response.json()
      
      if (data.success) {
        setStats(data.data)
      }
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }

  const loadCustomers = async () => {
    try {
      const response = await fetch('/api/customers', {
        credentials: 'include'
      })
      const data = await response.json()
      if (data.success) setCustomers(data.data)
    } catch (err) {
      console.error('Failed to load customers:', err)
    }
  }

  const loadTechnicians = async () => {
    try {
      const response = await fetch('/api/users?role=TECHNICIAN')
      const data = await response.json()
      if (data.success) setTechnicians(data.data)
    } catch (err) {
      console.error('Failed to load technicians:', err)
    }
  }

  const handleCreateCall = async (callData: ServiceCall) => {
    try {
      const response = await fetch('/api/service-calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(callData)
      })
      
      const data = await response.json()
      
      if (data.success) {
        loadServiceCalls()
        loadStats()
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to create service call')
    }
  }

  const handleUpdateCall = async (callData: ServiceCall) => {
    if (!editingCall?.id) return
    
    try {
      const response = await fetch(`/api/service-calls/${editingCall.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(callData)
      })
      
      const data = await response.json()
      
      if (data.success) {
        loadServiceCalls()
        loadStats()
        setEditingCall(null)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to update service call')
    }
  }

  const handleStatusUpdate = async () => {
    if (!selectedCall?.id) return
    
    try {
      const response = await fetch(`/api/service-calls/${selectedCall.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          notes: statusNotes,
          changedBy: 'current-user' // TODO: Get from auth
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        loadServiceCalls()
        loadStats()
        setStatusDialogOpen(false)
        setStatusNotes('')
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to update status')
    }
  }

  const handleDeleteCall = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service call?')) return
    
    try {
      const response = await fetch(`/api/service-calls/${id}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        loadServiceCalls()
        loadStats()
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to delete service call')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'NEW': return <AssignmentIcon />
      case 'ASSIGNED': case 'DISPATCHED': return <PersonIcon />
      case 'EN_ROUTE': return <LocationIcon />
      case 'IN_PROGRESS': return <WarningIcon />
      case 'COMPLETED': return <CheckIcon />
      default: return <AssignmentIcon />
    }
  }

  const getPriorityIcon = (priority: string) => {
    if (['URGENT', 'EMERGENCY'].includes(priority)) {
      return <EmergencyIcon />
    }
    return null
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  return (
    <ResponsiveLayout>
      <ResponsiveContainer
        title="Service Calls"
        subtitle="Manage and track service calls"
      >
        
        {/* Stats Cards */}
        {stats && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            <Box sx={{ flex: '1 1 calc(16.67% - 16px)', minWidth: '120px' }}>
              <Card>
                <CardContent sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h6" color="primary">
                    {stats.total}
                  </Typography>
                  <Typography variant="caption">Total</Typography>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: '1 1 calc(16.67% - 16px)', minWidth: '120px' }}>
              <Card>
                <CardContent sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h6" color="info.main">
                    {stats.new}
                  </Typography>
                  <Typography variant="caption">New</Typography>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: '1 1 calc(16.67% - 16px)', minWidth: '120px' }}>
              <Card>
                <CardContent sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h6" color="warning.main">
                    {stats.active}
                  </Typography>
                  <Typography variant="caption">Active</Typography>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: '1 1 calc(16.67% - 16px)', minWidth: '120px' }}>
              <Card>
                <CardContent sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h6" color="success.main">
                    {stats.completed}
                  </Typography>
                  <Typography variant="caption">Completed</Typography>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: '1 1 calc(16.67% - 16px)', minWidth: '120px' }}>
              <Card>
                <CardContent sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h6" color="error.main">
                    {stats.urgent}
                  </Typography>
                  <Typography variant="caption">Urgent</Typography>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: '1 1 calc(16.67% - 16px)', minWidth: '120px' }}>
              <Card>
                <CardContent sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h6" color="text.primary">
                    {stats.today}
                  </Typography>
                  <Typography variant="caption">Today</Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>
        )}
        
        {/* Search and Filters */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search service calls..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
            sx={{ minWidth: 300 }}
          />
          
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => {}}
          >
            Filters
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              loadServiceCalls()
              loadStats()
            }}
          >
            Refresh
          </Button>
          
          <Box sx={{ flexGrow: 1 }} />
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setFormOpen(true)}
          >
            New Service Call
          </Button>
        </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Service Calls List */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {serviceCalls.map((call) => (
          <Box sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: '300px' }} key={call.id}>
            <Card
              sx={{
                position: 'relative',
                '&:hover': { boxShadow: 4 }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="h6" noWrap>
                        {call.callNumber}
                      </Typography>
                      {(() => {
                        const priorityIcon = getPriorityIcon(call.priority)
                        return priorityIcon && (
                          <Tooltip title={`${call.priority} Priority`}>
                            {priorityIcon}
                          </Tooltip>
                        )
                      })()}
                    </Box>
                    
                    <Typography variant="body1" noWrap sx={{ mb: 1 }}>
                      {call.title}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {call.contactName || 'No contact name'}
                    </Typography>
                  </Box>
                  
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      setAnchorEl(e.currentTarget)
                      setSelectedCall(call)
                    }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>
                
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Chip
                    size="small"
                    icon={getStatusIcon(call.status)}
                    label={call.status.replace('_', ' ')}
                    sx={{
                      bgcolor: STATUS_COLORS[call.status as keyof typeof STATUS_COLORS],
                      color: 'white'
                    }}
                  />
                  <Chip
                    size="small"
                    label={call.priority}
                    sx={{
                      bgcolor: PRIORITY_COLORS[call.priority as keyof typeof PRIORITY_COLORS],
                      color: 'white'
                    }}
                  />
                </Stack>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <PhoneIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {call.contactPhone || 'No phone'}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <LocationIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {call.serviceCity && call.serviceState
                      ? `${call.serviceCity}, ${call.serviceState}`
                      : 'No location'
                    }
                  </Typography>
                </Box>
                
                {call.assignedTechnicianId && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <PersonIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      Assigned to technician
                    </Typography>
                  </Box>
                )}
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <ScheduleIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {formatTimeAgo(call.createdAt!)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      {serviceCalls.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No service calls found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Create your first service call to get started
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setFormOpen(true)}
          >
            New Service Call
          </Button>
        </Box>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem
          onClick={() => {
            setAnchorEl(null)
            if (selectedCall) {
              setEditingCall(selectedCall)
              setFormOpen(true)
            }
          }}
        >
          <EditIcon sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchorEl(null)
            if (selectedCall) {
              setNewStatus(selectedCall.status)
              setStatusDialogOpen(true)
            }
          }}
        >
          <AssignmentIcon sx={{ mr: 1 }} />
          Update Status
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchorEl(null)
            if (selectedCall?.id) {
              handleDeleteCall(selectedCall.id)
            }
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Service Call Form */}
      <ServiceCallForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditingCall(null)
        }}
        onSubmit={editingCall ? handleUpdateCall : handleCreateCall}
        initialData={editingCall || undefined}
        customers={customers}
        technicians={technicians}
        loading={loading}
      />

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)}>
        <DialogTitle>Update Service Call Status</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              label="Status"
            >
              {Object.keys(STATUS_COLORS).map((status) => (
                <MenuItem key={status} value={status}>
                  {status.replace('_', ' ')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Notes (optional)"
            value={statusNotes}
            onChange={(e) => setStatusNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleStatusUpdate}>
            Update Status
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add service call"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setFormOpen(true)}
      >
        <AddIcon />
      </Fab>
      </ResponsiveContainer>
    </ResponsiveLayout>
  )
}