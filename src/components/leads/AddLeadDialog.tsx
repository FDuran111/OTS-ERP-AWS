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
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  InputAdornment,
} from '@mui/material'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

interface AddLeadDialogProps {
  open: boolean
  onClose: () => void
  onLeadCreated: () => void
}

const leadSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  companyName: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  source: z.string().optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  estimatedValue: z.number().min(0).optional(),
  description: z.string().optional(),
})

type LeadFormData = z.infer<typeof leadSchema>

const leadSources = [
  'Website',
  'Referral',
  'Social Media',
  'Google Ads',
  'Cold Call',
  'Walk-in',
  'Other'
]

export default function AddLeadDialog({ open, onClose, onLeadCreated }: AddLeadDialogProps) {
  const [submitting, setSubmitting] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      priority: 'MEDIUM',
    }
  })

  const onSubmit = async (data: LeadFormData) => {
    try {
      setSubmitting(true)

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create lead')
      }

      onLeadCreated()
      onClose()
      reset()
    } catch (error) {
      console.error('Error creating lead:', error)
      alert(error instanceof Error ? error.message : 'Failed to create lead')
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
        <DialogTitle>Add New Lead</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Name */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="firstName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="First Name *"
                    fullWidth
                    error={!!errors.firstName}
                    helperText={errors.firstName?.message}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="lastName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Last Name *"
                    fullWidth
                    error={!!errors.lastName}
                    helperText={errors.lastName?.message}
                  />
                )}
              />
            </Grid>

            {/* Company */}
            <Grid size={12}>
              <Controller
                name="companyName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Company Name"
                    fullWidth
                    placeholder="Optional company name"
                  />
                )}
              />
            </Grid>

            {/* Contact Info */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Email"
                    fullWidth
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    placeholder="email@example.com"
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Phone"
                    fullWidth
                    placeholder="(555) 123-4567"
                  />
                )}
              />
            </Grid>

            {/* Lead Details */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Controller
                name="source"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Lead Source</InputLabel>
                    <Select {...field} value={field.value || ''} label="Lead Source">
                      <MenuItem value="">Not Specified</MenuItem>
                      {leadSources.map((source) => (
                        <MenuItem key={source} value={source}>
                          {source}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Priority</InputLabel>
                    <Select {...field} value={field.value || 'MEDIUM'} label="Priority">
                      <MenuItem value="HIGH">High</MenuItem>
                      <MenuItem value="MEDIUM">Medium</MenuItem>
                      <MenuItem value="LOW">Low</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Controller
                name="estimatedValue"
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                  <TextField
                    {...field}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    label="Estimated Value"
                    type="number"
                    fullWidth
                    inputProps={{ min: 0, step: 100 }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>
                    }}
                  />
                )}
              />
            </Grid>

            {/* Description */}
            <Grid size={12}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Description/Notes"
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Details about the lead, project requirements, etc."
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
            sx={{
              backgroundColor: '#e14eca',
              '&:hover': { backgroundColor: '#d236b8' },
            }}
          >
            {submitting ? 'Creating...' : 'Create Lead'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}