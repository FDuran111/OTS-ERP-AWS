'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import CreateJobDialog from '@/components/jobs/CreateJobDialog'
import EditJobDialog from '@/components/jobs/EditJobDialog'
import JobActionsMenu from '@/components/jobs/JobActionsMenu'
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
  useMediaQuery,
  useTheme,
  Stack,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  Collapse,
  Grid2 as Grid,
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
  FilterList as FilterIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Download as DownloadIcon,
  TrendingUp,
} from '@mui/icons-material'

const drawerWidth = 240

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
  type: 'SERVICE_CALL' | 'COMMERCIAL_PROJECT'
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

// Removed mockJobs - data now comes from API

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

const getStatusColor = (status: string) => {
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
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [user, setUser] = useState<User | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
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
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/login')
      return
    }
    setUser(JSON.parse(storedUser))
    fetchJobs()
  }, [router])

  const fetchJobs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/jobs')
      if (!response.ok) {
        throw new Error('Failed to fetch jobs')
      }
      const data = await response.json()
      setJobs(data)
    } catch (error) {
      console.error('Error fetching jobs:', error)
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

  const handleEditJob = (job: Job) => {
    setSelectedJob(job)
    setEditDialogOpen(true)
  }

  const handleDeleteJob = async (job: Job) => {
    try {
      const response = await fetch(`/api/jobs/${job.id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete job')
      }
      
      fetchJobs() // Refresh the list
    } catch (error) {
      console.error('Error deleting job:', error)
      alert('Failed to delete job. Please try again.')
    }
  }

  const handleViewJob = (job: Job) => {
    // For now, just open edit dialog in view mode
    // Later could be a separate view dialog
    handleEditJob(job)
  }

  const filteredJobs = jobs.filter(job => {
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
      job.type === 'SERVICE_CALL' ? 'Service Call' : 'Commercial Project',
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

  const JobCard = ({ job }: { job: Job }) => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              {job.jobNumber}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {job.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {job.customer}
            </Typography>
          </Box>
          <JobActionsMenu
            job={job}
            onEdit={handleEditJob}
            onDelete={handleDeleteJob}
            onView={handleViewJob}
          />
        </Box>
        
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Chip
            label={job.status.replace('_', ' ')}
            color={getStatusColor(job.status) as any}
            size="small"
          />
          <Chip
            label={job.priority}
            color={getPriorityColor(job.priority) as any}
            size="small"
            variant="outlined"
          />
        </Stack>

        {job.jobPhases && job.jobPhases.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
              Phases:
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
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
            </Stack>
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {job.dueDate ? `Due: ${new Date(job.dueDate).toLocaleDateString()}` : 'No due date'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {job.crew.length > 0 ? job.crew.join(', ') : 'Unassigned'}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )

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
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={exportToCSV}
                disabled={filteredJobs.length === 0}
                size={isMobile ? 'small' : 'medium'}
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
                }}
              >
                {isMobile ? 'New' : 'New Job'}
              </Button>
            </Stack>
          </Box>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: filtersExpanded ? 2 : 0 }}>
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
                <Grid spacing={2}>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Type</InputLabel>
                      <Select
                        value={typeFilter}
                        label="Type"
                        onChange={(e) => setTypeFilter(e.target.value)}
                      >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="SERVICE_CALL">Service Call</MenuItem>
                        <MenuItem value="COMMERCIAL_PROJECT">Commercial Project</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
                  </Grid>
                </Grid>
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
                filteredJobs.map((job) => <JobCard key={job.id} job={job} />)
              )}
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Job ID</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Phases</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Crew</TableCell>
                    <TableCell align="right">Actions</TableCell>
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
                      <TableRow key={job.id} hover>
                        <TableCell>{job.jobNumber}</TableCell>
                        <TableCell>{job.title}</TableCell>
                        <TableCell>{job.customer}</TableCell>
                        <TableCell>
                          <Chip
                            label={job.status.replace('_', ' ')}
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
        </Container>
      </Box>

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
    </Box>
  )
}