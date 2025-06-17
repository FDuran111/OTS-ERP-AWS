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
} from '@mui/material'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

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

interface CreateJobDialogProps {
  open: boolean
  onClose: () => void
  onJobCreated: () => void
}

const jobSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  type: z.enum(['SERVICE_CALL', 'COMMERCIAL_PROJECT']),
  description: z.string().min(1, 'Description is required'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  scheduledDate: z.string().optional(),
  estimatedHours: z.number().min(0).optional(),
  estimatedCost: z.number().min(0).optional(),
  assignedUserIds: z.array(z.string()).optional(),
})

type JobFormData = z.infer<typeof jobSchema>

export default function CreateJobDialog({ open, onClose, onJobCreated }: CreateJobDialogProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      customerId: '',
      type: 'SERVICE_CALL',
      assignedUserIds: [],
    },
  })

  const selectedCustomer = watch('customerId')

  useEffect(() => {
    if (open) {
      fetchCustomers()
      fetchUsers()
    }
  }, [open])

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
    try {
      setSubmitting(true)
      
      const submitData = {
        ...data,
        estimatedHours: data.estimatedHours || undefined,
        estimatedCost: data.estimatedCost || undefined,
        scheduledDate: data.scheduledDate || undefined,
      }

      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        throw new Error('Failed to create job')
      }

      reset()
      onJobCreated()
      onClose()
    } catch (error) {
      console.error('Error creating job:', error)
      alert('Failed to create job. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  // Auto-fill address from selected customer
  useEffect(() => {
    if (selectedCustomer) {
      const customer = customers.find(c => c.id === selectedCustomer)
      if (customer) {
        // You could auto-fill address fields here if needed
        // For now, we'll just let users enter it manually
      }
    }
  }, [selectedCustomer, customers])

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Create New Job</DialogTitle>
        <DialogContent>
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

            {/* Job Type */}
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

            {/* Scheduled Date */}
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
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={submitting}
          >
            {submitting ? 'Creating...' : 'Create Job'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}