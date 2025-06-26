'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  FormControlLabel,
  Switch,
  Grid,
  Typography,
  Box,
} from '@mui/material'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

interface CreateCustomerDialogProps {
  open: boolean
  onClose: () => void
  onCustomerCreated: () => void
}

const customerSchema = z.object({
  companyName: z.string().max(100, 'Company name too long').optional(),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(20, 'Phone number too long').optional(),
  address: z.string().max(200, 'Address too long').optional(),
  city: z.string().max(50, 'City name too long').optional(),
  state: z.string().max(2, 'State must be 2 characters').optional(),
  zip: z.string().max(10, 'ZIP code too long').optional(),
  isCommercial: z.boolean(),
})

type CustomerFormData = z.infer<typeof customerSchema>

export default function CreateCustomerDialog({ open, onClose, onCustomerCreated }: CreateCustomerDialogProps) {
  const [submitting, setSubmitting] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      companyName: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      isCommercial: false,
    },
  })

  const isCommercial = watch('isCommercial')

  const onSubmit = async (data: CustomerFormData) => {
    try {
      setSubmitting(true)
      
      const submitData = {
        companyName: isCommercial && data.companyName ? data.companyName : undefined,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email && data.email.trim() !== '' ? data.email : undefined,
        phone: data.phone && data.phone.trim() !== '' ? data.phone : undefined,
        address: data.address && data.address.trim() !== '' ? data.address : undefined,
        city: data.city && data.city.trim() !== '' ? data.city : undefined,
        state: data.state && data.state.trim() !== '' ? data.state : undefined,
        zip: data.zip && data.zip.trim() !== '' ? data.zip : undefined,
      }

      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create customer')
      }

      reset()
      onCustomerCreated()
      onClose()
    } catch (error) {
      console.error('Error creating customer:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create customer. Please try again.'
      alert(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Create New Customer</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Customer Type Toggle */}
            <Grid size={{ xs: 12 }}>
              <Controller
                name="isCommercial"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        {...field}
                        checked={field.value}
                      />
                    }
                    label="Commercial Customer"
                  />
                )}
              />
            </Grid>

            {/* Company Name (if commercial) */}
            {isCommercial && (
              <Grid size={{ xs: 12 }}>
                <Controller
                  name="companyName"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value || ''}
                      label="Company Name"
                      fullWidth
                      required={isCommercial}
                    />
                  )}
                />
              </Grid>
            )}

            {/* Contact Person Name */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="firstName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
                    label={isCommercial ? "Contact First Name *" : "First Name *"}
                    fullWidth
                    error={!!errors.firstName}
                    helperText={errors.firstName?.message}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="lastName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
                    label={isCommercial ? "Contact Last Name *" : "Last Name *"}
                    fullWidth
                    error={!!errors.lastName}
                    helperText={errors.lastName?.message}
                  />
                )}
              />
            </Grid>

            {/* Contact Information */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
                    label="Phone Number"
                    fullWidth
                    error={!!errors.phone}
                    helperText={errors.phone?.message}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
                    label="Email Address"
                    type="email"
                    fullWidth
                    error={!!errors.email}
                    helperText={errors.email?.message}
                  />
                )}
              />
            </Grid>

            {/* Address Information */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" gutterBottom>
                Address Information
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
            {submitting ? 'Creating...' : 'Create Customer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}