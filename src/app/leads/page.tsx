'use client'

// Force dynamic rendering to prevent caching issues
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ResponsiveLayout from '@/components/layout/ResponsiveLayout'
import ResponsiveContainer from '@/components/layout/ResponsiveContainer'
import {
  Box,
  Typography,
  Chip,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
  useTheme,
  useMediaQuery,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  Add as AddIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  TrendingUp as LeadsIcon,
  Warning as WarningIcon,
  AttachMoney,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ViewList as ViewListIcon,
  ViewColumn as ViewColumnIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material'
import AddLeadDialog from '@/components/leads/AddLeadDialog'
import EditLeadDialog from '@/components/leads/EditLeadDialog'
import LeadsPipelineView from '@/components/leads/LeadsPipelineView'

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface Lead {
  id: string
  firstName: string
  lastName: string
  companyName?: string
  email?: string
  phone?: string
  status: string
  source?: string
  estimatedValue?: number
  priority?: string
  description?: string
  lastContactDate?: string
  nextFollowUpDate?: string
  assignedUser?: {
    id: string
    name: string
    email: string
  }
  daysSinceLastContact?: number
  overdue?: boolean
  activities?: any[]
  estimates?: any[]
}

const leadStages = [
  { key: 'COLD_LEAD', label: 'Cold Lead' },
  { key: 'WARM_LEAD', label: 'Warm Lead' },
  { key: 'ESTIMATE_REQUESTED', label: 'Estimate Requested' },
  { key: 'ESTIMATE_SENT', label: 'Estimate Sent' },
  { key: 'ESTIMATE_APPROVED', label: 'Approved' },
  { key: 'JOB_SCHEDULED', label: 'Job Scheduled' },
  { key: 'FOLLOW_UP_REQUIRED', label: 'Follow-up Required' },
  { key: 'LOST', label: 'Lost' },
]

export default function LeadsPage() {
  const router = useRouter()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [user, setUser] = useState<User | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addLeadDialogOpen, setAddLeadDialogOpen] = useState(false)
  const [editLeadDialogOpen, setEditLeadDialogOpen] = useState(false)
  const [leadMenuAnchor, setLeadMenuAnchor] = useState<{ [key: string]: HTMLElement | null }>({})
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'pipeline'>('pipeline')

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
      fetchLeads()
    }
  }, [user])

  const fetchLeads = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Create AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2000) // 2s timeout
      
      const response = await fetch('/api/leads', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch leads: ${response.status}`)
      }
      
      const data = await response.json()
      setLeads(data.leads || [])
    } catch (error) {
      console.error('Error fetching leads:', error)
      
      if (error instanceof Error && error.name === 'AbortError') {
        setError('Request timed out after 2 seconds - click Retry')
      } else {
        setError('Failed to load leads')
      }
      
      // No auto-retry - user can click Retry or Refresh manually
    } finally {
      setLoading(false)
    }
  }


  const handleLeadCreated = () => {
    fetchLeads()
  }

  const handleLeadUpdated = () => {
    fetchLeads()
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'HIGH':
        return 'error'
      case 'MEDIUM':
        return 'warning'
      case 'LOW':
        return 'info'
      default:
        return 'default'
    }
  }

  const formatCurrency = (amount?: number) => {
    return amount ? `$${amount.toLocaleString()}` : 'TBD'
  }

  const handleLeadMenuClick = (event: React.MouseEvent<HTMLElement>, lead: Lead) => {
    setLeadMenuAnchor({ ...leadMenuAnchor, [lead.id]: event.currentTarget })
    setSelectedLead(lead)
  }

  const handleLeadMenuClose = (leadId: string) => {
    setLeadMenuAnchor({ ...leadMenuAnchor, [leadId]: null })
  }

  const handleEditLead = () => {
    if (selectedLead) {
      setEditLeadDialogOpen(true)
      handleLeadMenuClose(selectedLead.id)
    }
  }

  const handleDeleteLead = async () => {
    if (selectedLead && confirm('Are you sure you want to delete this lead?')) {
      try {
        const response = await fetch(`/api/leads/${selectedLead.id}`, {
          method: 'DELETE',
        })
        if (response.ok) {
          fetchLeads()
        }
      } catch (error) {
        console.error('Error deleting lead:', error)
      }
      handleLeadMenuClose(selectedLead.id)
    }
  }

  const handleUpdateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (response.ok) {
        fetchLeads()
      }
    } catch (error) {
      console.error('Error updating lead status:', error)
    }
  }

  const handleViewModeChange = (event: React.MouseEvent<HTMLElement>, newViewMode: 'table' | 'pipeline' | null) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode)
    }
  }

  const handlePipelineEditLead = (lead: Lead) => {
    setSelectedLead(lead)
    setEditLeadDialogOpen(true)
  }

  const handlePipelineDeleteLead = async (lead: Lead) => {
    if (confirm('Are you sure you want to delete this lead?')) {
      try {
        const response = await fetch(`/api/leads/${lead.id}`, {
          method: 'DELETE',
        })
        if (response.ok) {
          fetchLeads()
        }
      } catch (error) {
        console.error('Error deleting lead:', error)
      }
    }
  }

  if (!user) return null

  // Action buttons for the page header
  const actionButtons = (
    <Stack 
      direction={{ xs: 'column', sm: 'row' }} 
      spacing={1} 
      sx={{ 
        width: { xs: '100%', sm: 'auto' },
        alignItems: { xs: 'stretch', sm: 'center' }
      }}
    >
      <ToggleButtonGroup
        value={viewMode}
        exclusive
        onChange={(_, value) => value && setViewMode(value)}
        size="small"
        sx={{ mr: { xs: 0, sm: 2 }, mb: { xs: 1, sm: 0 } }}
      >
        <ToggleButton value="pipeline">
          <ViewColumnIcon />
        </ToggleButton>
        <ToggleButton value="table">
          <ViewListIcon />
        </ToggleButton>
      </ToggleButtonGroup>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setAddLeadDialogOpen(true)}
        sx={{
          backgroundColor: '#e14eca',
          '&:hover': {
            backgroundColor: '#d236b8',
          },
          flex: { xs: 1, sm: 'none' },
          minWidth: { xs: 'auto', sm: '120px' }
        }}
        size={isMobile ? 'small' : 'medium'}
      >
        {isMobile ? 'New Lead' : 'New Lead'}
      </Button>
    </Stack>
  )

  // Breadcrumbs for navigation
  const breadcrumbs = [
    {
      label: 'Home',
      path: '/dashboard',
      icon: <DashboardIcon fontSize="small" />
    },
    {
      label: 'Leads',
      path: '/leads',
      icon: <LeadsIcon fontSize="small" />
    }
  ]

  return (
    <ResponsiveLayout>
      <ResponsiveContainer
        title="Lead Management"
        subtitle="Track and manage potential customers through the sales pipeline"
        breadcrumbs={breadcrumbs}
        actions={actionButtons}
      >
          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 3 }}
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={() => fetchLeads()}
                >
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <TextField
              placeholder="Search leads..."
              variant="outlined"
              size="small"
              sx={{ width: 300 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={handleViewModeChange}
                size="small"
              >
                <ToggleButton value="pipeline">
                  <ViewColumnIcon sx={{ mr: 1 }} />
                  Pipeline
                </ToggleButton>
                <ToggleButton value="table">
                  <ViewListIcon sx={{ mr: 1 }} />
                  Table
                </ToggleButton>
              </ToggleButtonGroup>
              <Button
                variant="outlined"
                onClick={() => fetchLeads()}
                disabled={loading}
                size="small"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
            </Box>
          </Box>

          {/* Conditional View Rendering */}
          {viewMode === 'pipeline' ? (
            loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading leads...</Typography>
              </Box>
            ) : (
              <LeadsPipelineView
                leads={leads}
                onEditLead={handlePipelineEditLead}
                onDeleteLead={handlePipelineDeleteLead}
                onUpdateLeadStatus={handleUpdateLeadStatus}
              />
            )
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>Value</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Last Contact</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        Loading leads...
                      </TableCell>
                    </TableRow>
                  ) : leads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        No leads found
                      </TableCell>
                    </TableRow>
                  ) : (
                    leads.map((lead) => (
                      <TableRow key={lead.id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {lead.companyName || `${lead.firstName} ${lead.lastName}`}
                            </Typography>
                            {lead.description && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                {lead.description.length > 50 ? `${lead.description.substring(0, 50)}...` : lead.description}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={leadStages.find(s => s.key === lead.status)?.label || lead.status}
                            size="small"
                            color={lead.overdue ? 'error' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {lead.phone && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2">{lead.phone}</Typography>
                              </Box>
                            )}
                            {lead.email && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2">{lead.email}</Typography>
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {lead.source || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <AttachMoney sx={{ fontSize: 16, color: 'success.main' }} />
                            <Typography variant="body2" color="success.main" fontWeight="medium">
                              {formatCurrency(lead.estimatedValue)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {lead.priority && (
                            <Chip
                              label={lead.priority}
                              size="small"
                              color={getPriorityColor(lead.priority) as any}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {lead.daysSinceLastContact !== null && (
                            <Box sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 0.5,
                              color: lead.overdue ? 'error.main' : 'text.secondary'
                            }}>
                              {lead.overdue && <WarningIcon sx={{ fontSize: 16 }} />}
                              <Typography variant="body2" color="inherit">
                                {lead.daysSinceLastContact} days ago
                              </Typography>
                            </Box>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton 
                            size="small"
                            onClick={(e) => handleLeadMenuClick(e, lead)}
                          >
                            <MoreVertIcon />
                          </IconButton>
                          <Menu
                            anchorEl={leadMenuAnchor[lead.id]}
                            open={Boolean(leadMenuAnchor[lead.id])}
                            onClose={() => handleLeadMenuClose(lead.id)}
                          >
                            <MenuItem onClick={handleEditLead}>
                              <ListItemIcon>
                                <EditIcon fontSize="small" />
                              </ListItemIcon>
                              Edit Lead
                            </MenuItem>
                            <MenuItem onClick={handleDeleteLead}>
                              <ListItemIcon>
                                <DeleteIcon fontSize="small" />
                              </ListItemIcon>
                              Delete Lead
                            </MenuItem>
                          </Menu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
      </ResponsiveContainer>

      <AddLeadDialog
        open={addLeadDialogOpen}
        onClose={() => setAddLeadDialogOpen(false)}
        onLeadCreated={handleLeadCreated}
      />

      <EditLeadDialog
        open={editLeadDialogOpen}
        onClose={() => setEditLeadDialogOpen(false)}
        onLeadUpdated={handleLeadUpdated}
        lead={selectedLead}
      />
    </ResponsiveLayout>
  )
}