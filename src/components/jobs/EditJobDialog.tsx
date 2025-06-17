'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  Autocomplete,
  Chip,
  Box,
  Tabs,
  Tab,
} from '@mui/material'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import JobPhasesManager from './JobPhasesManager'

interface Customer {
  id: string
  name: string
  companyName?: string
  firstName: string
  lastName: string
}

interface User {
  id: string
  name: string
  role: string
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
  description?: string
  scheduledDate?: string
}

interface EditJobDialogProps {
  open: boolean
  onClose: () => void
  onJobUpdated: () => void
  job: Job | null
}

const jobSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  type: z.enum(['SERVICE_CALL', 'COMMERCIAL_PROJECT']),
  status: z.enum(['ESTIMATE', 'SCHEDULED', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED', 'BILLED', 'CANCELLED']),
  description: z.string().min(1, 'Description is required'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  scheduledDate: z.string().optional(),
  completedDate: z.string().optional(),
  estimatedHours: z.number().min(0).optional(),
  estimatedCost: z.number().min(0).optional(),
  actualHours: z.number().min(0).optional(),
  actualCost: z.number().min(0).optional(),
  billedAmount: z.number().min(0).optional(),
  assignedUserIds: z.array(z.string()).optional(),
})

type JobFormData = z.infer<typeof jobSchema>

export default function EditJobDialog({ open, onClose, onJobUpdated, job }: EditJobDialogProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [tabValue, setTabValue] = useState(0)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
  })

  useEffect(() => {
    if (open) {
      fetchCustomers()
      fetchUsers()
      
      if (job) {
        // Pre-populate form with job data
        reset({
          customerId: job.customerId,
          type: job.type,
          status: job.status.toUpperCase() as any,
          description: job.description,
          address: job.address || '',
          city: job.city || '',
          state: job.state || '',
          zip: job.zip || '',
          scheduledDate: job.scheduledDate ? new Date(job.scheduledDate).toISOString().slice(0, 16) : '',
          completedDate: job.completedDate ? new Date(job.completedDate).toISOString().slice(0, 16) : '',
          estimatedHours: job.estimatedHours,
          estimatedCost: job.estimatedCost,
          actualHours: job.actualHours,
          actualCost: job.actualCost,
          billedAmount: job.billedAmount,
          assignedUserIds: [], // Will be set after users are loaded
        })
      }
    }
  }, [open, job, reset])

  // Set assigned users after users are loaded
  useEffect(() => {
    if (job && users.length > 0) {
      const assignedUserIds = users
        .filter(user => job.crew.includes(user.name))
        .map(user => user.id)
      
      reset(prev => ({
        ...prev,
        assignedUserIds
      }))
    }
  }, [job, users, reset])

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers')
      if (response.ok) {
        const data = await response.json()
        setCustomers(data)
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        const fieldUsers = data.filter((user: User) => 
          user.role === 'FIELD_CREW' || user.role === 'ADMIN'
        )
        setUsers(fieldUsers)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const onSubmit = async (data: JobFormData) => {
    if (!job) return

    try {
      setSubmitting(true)
      
      const submitData = {
        ...data,
        estimatedHours: data.estimatedHours || undefined,
        estimatedCost: data.estimatedCost || undefined,
        actualHours: data.actualHours || undefined,
        actualCost: data.actualCost || undefined,
        billedAmount: data.billedAmount || undefined,
        scheduledDate: data.scheduledDate || undefined,
        completedDate: data.completedDate || undefined,
      }

      const response = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        throw new Error('Failed to update job')
      }

      onJobUpdated()
      onClose()
    } catch (error) {
      console.error('Error updating job:', error)
      alert('Failed to update job. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    reset()
    setTabValue(0)
    onClose()
  }

  if (!job) return null

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>Edit Job - {job.jobNumber}</DialogTitle>
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="Job Details" />
            <Tab label="Job Phases" />
          </Tabs>
        </Box>

        {tabValue === 0 && (
          <form onSubmit={handleSubmit(onSubmit)}>
            <Box>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Customer Selection */}
            <Grid item xs={12}>
              <Controller
                name="customerId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.customerId}>
                    <InputLabel>Customer *</InputLabel>
                    <Select
                      {...field}
                      value={field.value || ''}
                      label="Customer *"
                    >
                      {customers.map((customer) => (
                        <MenuItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.customerId && (
                      <Typography variant="caption" color="error">
                        {errors.customerId.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>

            {/* Job Type and Status */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Job Type</InputLabel>
                    <Select
                      {...field}
                      label="Job Type"
                    >
                      <MenuItem value="SERVICE_CALL">Service Call</MenuItem>
                      <MenuItem value="COMMERCIAL_PROJECT">Commercial Project</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      {...field}
                      label="Status"
                    >
                      <MenuItem value="ESTIMATE">Estimate</MenuItem>
                      <MenuItem value="SCHEDULED">Scheduled</MenuItem>
                      <MenuItem value="DISPATCHED">Dispatched</MenuItem>
                      <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                      <MenuItem value="COMPLETED">Completed</MenuItem>
                      <MenuItem value="BILLED">Billed</MenuItem>
                      <MenuItem value="CANCELLED">Cancelled</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Job Description *"
                    multiline
                    rows={3}
                    fullWidth
                    error={!!errors.description}
                    helperText={errors.description?.message}
                  />
                )}
              />
            </Grid>

            {/* Dates */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="scheduledDate"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Scheduled Date"
                    type="datetime-local"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="completedDate"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Completed Date"
                    type="datetime-local"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />
            </Grid>

            {/* Address Fields */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Job Address
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <Controller
                name="address"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Street Address"
                    fullWidth
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="city"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="City"
                    fullWidth
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={3}>
              <Controller
                name="state"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="State"
                    fullWidth
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={3}>
              <Controller
                name="zip"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="ZIP Code"
                    fullWidth
                  />
                )}
              />
            </Grid>

            {/* Estimates */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="estimatedHours"
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                  <TextField
                    {...field}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
                    label="Estimated Hours"
                    type="number"
                    inputProps={{ min: 0, step: 0.5 }}
                    fullWidth
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="estimatedCost"
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                  <TextField
                    {...field}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
                    label="Estimated Cost"
                    type="number"
                    inputProps={{ min: 0, step: 0.01 }}
                    InputProps={{
                      startAdornment: <Typography>$</Typography>,
                    }}
                    fullWidth
                  />
                )}
              />
            </Grid>

            {/* Actuals */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="actualHours"
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                  <TextField
                    {...field}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
                    label="Actual Hours"
                    type="number"
                    inputProps={{ min: 0, step: 0.5 }}
                    fullWidth
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="actualCost"
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                  <TextField
                    {...field}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
                    label="Actual Cost"
                    type="number"
                    inputProps={{ min: 0, step: 0.01 }}
                    InputProps={{
                      startAdornment: <Typography>$</Typography>,
                    }}
                    fullWidth
                  />
                )}
              />
            </Grid>

            {/* Billed Amount */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="billedAmount"
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                  <TextField
                    {...field}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
                    label="Billed Amount"
                    type="number"
                    inputProps={{ min: 0, step: 0.01 }}
                    InputProps={{
                      startAdornment: <Typography>$</Typography>,
                    }}
                    fullWidth
                  />
                )}
              />
            </Grid>

            {/* Crew Assignment */}
            <Grid item xs={12}>
              <Controller
                name="assignedUserIds"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    {...field}
                    multiple
                    options={users}
                    getOptionLabel={(option) => option.name}
                    value={users.filter(user => field.value?.includes(user.id)) || []}
                    onChange={(_, newValue) => {
                      field.onChange(newValue.map(user => user.id))
                    }}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          variant="outlined"
                          label={option.name}
                          {...getTagProps({ index })}
                          key={option.id}
                        />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Assign Crew Members"
                        placeholder="Select crew members"
                      />
                    )}
                  />
                )}
              />
            </Grid>
          </Grid>
            </Box>
          </form>
        )}

        {tabValue === 1 && (
          <JobPhasesManager 
            jobId={job.id} 
            onPhasesChange={onJobUpdated}
          />
        )}
      </DialogContent>
      <DialogActions>
        {tabValue === 0 && (
          <>
            <Button onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit(onSubmit)}
              variant="contained" 
              disabled={submitting}
            >
              {submitting ? 'Updating...' : 'Update Job'}
            </Button>
          </>
        )}
        {tabValue === 1 && (
          <Button onClick={handleClose}>
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}