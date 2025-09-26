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
  Divider,
  IconButton,
} from '@mui/material'
import {
  Add as AddIcon,
  Person as PersonIcon,
} from '@mui/icons-material'
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

interface JobCategory {
  id: string
  categoryCode: string
  categoryName: string
  color: string
  icon: string
}

interface CreateJobDialogProps {
  open: boolean
  onClose: () => void
  onJobCreated: () => void
}

const jobSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  categoryId: z.string().optional(),
  type: z.enum(['SERVICE_CALL', 'INSTALLATION']),
  division: z.enum(['LOW_VOLTAGE', 'LINE_VOLTAGE']).optional(),
  description: z.string().min(1, 'Description is required'),
  customerPO: z.string().optional(),
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
  const [categories, setCategories] = useState<JobCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [isUnscheduled, setIsUnscheduled] = useState(false)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomerData, setNewCustomerData] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    phone: ''
  })

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
      fetchCategories()
    }
  }, [open])

  const fetchCustomers = async () => {
    try {
      // For employees, only fetch customers they created
      const response = await fetch('/api/customers?createdByEmployee=true', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        // Extract customers array from API response
        const customersList = data.customers || data || []
        setCustomers(Array.isArray(customersList) ? customersList : [])
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
      setCustomers([]) // Set empty array on error
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        // Extract users array from API response
        const usersArray = data.users || data || []
        const fieldUsers = Array.isArray(usersArray) ? usersArray.filter((user: User) =>
          user.role === 'EMPLOYEE' || user.role === 'OWNER_ADMIN' || user.role === 'FOREMAN'
        ) : []
        setUsers(fieldUsers)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      setUsers([]) // Set empty array on error
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/job-categories?active=true')
      if (response.ok) {
        const data = await response.json()
        setCategories(data || [])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
      setCategories([])
    }
  }

  const onSubmit = async (data: JobFormData) => {
    try {
      setSubmitting(true)
      
      // If not unscheduled and no date provided, use current date/time
      let scheduledDate = data.scheduledDate
      if (!isUnscheduled && !scheduledDate) {
        scheduledDate = new Date().toISOString()
      }
      
      const submitData = {
        ...data,
        estimatedHours: data.estimatedHours || undefined,
        estimatedCost: data.estimatedCost || undefined,
        scheduledDate: isUnscheduled ? undefined : scheduledDate,
        status: isUnscheduled ? 'ESTIMATE' : 'SCHEDULED',
      }
      
      console.log('Submitting job data:', submitData)

      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Create job error response:', errorData)
        throw new Error(errorData.error || 'Failed to create job')
      }

      reset()
      setIsUnscheduled(false)
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
    setIsUnscheduled(false)
    setShowNewCustomer(false)
    setNewCustomerData({
      firstName: '',
      lastName: '',
      companyName: '',
      email: '',
      phone: ''
    })
    onClose()
  }

  const handleCreateCustomer = async () => {
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newCustomerData,
          createdByEmployee: true  // Mark as employee-created
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create customer')
      }

      const newCustomer = await response.json()

      // Add to customers list and select it
      const updatedCustomers = [...customers, newCustomer]
      setCustomers(updatedCustomers)

      // Set the new customer as selected in the form
      reset({
        ...watch(),
        customerId: newCustomer.id
      })

      // Reset new customer form
      setShowNewCustomer(false)
      setNewCustomerData({
        firstName: '',
        lastName: '',
        companyName: '',
        email: '',
        phone: ''
      })
    } catch (error) {
      console.error('Error creating customer:', error)
      alert('Failed to create customer. Please try again.')
    }
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
            <Grid size={{ xs: 12 }}>
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
                      <MenuItem value="" onClick={() => setShowNewCustomer(true)}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
                          <AddIcon fontSize="small" />
                          <Typography>Add New Customer</Typography>
                        </Box>
                      </MenuItem>
                      {customers.length > 0 && <Divider />}
                      {customers.length === 0 && !showNewCustomer && (
                        <MenuItem disabled>
                          <Typography variant="body2" color="text.secondary">
                            No customers yet - create your first one above
                          </Typography>
                        </MenuItem>
                      )}
                      {customers.map((customer) => (
                        <MenuItem key={customer.id} value={customer.id}>
                          <Box>
                            <Typography>{customer.name || `${customer.firstName} ${customer.lastName}`}</Typography>
                            {customer.companyName && (
                              <Typography variant="caption" color="text.secondary">
                                {customer.companyName}
                              </Typography>
                            )}
                          </Box>
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

            {/* New Customer Form */}
            {showNewCustomer && (
              <>
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, mb: 1 }}>
                    <PersonIcon color="primary" />
                    <Typography variant="subtitle2" color="primary">
                      New Customer Information
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      (Will be sent to admin for review)
                    </Typography>
                  </Box>
                  <Divider />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="First Name *"
                    value={newCustomerData.firstName}
                    onChange={(e) => setNewCustomerData({...newCustomerData, firstName: e.target.value})}
                    fullWidth
                    required
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Last Name *"
                    value={newCustomerData.lastName}
                    onChange={(e) => setNewCustomerData({...newCustomerData, lastName: e.target.value})}
                    fullWidth
                    required
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Company Name"
                    value={newCustomerData.companyName}
                    onChange={(e) => setNewCustomerData({...newCustomerData, companyName: e.target.value})}
                    fullWidth
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Email"
                    type="email"
                    value={newCustomerData.email}
                    onChange={(e) => setNewCustomerData({...newCustomerData, email: e.target.value})}
                    fullWidth
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Phone"
                    value={newCustomerData.phone}
                    onChange={(e) => setNewCustomerData({...newCustomerData, phone: e.target.value})}
                    fullWidth
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleCreateCustomer}
                      disabled={!newCustomerData.firstName || !newCustomerData.lastName}
                    >
                      Create Customer
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setShowNewCustomer(false)
                        setNewCustomerData({
                          firstName: '',
                          lastName: '',
                          companyName: '',
                          email: '',
                          phone: ''
                        })
                      }}
                    >
                      Cancel
                    </Button>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 1 }} />
                </Grid>
              </>
            )}

            {/* Job Category */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Job Category</InputLabel>
                    <Select
                      {...field}
                      value={field.value || ''}
                      label="Job Category"
                    >
                      <MenuItem value="">
                        <em>None</em>
                      </MenuItem>
                      {categories.map((category) => (
                        <MenuItem key={category.id} value={category.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box
                              sx={{
                                width: 28,
                                height: 28,
                                borderRadius: 1,
                                bgcolor: category.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1rem',
                                flexShrink: 0
                              }}
                            >
                              {category.icon}
                            </Box>
                            <Typography>{category.categoryName}</Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            {/* Job Type */}
            <Grid size={{ xs: 12, sm: 6 }}>
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
                      <MenuItem value="INSTALLATION">Installation</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            {/* Division */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="division"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Division</InputLabel>
                    <Select
                      {...field}
                      value={field.value || 'LINE_VOLTAGE'}
                      label="Division"
                    >
                      <MenuItem value="LINE_VOLTAGE">
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: '#ff9800',
                              mr: 1
                            }}
                          />
                          Line Voltage (120V/240V)
                        </Box>
                      </MenuItem>
                      <MenuItem value="LOW_VOLTAGE">
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: '#9c27b0',
                              mr: 1
                            }}
                          />
                          Low Voltage (Security/Data)
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            {/* Customer PO */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="customerPO"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
                    label="Customer PO Number"
                    fullWidth
                    placeholder="Optional"
                  />
                )}
              />
            </Grid>

            {/* Scheduled Date */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="scheduledDate"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
                    label="Scheduled Date"
                    type="datetime-local"
                    fullWidth
                    disabled={isUnscheduled}
                    InputLabelProps={{ shrink: true }}
                    helperText={isUnscheduled ? "Job will be unscheduled" : "Leave empty to use creation date"}
                  />
                )}
              />
            </Grid>

            {/* Unscheduled Option */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <Button
                  variant={isUnscheduled ? "contained" : "outlined"}
                  onClick={() => setIsUnscheduled(!isUnscheduled)}
                  sx={{ 
                    height: '56px',
                    backgroundColor: isUnscheduled ? '#ff9800' : 'transparent',
                    color: isUnscheduled ? 'white' : '#ff9800',
                    borderColor: '#ff9800',
                    '&:hover': {
                      backgroundColor: isUnscheduled ? '#f57c00' : 'rgba(255, 152, 0, 0.08)',
                      borderColor: '#ff9800',
                    }
                  }}
                >
                  {isUnscheduled ? '✓ Unscheduled' : 'Mark as Unscheduled'}
                </Button>
              </FormControl>
            </Grid>

            {/* Description */}
            <Grid size={{ xs: 12 }}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
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
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" gutterBottom>
                Job Address
              </Typography>
            </Grid>
            
            <Grid size={{ xs: 12 }}>
              <Controller
                name="address"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
                    label="Street Address"
                    fullWidth
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="city"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
                    label="City"
                    fullWidth
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 3 }}>
              <Controller
                name="state"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
                    label="State"
                    fullWidth
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 3 }}>
              <Controller
                name="zip"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
                    label="ZIP Code"
                    fullWidth
                  />
                )}
              />
            </Grid>

            {/* Estimates */}
            <Grid size={{ xs: 12, sm: 6 }}>
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

            <Grid size={{ xs: 12, sm: 6 }}>
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
            <Grid size={{ xs: 12 }}>
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