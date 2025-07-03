'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import CreateJobDialog from '@/components/jobs/CreateJobDialog'
import EditJobDialog from '@/components/jobs/EditJobDialog'
import JobActionsMenu from '@/components/jobs/JobActionsMenu'
import ResponsiveLayout from '@/components/layout/ResponsiveLayout'
import ResponsiveContainer from '@/components/layout/ResponsiveContainer'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
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
  useMediaQuery,
  useTheme,
  Stack,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  Collapse,
  IconButton,
  MenuItem,
} from '@mui/material'
import {
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
  FilterList as FilterIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Download as DownloadIcon,
  TrendingUp,
} from '@mui/icons-material'

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface JobPhase {
  id: string
  name: 'UG' | 'RI' | 'FN'
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
}

interface Job {
  id: string
  jobNumber: string
  title: string
  customer: string
  customerId: string
  type: 'SERVICE_CALL' | 'INSTALLATION'
  status: string
  priority: string
  dueDate: string | null
  completedDate: string | null
  crew: string[]
  estimatedHours?: number
  actualHours?: number
  estimatedCost?: number
  actualCost?: number
  billedAmount?: number
  address?: string
  city?: string
  state?: string
  zip?: string
  jobPhases?: JobPhase[]
}

// Job data now comes from API

const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  switch (status.toLowerCase()) {
    case 'in_progress':
      return 'success'
    case 'scheduled':
    case 'dispatched':
      return 'warning'
    case 'completed':
    case 'billed':
      return 'info'
    case 'cancelled':
      return 'error'
    default:
      return 'default'
  }
}

const getPriorityColor = (priority: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
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

// Mobile JobCard component
function JobCard({ job, onEdit, onDelete, onView }: { 
  job: Job, 
  onEdit: (job: Job) => void,
  onDelete: (job: Job) => void,
  onView: (job: Job) => void
}) {
  return (
    <Card sx={{ 
      mb: 2,
      transition: 'all 0.2s ease-in-out',
      '&:hover': {
        boxShadow: 3,
        transform: 'translateY(-2px)',
      },
    }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {job.jobNumber}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {job.title}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
            <Chip
              label={job.status.replace('_', ' ')}
              color={getStatusColor(job.status)}
              size="small"
            />
            <Chip
              label={job.priority}
              color={getPriorityColor(job.priority)}
              size="small"
              variant="outlined"
            />
          </Box>
        </Box>
        
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Customer:</strong> {job.customer}
        </Typography>
        
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Due Date:</strong> {job.dueDate ? new Date(job.dueDate).toLocaleDateString() : 'Not set'}
        </Typography>
        
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Crew:</strong> {job.crew.join(', ') || 'Unassigned'}
        </Typography>
        
        {job.jobPhases && job.jobPhases.length > 0 && (
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Phases:</strong>
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {job.jobPhases.map((phase) => (
                <Chip
                  key={phase.id}
                  label={phase.name}
                  color={
                    phase.status === 'COMPLETED' ? 'success' :
                    phase.status === 'IN_PROGRESS' ? 'warning' : 'default'
                  }
                  size="small"
                  variant={phase.status === 'NOT_STARTED' ? 'outlined' : 'filled'}
                />
              ))}
            </Box>
          </Box>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <JobActionsMenu
            job={job}
            onEdit={onEdit}
            onDelete={onDelete}
            onView={onView}
          />
        </Box>
      </CardContent>
    </Card>
  )
}

export default function JobsPage() {
  const router = useRouter()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [user, setUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('')

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        })
        if (!response.ok) {
          router.push('/login')
          return
        }
        const userData = await response.json()
        setUser(userData)
        fetchJobs()
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push('/login')
      }
    }
    checkAuth()
  }, [router])

  const fetchJobs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/jobs', {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('Failed to fetch jobs')
      }
      const data = await response.json()
      // Ensure data is an array before setting
      if (Array.isArray(data)) {
        setJobs(data)
      } else {
        console.error('API returned non-array data:', data)
        setJobs([])
      }
    } catch (error) {
      console.error('Error fetching jobs:', error)
      setJobs([]) // Ensure jobs is always an array
    } finally {
      setLoading(false)
    }
  }


  const handleEditJob = (job: Job) => {
    setSelectedJob(job)
    setEditDialogOpen(true)
  }

  const handleDeleteJob = async (job: Job) => {
    try {
      const response = await fetch(`/api/jobs/${job.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete job')
      }
      
      const responseData = await response.json()
      
      // Refresh the list
      fetchJobs()
      
      // Show success message
      alert(`✅ Job ${job.jobNumber} has been successfully deleted`)
    } catch (error) {
      console.error('Error deleting job:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete job. Please try again.'
      alert(`❌ ${errorMessage}`)
    }
  }

  const handleViewJob = (job: Job) => {
    router.push(`/jobs/${job.id}`)
  }

  const filteredJobs = (Array.isArray(jobs) ? jobs : []).filter(job => {
    // Text search
    const matchesSearch = !searchTerm || 
      job.jobNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.customer.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Status filter
    const matchesStatus = !statusFilter || job.status.toLowerCase() === statusFilter.toLowerCase()
    
    // Type filter
    const matchesType = !typeFilter || job.type === typeFilter
    
    // Priority filter
    const matchesPriority = !priorityFilter || job.priority.toLowerCase() === priorityFilter.toLowerCase()
    
    // Phase filter
    const matchesPhase = !phaseFilter || 
      (job.jobPhases && job.jobPhases.some(phase => phase.name === phaseFilter))
    
    return matchesSearch && matchesStatus && matchesType && matchesPriority && matchesPhase
  })

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('')
    setTypeFilter('')
    setPriorityFilter('')
    setPhaseFilter('')
  }

  const hasActiveFilters = statusFilter || typeFilter || priorityFilter || phaseFilter

  const exportToCSV = () => {
    const headers = [
      'Job ID',
      'Title', 
      'Customer',
      'Status',
      'Type',
      'Priority',
      'Due Date',
      'Crew',
      'Estimated Hours',
      'Actual Hours',
      'Estimated Cost',
      'Actual Cost',
      'Billed Amount',
      'Phases'
    ]

    const csvData = filteredJobs.map(job => [
      job.jobNumber,
      job.title,
      job.customer,
      job.status.replace('_', ' '),
      job.type === 'SERVICE_CALL' ? 'Service Call' : 'Installation',
      job.priority,
      job.dueDate ? new Date(job.dueDate).toLocaleDateString() : '',
      job.crew.join('; '),
      job.estimatedHours || '',
      job.actualHours || '',
      job.estimatedCost || '',
      job.actualCost || '',
      job.billedAmount || '',
      job.jobPhases?.map(p => `${p.name}:${p.status}`).join('; ') || ''
    ])

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `jobs-export-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (!user) return null

  // Action buttons for the page header
  const actionButtons = (
    <Stack 
      direction={{ xs: 'column', sm: 'row' }} 
      spacing={1.5} 
      sx={{ 
        width: { xs: '100%', sm: 'auto' },
        alignItems: { xs: 'stretch', sm: 'center' }
      }}
    >
      <Button
        variant="outlined"
        startIcon={<DownloadIcon />}
        onClick={exportToCSV}
        disabled={filteredJobs.length === 0}
        size={isMobile ? 'small' : 'medium'}
        sx={{ 
          flex: { xs: 1, sm: 'none' },
          minWidth: { xs: 'auto', sm: '120px' }
        }}
      >
        {isMobile ? 'Export' : 'Export CSV'}
      </Button>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setCreateDialogOpen(true)}
        size={isMobile ? 'small' : 'medium'}
        sx={{
          backgroundColor: '#e14eca',
          '&:hover': {
            backgroundColor: '#d236b8',
          },
          flex: { xs: 1, sm: 'none' },
          minWidth: { xs: 'auto', sm: '100px' },
          whiteSpace: 'nowrap'
        }}
      >
        {isMobile ? 'New' : 'New Job'}
      </Button>
    </Stack>
  )


  return (
    <ResponsiveLayout>
      <ResponsiveContainer
        title="Job Management"
        actions={actionButtons}
      >

          <Card sx={{ 
            mb: 3,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              boxShadow: 3,
            },
          }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: filtersExpanded ? 2 : 0 }}>
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
                <Button
                  variant="outlined"
                  startIcon={<FilterIcon />}
                  endIcon={filtersExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  onClick={() => setFiltersExpanded(!filtersExpanded)}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  Filters
                  {hasActiveFilters && (
                    <Chip
                      size="small"
                      label="!"
                      color="primary"
                      sx={{ ml: 1, minWidth: 20, height: 20 }}
                    />
                  )}
                </Button>
                {(hasActiveFilters || searchTerm) && (
                  <IconButton
                    onClick={clearFilters}
                    title="Clear all filters"
                    color="primary"
                  >
                    <ClearIcon />
                  </IconButton>
                )}
              </Box>

              <Collapse in={filtersExpanded}>
                <Box sx={{ 
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
                  gap: 2,
                  width: '100%'
                }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={statusFilter}
                        label="Status"
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="estimate">Estimate</MenuItem>
                        <MenuItem value="scheduled">Scheduled</MenuItem>
                        <MenuItem value="dispatched">Dispatched</MenuItem>
                        <MenuItem value="in_progress">In Progress</MenuItem>
                        <MenuItem value="completed">Completed</MenuItem>
                        <MenuItem value="billed">Billed</MenuItem>
                        <MenuItem value="cancelled">Cancelled</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Type</InputLabel>
                      <Select
                        value={typeFilter}
                        label="Type"
                        onChange={(e) => setTypeFilter(e.target.value)}
                      >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="SERVICE_CALL">Service Call</MenuItem>
                        <MenuItem value="INSTALLATION">Installation</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Priority</InputLabel>
                      <Select
                        value={priorityFilter}
                        label="Priority"
                        onChange={(e) => setPriorityFilter(e.target.value)}
                      >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="high">High</MenuItem>
                        <MenuItem value="medium">Medium</MenuItem>
                        <MenuItem value="low">Low</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Phase</InputLabel>
                      <Select
                        value={phaseFilter}
                        label="Phase"
                        onChange={(e) => setPhaseFilter(e.target.value)}
                      >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="UG">Underground</MenuItem>
                        <MenuItem value="RI">Rough-in</MenuItem>
                        <MenuItem value="FN">Finish</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>
              </Collapse>
            </CardContent>
          </Card>

          {isMobile ? (
            <Box>
              {loading ? (
                <Typography align="center" sx={{ py: 4 }}>
                  Loading jobs...
                </Typography>
              ) : filteredJobs.length === 0 ? (
                <Typography align="center" sx={{ py: 4 }} color="text.secondary">
                  No jobs found
                </Typography>
              ) : (
                filteredJobs.map((job) => (
                  <JobCard 
                    key={job.id} 
                    job={job} 
                    onEdit={handleEditJob}
                    onDelete={handleDeleteJob}
                    onView={handleViewJob}
                  />
                ))
              )}
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{
              borderRadius: 2,
              overflow: 'hidden',
              transition: 'box-shadow 0.2s',
              '&:hover': {
                boxShadow: 2,
              },
            }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>Job ID</TableCell>
                    <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>Title</TableCell>
                    <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>Customer</TableCell>
                    <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>Priority</TableCell>
                    <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>Phases</TableCell>
                    <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>Due Date</TableCell>
                    <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>Crew</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        Loading jobs...
                      </TableCell>
                    </TableRow>
                  ) : filteredJobs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        No jobs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredJobs.map((job) => (
                      <TableRow key={job.id} hover sx={{ 
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      }}>
                        <TableCell>{job.jobNumber}</TableCell>
                        <TableCell>{job.title}</TableCell>
                        <TableCell>{job.customer}</TableCell>
                        <TableCell>
                          <Chip
                            label={job.status.replace('_', ' ')}
                            color={getStatusColor(job.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={job.priority}
                            color={getPriorityColor(job.priority)}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {job.jobPhases?.map((phase) => (
                              <Chip
                                key={phase.id}
                                label={phase.name}
                                color={
                                  phase.status === 'COMPLETED' ? 'success' :
                                  phase.status === 'IN_PROGRESS' ? 'warning' : 'default'
                                }
                                size="small"
                                variant={phase.status === 'NOT_STARTED' ? 'outlined' : 'filled'}
                              />
                            )) || '-'}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {job.dueDate ? new Date(job.dueDate).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>{job.crew.join(', ') || 'Unassigned'}</TableCell>
                        <TableCell align="right">
                          <JobActionsMenu
                            job={job}
                            onEdit={handleEditJob}
                            onDelete={handleDeleteJob}
                            onView={handleViewJob}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
      </ResponsiveContainer>
      <CreateJobDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onJobCreated={() => {
          fetchJobs() // Refresh the jobs list
          setCreateDialogOpen(false)
        }}
      />

      <EditJobDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false)
          setSelectedJob(null)
        }}
        onJobUpdated={() => {
          fetchJobs() // Refresh the jobs list
          setEditDialogOpen(false)
          setSelectedJob(null)
        }}
        job={selectedJob}
      />
    </ResponsiveLayout>
  )
}