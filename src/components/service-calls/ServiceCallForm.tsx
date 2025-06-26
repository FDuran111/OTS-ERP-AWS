'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  Divider,
  Alert,
  Autocomplete,
  FormControlLabel,
  Switch,
  IconButton,
  Tooltip
} from '@mui/material'
import {
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Emergency as EmergencyIcon,
  Clear as ClearIcon
} from '@mui/icons-material'
import { ServiceCall } from '@/lib/service-calls'

interface ServiceCallFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (serviceCall: ServiceCall) => Promise<void>
  initialData?: Partial<ServiceCall>
  customers?: any[]
  technicians?: any[]
  loading?: boolean
}

const CALL_TYPES = [
  { value: 'EMERGENCY', label: 'Emergency', icon: <EmergencyIcon />, color: 'error' },
  { value: 'URGENT', label: 'Urgent', icon: <WarningIcon />, color: 'warning' },
  { value: 'ROUTINE', label: 'Routine', icon: <ScheduleIcon />, color: 'info' },
  { value: 'SCHEDULED', label: 'Scheduled', icon: <ScheduleIcon />, color: 'info' },
  { value: 'CALLBACK', label: 'Callback', icon: <PhoneIcon />, color: 'secondary' },
  { value: 'WARRANTY', label: 'Warranty', icon: <WarningIcon />, color: 'success' },
  { value: 'MAINTENANCE', label: 'Maintenance', icon: <ScheduleIcon />, color: 'info' }
]

const PRIORITIES = [
  { value: 'LOW', label: 'Low', color: '#4caf50' },
  { value: 'NORMAL', label: 'Normal', color: '#2196f3' },
  { value: 'HIGH', label: 'High', color: '#ff9800' },
  { value: 'URGENT', label: 'Urgent', color: '#f44336' },
  { value: 'EMERGENCY', label: 'Emergency', color: '#9c27b0' }
]

const PROBLEM_CATEGORIES = [
  'Electrical',
  'Lighting',
  'Wiring',
  'Panel/Breaker',
  'Outlet/Switch',
  'Generator',
  'Security System',
  'Fire Alarm',
  'HVAC Electrical',
  'Motor Control',
  'Other'
]

const CALL_SOURCES = [
  'Phone Call',
  'Online Form',
  'Mobile App',
  'Email',
  'Walk-in',
  'Referral',
  'Emergency Hotline',
  'Existing Customer',
  'Other'
]

export default function ServiceCallForm({
  open,
  onClose,
  onSubmit,
  initialData,
  customers = [],
  technicians = [],
  loading = false
}: ServiceCallFormProps) {
  const [formData, setFormData] = useState<Partial<ServiceCall>>({
    callType: 'ROUTINE',
    priority: 'NORMAL',
    status: 'NEW',
    billable: true,
    callSource: 'Phone Call',
    serviceCountry: 'US',
    ...initialData
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }))
      
      // Find selected customer
      if (initialData.customerId) {
        const customer = customers.find(c => c.id === initialData.customerId)
        setSelectedCustomer(customer)
      }
    }
  }, [initialData, customers])

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleCustomerChange = (customer: any) => {
    setSelectedCustomer(customer)
    if (customer) {
      setFormData(prev => ({
        ...prev,
        customerId: customer.id,
        // Auto-fill contact info if not already filled
        contactName: prev.contactName || (customer.companyName || `${customer.firstName} ${customer.lastName}`),
        contactPhone: prev.contactPhone || customer.phone,
        contactEmail: prev.contactEmail || customer.email,
        // Auto-fill service address if not already filled
        serviceAddress: prev.serviceAddress || customer.address,
        serviceCity: prev.serviceCity || customer.city,
        serviceState: prev.serviceState || customer.state,
        serviceZip: prev.serviceZip || customer.zip
      }))
    } else {
      setFormData(prev => ({ ...prev, customerId: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.customerId) newErrors.customerId = 'Customer is required'
    if (!formData.title?.trim()) newErrors.title = 'Title is required'
    if (!formData.callType) newErrors.callType = 'Call type is required'
    if (!formData.priority) newErrors.priority = 'Priority is required'
    
    // Validate emergency/urgent calls have urgency reason
    if (['EMERGENCY', 'URGENT'].includes(formData.priority || '') && !formData.urgencyReason?.trim()) {
      newErrors.urgencyReason = 'Urgency reason is required for emergency/urgent calls'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    
    try {
      await onSubmit(formData as ServiceCall)
      onClose()
    } catch (error) {
      console.error('Failed to submit service call:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    const p = PRIORITIES.find(p => p.value === priority)
    return p?.color || '#2196f3'
  }

  const isEmergencyOrUrgent = ['EMERGENCY', 'URGENT'].includes(formData.priority || '')

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {formData.priority && (
            <Chip
              size="small"
              label={formData.priority}
              sx={{
                bgcolor: getPriorityColor(formData.priority),
                color: 'white',
                fontWeight: 'bold'
              }}
            />
          )}
          {initialData?.id ? 'Edit Service Call' : 'New Service Call'}
          {isEmergencyOrUrgent && (
            <Chip
              icon={<EmergencyIcon />}
              label="High Priority"
              color="error"
              size="small"
            />
          )}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={3}>
          
          {/* Customer and Basic Info */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Customer & Basic Information
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Autocomplete
                      value={selectedCustomer}
                      onChange={(_, customer) => handleCustomerChange(customer)}
                      options={customers}
                      getOptionLabel={(customer) => 
                        customer.companyName || `${customer.firstName} ${customer.lastName}`
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Customer *"
                          error={!!errors.customerId}
                          helperText={errors.customerId}
                          fullWidth
                        />
                      )}
                      renderOption={(props, customer) => (
                        <li {...props}>
                          <Box>
                            <Typography variant="body1">
                              {customer.companyName || `${customer.firstName} ${customer.lastName}`}
                            </Typography>
                            {customer.phone && (
                              <Typography variant="caption" color="text.secondary">
                                {customer.phone}
                              </Typography>
                            )}
                          </Box>
                        </li>
                      )}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Call Source"
                      select
                      fullWidth
                      value={formData.callSource || ''}
                      onChange={(e) => handleChange('callSource', e.target.value)}
                    >
                      {CALL_SOURCES.map(source => (
                        <MenuItem key={source} value={source}>
                          {source}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      label="Problem Title *"
                      fullWidth
                      value={formData.title || ''}
                      onChange={(e) => handleChange('title', e.target.value)}
                      error={!!errors.title}
                      helperText={errors.title}
                      placeholder="Brief description of the problem..."
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      label="Detailed Description"
                      fullWidth
                      multiline
                      rows={3}
                      value={formData.description || ''}
                      onChange={(e) => handleChange('description', e.target.value)}
                      placeholder="Detailed description of the problem, symptoms, customer observations..."
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Call Classification */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Call Classification
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth error={!!errors.callType}>
                      <InputLabel>Call Type *</InputLabel>
                      <Select
                        value={formData.callType || ''}
                        onChange={(e) => handleChange('callType', e.target.value)}
                        label="Call Type *"
                      >
                        {CALL_TYPES.map(type => (
                          <MenuItem key={type.value} value={type.value}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {type.icon}
                              {type.label}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.callType && (
                        <Typography variant="caption" color="error" sx={{ ml: 2 }}>
                          {errors.callType}
                        </Typography>
                      )}
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth error={!!errors.priority}>
                      <InputLabel>Priority *</InputLabel>
                      <Select
                        value={formData.priority || ''}
                        onChange={(e) => handleChange('priority', e.target.value)}
                        label="Priority *"
                      >
                        {PRIORITIES.map(priority => (
                          <MenuItem key={priority.value} value={priority.value}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  bgcolor: priority.color
                                }}
                              />
                              {priority.label}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.priority && (
                        <Typography variant="caption" color="error" sx={{ ml: 2 }}>
                          {errors.priority}
                        </Typography>
                      )}
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Problem Category"
                      select
                      fullWidth
                      value={formData.problemCategory || ''}
                      onChange={(e) => handleChange('problemCategory', e.target.value)}
                    >
                      {PROBLEM_CATEGORIES.map(category => (
                        <MenuItem key={category} value={category}>
                          {category}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  
                  {isEmergencyOrUrgent && (
                    <Grid item xs={12}>
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        <Typography variant="body2" fontWeight="bold">
                          Emergency/Urgent Call - Additional Information Required
                        </Typography>
                      </Alert>
                      <TextField
                        label="Urgency Reason *"
                        fullWidth
                        multiline
                        rows={2}
                        value={formData.urgencyReason || ''}
                        onChange={(e) => handleChange('urgencyReason', e.target.value)}
                        error={!!errors.urgencyReason}
                        helperText={errors.urgencyReason}
                        placeholder="Explain why this is urgent/emergency (safety hazard, power outage, etc.)"
                      />
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Contact Information */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <PhoneIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Contact Information
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="Contact Name"
                      fullWidth
                      value={formData.contactName || ''}
                      onChange={(e) => handleChange('contactName', e.target.value)}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Primary Phone"
                      fullWidth
                      value={formData.contactPhone || ''}
                      onChange={(e) => handleChange('contactPhone', e.target.value)}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Email"
                      fullWidth
                      type="email"
                      value={formData.contactEmail || ''}
                      onChange={(e) => handleChange('contactEmail', e.target.value)}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      label="Alternate Contact"
                      fullWidth
                      value={formData.alternateContact || ''}
                      onChange={(e) => handleChange('alternateContact', e.target.value)}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      label="Alternate Phone"
                      fullWidth
                      value={formData.alternatePhone || ''}
                      onChange={(e) => handleChange('alternatePhone', e.target.value)}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Service Location */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <LocationIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Service Location
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="Service Address"
                      fullWidth
                      value={formData.serviceAddress || ''}
                      onChange={(e) => handleChange('serviceAddress', e.target.value)}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="City"
                      fullWidth
                      value={formData.serviceCity || ''}
                      onChange={(e) => handleChange('serviceCity', e.target.value)}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="State"
                      fullWidth
                      value={formData.serviceState || ''}
                      onChange={(e) => handleChange('serviceState', e.target.value)}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="ZIP Code"
                      fullWidth
                      value={formData.serviceZip || ''}
                      onChange={(e) => handleChange('serviceZip', e.target.value)}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      label="Location Notes"
                      fullWidth
                      multiline
                      rows={2}
                      value={formData.locationNotes || ''}
                      onChange={(e) => handleChange('locationNotes', e.target.value)}
                      placeholder="Access instructions, gate codes, parking, etc."
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Scheduling */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Scheduling
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Requested Date"
                      type="date"
                      fullWidth
                      value={formData.requestedDate || ''}
                      onChange={(e) => handleChange('requestedDate', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Requested Time"
                      fullWidth
                      value={formData.requestedTime || ''}
                      onChange={(e) => handleChange('requestedTime', e.target.value)}
                      placeholder="e.g., Morning, Afternoon, 2-4 PM"
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Estimated Duration (minutes)"
                      type="number"
                      fullWidth
                      value={formData.estimatedDuration || ''}
                      onChange={(e) => handleChange('estimatedDuration', parseInt(e.target.value) || 0)}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Autocomplete
                      value={technicians.find(t => t.id === formData.assignedTechnicianId) || null}
                      onChange={(_, technician) => handleChange('assignedTechnicianId', technician?.id || '')}
                      options={technicians}
                      getOptionLabel={(tech) => `${tech.firstName} ${tech.lastName}`}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Assign Technician"
                          fullWidth
                        />
                      )}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.billable !== false}
                          onChange={(e) => handleChange('billable', e.target.checked)}
                        />
                      }
                      label="Billable Service Call"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          color={isEmergencyOrUrgent ? 'error' : 'primary'}
        >
          {loading ? 'Saving...' : (initialData?.id ? 'Update Service Call' : 'Create Service Call')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}