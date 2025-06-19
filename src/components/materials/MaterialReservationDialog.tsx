'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Grid,
  Card,
  CardContent,
  Alert,
  Autocomplete,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  Close as CloseIcon,
  Inventory as InventoryIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { format, addDays, parseISO } from 'date-fns'

interface Material {
  id: string
  code: string
  name: string
  description?: string
  unit: string
  inStock: number
  totalReserved: number
  availableStock: number
  category: string
  manufacturer?: string
}

interface Job {
  id: string
  jobNumber: string
  title: string
  customer: string
  customerName: string
  status: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface MaterialReservationDialogProps {
  open: boolean
  onClose: () => void
  onReservationCreated?: () => void
  preselectedMaterial?: Material | null
  preselectedJob?: Job | null
}

export default function MaterialReservationDialog({
  open,
  onClose,
  onReservationCreated,
  preselectedMaterial,
  preselectedJob
}: MaterialReservationDialogProps) {
  const [materials, setMaterials] = useState<Material[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [quantityReserved, setQuantityReserved] = useState('')
  const [reservedFor, setReservedFor] = useState('')
  const [reservationType, setReservationType] = useState<'JOB' | 'USER'>('JOB')
  const [reservationDate, setReservationDate] = useState<Date | null>(new Date())
  const [needByDate, setNeedByDate] = useState<Date | null>(addDays(new Date(), 7))
  const [notes, setNotes] = useState('')
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM')

  useEffect(() => {
    if (open) {
      fetchData()
      // Set preselected values
      if (preselectedMaterial) {
        setSelectedMaterial(preselectedMaterial)
      }
      if (preselectedJob) {
        setSelectedJob(preselectedJob)
        setReservationType('JOB')
        setReservedFor(preselectedJob.id)
      }
    } else {
      // Reset form when dialog closes
      resetForm()
    }
  }, [open, preselectedMaterial, preselectedJob])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [materialsRes, jobsRes, usersRes] = await Promise.all([
        fetch('/api/materials?available=true'),
        fetch('/api/jobs?status=estimate,scheduled,dispatched'),
        fetch('/api/users?role=field_crew,admin,office')
      ])

      if (materialsRes.ok) {
        const materialsData = await materialsRes.json()
        setMaterials(materialsData)
      }

      if (jobsRes.ok) {
        const jobsData = await jobsRes.json()
        setJobs(jobsData)
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Failed to load reservation data')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedMaterial(null)
    setSelectedJob(null)
    setQuantityReserved('')
    setReservedFor('')
    setReservationType('JOB')
    setReservationDate(new Date())
    setNeedByDate(addDays(new Date(), 7))
    setNotes('')
    setPriority('MEDIUM')
    setError(null)
  }

  const handleSubmit = async () => {
    if (!selectedMaterial || !quantityReserved || !reservationDate || !needByDate) {
      setError('Please fill in all required fields')
      return
    }

    if (parseInt(quantityReserved) <= 0) {
      setError('Quantity must be greater than 0')
      return
    }

    if (parseInt(quantityReserved) > selectedMaterial.availableStock) {
      setError(`Cannot reserve more than available stock (${selectedMaterial.availableStock} ${selectedMaterial.unit})`)
      return
    }

    if (reservationType === 'JOB' && !selectedJob) {
      setError('Please select a job')
      return
    }

    if (reservationType === 'USER' && !reservedFor) {
      setError('Please select a user')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const reservationData = {
        materialId: selectedMaterial.id,
        jobId: reservationType === 'JOB' ? selectedJob?.id : null,
        userId: reservationType === 'USER' ? reservedFor : null,
        quantityReserved: parseInt(quantityReserved),
        reservationDate: format(reservationDate, 'yyyy-MM-dd'),
        needByDate: format(needByDate, 'yyyy-MM-dd'),
        notes: notes || null,
        priority,
        status: 'ACTIVE'
      }

      const response = await fetch('/api/materials/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reservationData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create reservation')
      }

      onReservationCreated?.()
      onClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create reservation')
    } finally {
      setSubmitting(false)
    }
  }

  const getAvailabilityStatus = (material: Material) => {
    if (material.availableStock <= 0) {
      return { status: 'unavailable', color: 'error', icon: WarningIcon }
    }
    if (material.availableStock <= (material.totalReserved * 0.2)) {
      return { status: 'low', color: 'warning', icon: WarningIcon }
    }
    return { status: 'available', color: 'success', icon: CheckIcon }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'error'
      case 'MEDIUM': return 'warning'
      case 'LOW': return 'info'
      default: return 'default'
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InventoryIcon color="primary" />
              <Typography variant="h6">
                Reserve Materials
              </Typography>
            </Box>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            {/* Material Selection */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <InventoryIcon fontSize="small" />
                  Material Selection
                </Typography>
                
                <Autocomplete
                  options={materials}
                  getOptionLabel={(option) => `${option.code} - ${option.name}`}
                  value={selectedMaterial}
                  onChange={(_, value) => setSelectedMaterial(value)}
                  renderInput={(params) => (
                    <TextField {...params} label="Select Material" required />
                  )}
                  renderOption={(props, option) => {
                    const availability = getAvailabilityStatus(option)
                    const StatusIcon = availability.icon
                    
                    return (
                      <li {...props}>
                        <Box sx={{ width: '100%' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                              <Typography variant="body2">
                                {option.code} - {option.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {option.category} | {option.manufacturer || 'No Brand'}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <StatusIcon fontSize="small" color={availability.color as any} />
                              <Typography variant="caption" color={availability.color + '.main'}>
                                {option.availableStock} {option.unit} available
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </li>
                    )
                  }}
                  disabled={loading}
                />

                {selectedMaterial && (
                  <Card variant="outlined" sx={{ mt: 2, backgroundColor: 'background.default' }}>
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Typography variant="caption" color="text.secondary">Total Stock</Typography>
                          <Typography variant="body2">{selectedMaterial.inStock} {selectedMaterial.unit}</Typography>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Typography variant="caption" color="text.secondary">Currently Reserved</Typography>
                          <Typography variant="body2">{selectedMaterial.totalReserved} {selectedMaterial.unit}</Typography>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Typography variant="caption" color="text.secondary">Available to Reserve</Typography>
                          <Typography 
                            variant="body2" 
                            color={selectedMaterial.availableStock > 0 ? 'success.main' : 'error.main'}
                            fontWeight="bold"
                          >
                            {selectedMaterial.availableStock} {selectedMaterial.unit}
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Typography variant="caption" color="text.secondary">Category</Typography>
                          <Typography variant="body2">{selectedMaterial.category}</Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

            {/* Reservation Details */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon fontSize="small" />
                  Reservation Details
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Quantity to Reserve"
                      type="number"
                      value={quantityReserved}
                      onChange={(e) => setQuantityReserved(e.target.value)}
                      required
                      fullWidth
                      inputProps={{ min: 1, max: selectedMaterial?.availableStock || 999999 }}
                      helperText={selectedMaterial ? `Max: ${selectedMaterial.availableStock} ${selectedMaterial.unit}` : ''}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Priority</InputLabel>
                      <Select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
                        label="Priority"
                      >
                        <MenuItem value="LOW">Low</MenuItem>
                        <MenuItem value="MEDIUM">Medium</MenuItem>
                        <MenuItem value="HIGH">High</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <DatePicker
                      label="Reservation Date"
                      value={reservationDate}
                      onChange={(date) => setReservationDate(date)}
                      slotProps={{ textField: { required: true, fullWidth: true } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <DatePicker
                      label="Need By Date"
                      value={needByDate}
                      onChange={(date) => setNeedByDate(date)}
                      slotProps={{ textField: { required: true, fullWidth: true } }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Assignment */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon fontSize="small" />
                  Reserve For
                </Typography>
                
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Chip
                    label="Job"
                    color={reservationType === 'JOB' ? 'primary' : 'default'}
                    onClick={() => setReservationType('JOB')}
                    variant={reservationType === 'JOB' ? 'filled' : 'outlined'}
                  />
                  <Chip
                    label="User/Team"
                    color={reservationType === 'USER' ? 'primary' : 'default'}
                    onClick={() => setReservationType('USER')}
                    variant={reservationType === 'USER' ? 'filled' : 'outlined'}
                  />
                </Stack>

                {reservationType === 'JOB' ? (
                  <Autocomplete
                    options={jobs}
                    getOptionLabel={(option) => `${option.jobNumber} - ${option.title}`}
                    value={selectedJob}
                    onChange={(_, value) => setSelectedJob(value)}
                    renderInput={(params) => (
                      <TextField {...params} label="Select Job" required />
                    )}
                    renderOption={(props, option) => (
                      <li {...props}>
                        <Box>
                          <Typography variant="body2">
                            {option.jobNumber} - {option.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Customer: {option.customer} | Status: {option.status}
                          </Typography>
                        </Box>
                      </li>
                    )}
                    disabled={loading}
                  />
                ) : (
                  <FormControl fullWidth>
                    <InputLabel>Select User</InputLabel>
                    <Select
                      value={reservedFor}
                      onChange={(e) => setReservedFor(e.target.value)}
                      label="Select User"
                      required
                    >
                      {users.map((user) => (
                        <MenuItem key={user.id} value={user.id}>
                          <Box>
                            <Typography variant="body2">{user.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {user.role} - {user.email}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <TextField
              label="Notes (Optional)"
              multiline
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this reservation..."
              fullWidth
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting || loading || !selectedMaterial || !quantityReserved}
            sx={{
              backgroundColor: '#e14eca',
              '&:hover': {
                backgroundColor: '#d236b8',
              },
            }}
          >
            {submitting ? 'Creating...' : 'Create Reservation'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  )
}