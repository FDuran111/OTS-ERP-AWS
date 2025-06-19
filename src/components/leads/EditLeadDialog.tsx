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
  InputAdornment,
} from '@mui/material'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

interface Lead {
  id: string
  firstName: string
  lastName: string
  companyName?: string | null
  email?: string | null
  phone?: string | null
  source?: string | null
  priority?: string | null
  estimatedValue?: number | null
  description?: string | null
  status: string
}

interface EditLeadDialogProps {
  open: boolean
  onClose: () => void
  onLeadUpdated: () => void
  lead: Lead | null
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
  status: z.string(),
})

type LeadFormData = z.infer<typeof leadSchema>

const leadSources = [
  { value: 'WEBSITE', label: 'Website' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media' },
  { value: 'GOOGLE_ADS', label: 'Google Ads' },
  { value: 'COLD_CALL', label: 'Cold Call' },
  { value: 'WALK_IN', label: 'Walk-in' },
  { value: 'OTHER', label: 'Other' }
]

const leadStatuses = [
  { value: 'COLD_LEAD', label: 'Cold Lead' },
  { value: 'WARM_LEAD', label: 'Warm Lead' },
  { value: 'ESTIMATE_REQUESTED', label: 'Estimate Requested' },
  { value: 'ESTIMATE_SENT', label: 'Estimate Sent' },
  { value: 'ESTIMATE_APPROVED', label: 'Approved' },
  { value: 'JOB_SCHEDULED', label: 'Job Scheduled' },
  { value: 'FOLLOW_UP_REQUIRED', label: 'Follow-up Required' },
  { value: 'LOST', label: 'Lost' },
]

export default function EditLeadDialog({ open, onClose, onLeadUpdated, lead }: EditLeadDialogProps) {
  const [submitting, setSubmitting] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
  })

  useEffect(() => {
    if (open && lead) {
      reset({
        firstName: lead.firstName,
        lastName: lead.lastName,
        companyName: lead.companyName || '',
        email: lead.email || '',
        phone: lead.phone || '',
        source: lead.source || '',
        priority: lead.priority as 'HIGH' | 'MEDIUM' | 'LOW' | undefined,
        estimatedValue: lead.estimatedValue || undefined,
        description: lead.description || '',
        status: lead.status,
      })
    }
  }, [open, lead, reset])

  const onSubmit = async (data: LeadFormData) => {
    if (!lead) return

    try {
      setSubmitting(true)

      const response = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update lead')
      }

      onLeadUpdated()
      onClose()
    } catch (error) {
      console.error('Error updating lead:', error)
      alert(error instanceof Error ? error.message : 'Failed to update lead')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  if (!lead) return null

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Edit Lead</DialogTitle>
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
                    value={field.value || ''}
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
                    value={field.value || ''}
                    label="Last Name *"
                    fullWidth
                    error={!!errors.lastName}
                    helperText={errors.lastName?.message}
                  />
                )}
              />
            </Grid>

            {/* Company */}
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
                    value={field.value || ''}
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
                    value={field.value || ''}
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
                        <MenuItem key={source.value} value={source.value}>
                          {source.label}
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
                name="status"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select {...field} value={field.value || ''} label="Status">
                      {leadStatuses.map((status) => (
                        <MenuItem key={status.value} value={status.value}>
                          {status.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            {/* Estimated Value */}
            <Grid size={{ xs: 12 }}>
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
            <Grid size={{ xs: 12 }}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
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
            {submitting ? 'Updating...' : 'Update Lead'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}