'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Stack,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Fab,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Timer as TimerIcon,
  Build as EquipmentIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as ReportIcon,
  Speed as UtilizationIcon,
  LocalShipping as TruckIcon,
} from '@mui/icons-material'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`equipment-tabpanel-${index}`}
      aria-labelledby={`equipment-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

interface EquipmentRate {
  id: string
  equipmentType: string
  equipmentClass: string
  rateName: string
  description?: string
  hourlyRate: number
  halfDayRate?: number
  fullDayRate?: number
  weeklyRate?: number
  minimumBillableHours: number
  roundingIncrement: number
  travelTimeRate?: number
  setupTimeRate?: number
  overtimeMultiplier: number
  weekendMultiplier: number
  requiresOperator: boolean
  operatorIncluded: boolean
  operatorRate?: number
}

interface EquipmentUsage {
  id: string
  jobId: string
  jobNumber?: string
  jobDescription?: string
  equipmentRateId: string
  rateName?: string
  equipmentName: string
  equipmentType: string
  operatorId: string
  operatorName?: string
  usageDate: string
  startTime?: string
  endTime?: string
  totalHours?: number
  billableHours?: number
  workingHours: number
  travelHours: number
  setupHours: number
  idleHours: number
  hourlyRate: number
  appliedMultiplier: number
  totalCost: number
  status: string
  notes?: string
  mileage?: number
  fuelUsed?: number
}

interface Job {
  id: string
  jobNumber: string
  description: string
  status: string
}

interface User {
  id: string
  name: string
  role: string
}

export default function EquipmentBillingPage() {
  const [tabValue, setTabValue] = useState(0)
  const [equipmentRates, setEquipmentRates] = useState<EquipmentRate[]>([])
  const [equipmentUsage, setEquipmentUsage] = useState<EquipmentUsage[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Dialog states
  const [usageDialogOpen, setUsageDialogOpen] = useState(false)
  const [rateDialogOpen, setRateDialogOpen] = useState(false)
  const [selectedUsage, setSelectedUsage] = useState<EquipmentUsage | null>(null)
  
  // Form states
  const [newUsage, setNewUsage] = useState({
    jobId: '',
    equipmentRateId: '',
    equipmentName: '',
    operatorId: '',
    usageDate: new Date().toISOString().split('T')[0],
    startTime: new Date().toTimeString().slice(0, 5),
    endTime: '',
    workingHours: '',
    travelHours: '',
    setupHours: '',
    notes: '',
    mileage: '',
    fuelUsed: ''
  })
  
  const [newRate, setNewRate] = useState({
    equipmentType: '',
    equipmentClass: '',
    rateName: '',
    description: '',
    hourlyRate: '',
    halfDayRate: '',
    fullDayRate: '',
    weeklyRate: '',
    minimumBillableHours: '1.0',
    roundingIncrement: '0.25',
    travelTimeRate: '',
    setupTimeRate: '',
    overtimeMultiplier: '1.5',
    weekendMultiplier: '1.25',
    requiresOperator: true,
    operatorIncluded: false,
    operatorRate: ''
  })

  useEffect(() => {
    fetchEquipmentRates()
    fetchEquipmentUsage()
    fetchJobs()
    fetchUsers()
  }, [])

  const fetchEquipmentRates = async () => {
    try {
      const response = await fetch('/api/equipment-rates', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      
      if (!response.ok) throw new Error('Failed to fetch equipment rates')
      
      const data = await response.json()
      setEquipmentRates(data)
    } catch (error) {
      console.error('Error fetching equipment rates:', error)
      setError('Failed to load equipment rates')
    }
  }

  const fetchEquipmentUsage = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/equipment-usage', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      
      if (!response.ok) throw new Error('Failed to fetch equipment usage')
      
      const data = await response.json()
      setEquipmentUsage(data)
    } catch (error) {
      console.error('Error fetching equipment usage:', error)
      setError('Failed to load equipment usage data')
    } finally {
      setLoading(false)
    }
  }

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs?status=ACTIVE,IN_PROGRESS,SCHEDULED', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      
      if (!response.ok) throw new Error('Failed to fetch jobs')
      
      const data = await response.json()
      setJobs(data.jobs || [])
    } catch (error) {
      console.error('Error fetching jobs:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      
      if (!response.ok) throw new Error('Failed to fetch users')
      
      const data = await response.json()
      setUsers(data.filter((u: User) => u.role === 'EMPLOYEE' || u.role === 'OWNER_ADMIN'))
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleStartUsage = async () => {
    try {
      const response = await fetch('/api/equipment-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUsage)
      })

      if (!response.ok) throw new Error('Failed to start equipment usage')

      await fetchEquipmentUsage()
      setUsageDialogOpen(false)
      resetUsageForm()
    } catch (error) {
      console.error('Error starting equipment usage:', error)
      setError('Failed to start equipment usage')
    }
  }

  const handleCompleteUsage = async (usageId: string) => {
    try {
      const response = await fetch('/api/equipment-usage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usageId,
          endTime: new Date().toTimeString().slice(0, 5),
          notes: 'Equipment usage completed'
        })
      })

      if (!response.ok) throw new Error('Failed to complete equipment usage')

      await fetchEquipmentUsage()
    } catch (error) {
      console.error('Error completing equipment usage:', error)
      setError('Failed to complete equipment usage')
    }
  }

  const handleAddRate = async () => {
    try {
      const response = await fetch('/api/equipment-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newRate,
          hourlyRate: parseFloat(newRate.hourlyRate) || 0,
          halfDayRate: newRate.halfDayRate ? parseFloat(newRate.halfDayRate) : undefined,
          fullDayRate: newRate.fullDayRate ? parseFloat(newRate.fullDayRate) : undefined,
          weeklyRate: newRate.weeklyRate ? parseFloat(newRate.weeklyRate) : undefined,
          minimumBillableHours: parseFloat(newRate.minimumBillableHours) || 1,
          roundingIncrement: parseFloat(newRate.roundingIncrement) || 0.25,
          travelTimeRate: newRate.travelTimeRate ? parseFloat(newRate.travelTimeRate) : undefined,
          setupTimeRate: newRate.setupTimeRate ? parseFloat(newRate.setupTimeRate) : undefined,
          overtimeMultiplier: parseFloat(newRate.overtimeMultiplier) || 1.5,
          weekendMultiplier: parseFloat(newRate.weekendMultiplier) || 1.25,
          operatorRate: newRate.operatorRate ? parseFloat(newRate.operatorRate) : undefined
        })
      })

      if (!response.ok) throw new Error('Failed to add equipment rate')

      await fetchEquipmentRates()
      setRateDialogOpen(false)
      resetRateForm()
    } catch (error) {
      console.error('Error adding equipment rate:', error)
      setError('Failed to add equipment rate')
    }
  }

  const resetUsageForm = () => {
    setNewUsage({
      jobId: '',
      equipmentRateId: '',
      equipmentName: '',
      operatorId: '',
      usageDate: new Date().toISOString().split('T')[0],
      startTime: new Date().toTimeString().slice(0, 5),
      endTime: '',
      workingHours: '',
      travelHours: '',
      setupHours: '',
      notes: '',
      mileage: '',
      fuelUsed: ''
    })
  }

  const resetRateForm = () => {
    setNewRate({
      equipmentType: '',
      equipmentClass: '',
      rateName: '',
      description: '',
      hourlyRate: '',
      halfDayRate: '',
      fullDayRate: '',
      weeklyRate: '',
      minimumBillableHours: '1.0',
      roundingIncrement: '0.25',
      travelTimeRate: '',
      setupTimeRate: '',
      overtimeMultiplier: '1.5',
      weekendMultiplier: '1.25',
      requiresOperator: true,
      operatorIncluded: false,
      operatorRate: ''
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`
  }

  const getEquipmentIcon = (equipmentType: string) => {
    switch (equipmentType) {
      case 'BUCKET_TRUCK':
        return <TruckIcon />
      case 'CRANE':
        return <EquipmentIcon />
      default:
        return <EquipmentIcon />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS': return 'warning'
      case 'COMPLETED': return 'success'
      case 'BILLED': return 'info'
      default: return 'default'
    }
  }

  // Calculate summary statistics
  const totalRevenue = equipmentUsage.reduce((sum, usage) => sum + usage.totalCost, 0)
  const totalHours = equipmentUsage.reduce((sum, usage) => sum + (usage.billableHours || 0), 0)
  const avgHourlyRate = totalHours > 0 ? totalRevenue / totalHours : 0
  const activeUsages = equipmentUsage.filter(u => u.status === 'IN_PROGRESS').length

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          🚛 Equipment Billing
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track equipment usage, manage billing rates, and analyze utilization
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="caption">
                    Active Equipment
                  </Typography>
                  <Typography variant="h5" color="warning.main">
                    {activeUsages}
                  </Typography>
                </Box>
                <TimerIcon sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="caption">
                    Total Revenue
                  </Typography>
                  <Typography variant="h5" color="success.main">
                    {formatCurrency(totalRevenue)}
                  </Typography>
                </Box>
                <MoneyIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="caption">
                    Billable Hours
                  </Typography>
                  <Typography variant="h5" color="primary.main">
                    {formatHours(totalHours)}
                  </Typography>
                </Box>
                <UtilizationIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="caption">
                    Avg Rate/Hour
                  </Typography>
                  <Typography variant="h5" color="info.main">
                    {formatCurrency(avgHourlyRate)}
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 40, color: 'info.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Equipment Usage" />
          <Tab label="Equipment Rates" />
          <Tab label="Analytics" />
        </Tabs>
      </Box>

      {/* Equipment Usage Tab */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Equipment Usage Tracking</Typography>
          <Button
            variant="contained"
            startIcon={<StartIcon />}
            onClick={() => setUsageDialogOpen(true)}
          >
            Start Equipment Usage
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Equipment</TableCell>
                <TableCell>Job</TableCell>
                <TableCell>Operator</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Hours</TableCell>
                <TableCell align="right">Cost</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {equipmentUsage.map((usage) => (
                <TableRow key={usage.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getEquipmentIcon(usage.equipmentType)}
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {usage.equipmentName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {usage.equipmentType}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {usage.jobNumber}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {usage.jobDescription}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{usage.operatorName}</TableCell>
                  <TableCell>{usage.usageDate}</TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography variant="body2">
                        Total: {formatHours(usage.totalHours || 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Billable: {formatHours(usage.billableHours || 0)}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontWeight="bold">
                      {formatCurrency(usage.totalCost)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={usage.status}
                      size="small"
                      color={getStatusColor(usage.status) as any}
                    />
                  </TableCell>
                  <TableCell align="center">
                    {usage.status === 'IN_PROGRESS' && (
                      <Tooltip title="Complete Usage">
                        <IconButton
                          size="small"
                          onClick={() => handleCompleteUsage(usage.id)}
                          color="success"
                        >
                          <StopIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Equipment Rates Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Equipment Billing Rates</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setRateDialogOpen(true)}
          >
            Add Rate
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Equipment</TableCell>
                <TableCell>Class</TableCell>
                <TableCell align="right">Hourly Rate</TableCell>
                <TableCell align="right">Day Rate</TableCell>
                <TableCell align="right">Weekly Rate</TableCell>
                <TableCell>Operator</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {equipmentRates.map((rate) => (
                <TableRow key={rate.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {rate.rateName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {rate.equipmentType}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={rate.equipmentClass} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell align="right">{formatCurrency(rate.hourlyRate)}</TableCell>
                  <TableCell align="right">
                    {rate.fullDayRate ? formatCurrency(rate.fullDayRate) : '-'}
                  </TableCell>
                  <TableCell align="right">
                    {rate.weeklyRate ? formatCurrency(rate.weeklyRate) : '-'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={rate.operatorIncluded ? 'Included' : 'Additional'}
                      size="small"
                      color={rate.operatorIncluded ? 'success' : 'warning'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small">
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Analytics Tab */}
      <TabPanel value={tabValue} index={2}>
        <Typography variant="h6" gutterBottom>
          Equipment Utilization Analytics
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Detailed analytics and reporting will be implemented here.
        </Typography>
      </TabPanel>

      {/* Start Usage Dialog */}
      <Dialog open={usageDialogOpen} onClose={() => setUsageDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Start Equipment Usage</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Job</InputLabel>
                <Select
                  value={newUsage.jobId}
                  onChange={(e) => setNewUsage({ ...newUsage, jobId: e.target.value })}
                >
                  {jobs.map((job) => (
                    <MenuItem key={job.id} value={job.id}>
                      {job.jobNumber} - {job.description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Equipment Rate</InputLabel>
                <Select
                  value={newUsage.equipmentRateId}
                  onChange={(e) => setNewUsage({ ...newUsage, equipmentRateId: e.target.value })}
                >
                  {equipmentRates.map((rate) => (
                    <MenuItem key={rate.id} value={rate.id}>
                      {rate.rateName} - {formatCurrency(rate.hourlyRate)}/hr
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Equipment Name/Number"
                value={newUsage.equipmentName}
                onChange={(e) => setNewUsage({ ...newUsage, equipmentName: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Operator</InputLabel>
                <Select
                  value={newUsage.operatorId}
                  onChange={(e) => setNewUsage({ ...newUsage, operatorId: e.target.value })}
                >
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Usage Date"
                type="date"
                value={newUsage.usageDate}
                onChange={(e) => setNewUsage({ ...newUsage, usageDate: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Start Time"
                type="time"
                value={newUsage.startTime}
                onChange={(e) => setNewUsage({ ...newUsage, startTime: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Notes"
                value={newUsage.notes}
                onChange={(e) => setNewUsage({ ...newUsage, notes: e.target.value })}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUsageDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleStartUsage} variant="contained">
            Start Usage
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Rate Dialog */}
      <Dialog open={rateDialogOpen} onClose={() => setRateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add Equipment Rate</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Equipment Type</InputLabel>
                <Select
                  value={newRate.equipmentType}
                  onChange={(e) => setNewRate({ ...newRate, equipmentType: e.target.value })}
                >
                  <MenuItem value="BUCKET_TRUCK">Bucket Truck</MenuItem>
                  <MenuItem value="CRANE">Crane</MenuItem>
                  <MenuItem value="GENERATOR">Generator</MenuItem>
                  <MenuItem value="COMPRESSOR">Compressor</MenuItem>
                  <MenuItem value="TRENCHER">Trencher</MenuItem>
                  <MenuItem value="AUGER">Auger</MenuItem>
                  <MenuItem value="OTHER">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Equipment Class</InputLabel>
                <Select
                  value={newRate.equipmentClass}
                  onChange={(e) => setNewRate({ ...newRate, equipmentClass: e.target.value })}
                >
                  <MenuItem value="SIZE_35FT">35ft</MenuItem>
                  <MenuItem value="SIZE_45FT">45ft</MenuItem>
                  <MenuItem value="SIZE_60FT">60ft</MenuItem>
                  <MenuItem value="STANDARD">Standard</MenuItem>
                  <MenuItem value="HEAVY_DUTY">Heavy Duty</MenuItem>
                  <MenuItem value="COMPACT">Compact</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Rate Name"
                value={newRate.rateName}
                onChange={(e) => setNewRate({ ...newRate, rateName: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                label="Hourly Rate"
                type="number"
                value={newRate.hourlyRate}
                onChange={(e) => setNewRate({ ...newRate, hourlyRate: e.target.value })}
                inputProps={{ min: 0, step: 0.01 }}
                fullWidth
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                label="Half Day Rate"
                type="number"
                value={newRate.halfDayRate}
                onChange={(e) => setNewRate({ ...newRate, halfDayRate: e.target.value })}
                inputProps={{ min: 0, step: 0.01 }}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                label="Full Day Rate"
                type="number"
                value={newRate.fullDayRate}
                onChange={(e) => setNewRate({ ...newRate, fullDayRate: e.target.value })}
                inputProps={{ min: 0, step: 0.01 }}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                label="Weekly Rate"
                type="number"
                value={newRate.weeklyRate}
                onChange={(e) => setNewRate({ ...newRate, weeklyRate: e.target.value })}
                inputProps={{ min: 0, step: 0.01 }}
                fullWidth
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddRate} variant="contained">
            Add Rate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button for Quick Start */}
      <Fab
        color="primary"
        aria-label="start equipment"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setUsageDialogOpen(true)}
      >
        <StartIcon />
      </Fab>
    </Box>
  )
}