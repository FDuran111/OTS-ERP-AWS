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
  Alert,
} from '@mui/material'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

interface Job {
  id: string
  jobNumber: string
  description: string
  customer: {
    id: string
    firstName: string
    lastName: string
    companyName?: string
  }
  status: string
}

interface ScheduleJobDialogProps {
  open: boolean
  onClose: () => void
  onJobScheduled: () => void
}

const scheduleSchema = z.object({
  jobId: z.string().min(1, 'Job selection is required'),
  scheduledDate: z.string().min(1, 'Scheduled date is required'),
  scheduledTime: z.string().min(1, 'Scheduled time is required'),
  estimatedHours: z.number().min(0.5, 'Estimated hours must be at least 0.5').optional(),
  notes: z.string().optional(),
  reminderDays: z.number().min(0, 'Reminder days must be 0 or greater').optional(),
})

type ScheduleFormData = z.infer<typeof scheduleSchema>

export default function ScheduleJobDialog({ open, onClose, onJobScheduled }: ScheduleJobDialogProps) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      reminderDays: 3,
    },
  })

  useEffect(() => {
    if (open) {
      fetchAvailableJobs()
    }
  }, [open])

  const fetchAvailableJobs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/jobs?status=ESTIMATE,SCHEDULED&limit=50')
      if (response.ok) {
        const data = await response.json()
        setJobs(data.jobs || [])
      }
    } catch (error) {
      console.error('Error fetching jobs:', error)
      setError('Failed to load available jobs')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: ScheduleFormData) => {
    try {
      setSubmitting(true)
      setError(null)

      // Combine date and time
      const scheduledDateTime = new Date(`${data.scheduledDate}T${data.scheduledTime}`)

      const response = await fetch('/api/schedule/job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: data.jobId,
          scheduledDate: scheduledDateTime.toISOString(),
          estimatedHours: data.estimatedHours,
          notes: data.notes,
          reminderDays: data.reminderDays ?? 3,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to schedule job')
      }

      onJobScheduled()
      onClose()
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule job')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    reset()
    setError(null)
    onClose()
  }

  const getJobDisplayName = (job: Job) => {
    const customerName = job.customer.companyName || 
      `${job.customer.firstName} ${job.customer.lastName}`
    return `${job.jobNumber} - ${job.description} (${customerName})`
  }

  // Get default time (9:00 AM) in HH:MM format
  const getDefaultTime = () => {
    return '09:00'
  }

  // Get tomorrow's date as default
  const getDefaultDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Schedule Job</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {error && (
              <Grid item xs={12}>
                <Alert severity="error">{error}</Alert>
              </Grid>
            )}

            {/* Job Selection */}
            <Grid item xs={12}>
              <Controller
                name="jobId"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    {...field}
                    options={jobs}
                    getOptionLabel={getJobDisplayName}
                    value={jobs.find(job => job.id === field.value) || null}
                    onChange={(_, newValue) => field.onChange(newValue?.id || '')}
                    loading={loading}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Job *"
                        error={!!errors.jobId}
                        helperText={errors.jobId?.message}
                      />
                    )}
                  />
                )}
              />
            </Grid>

            {/* Date and Time */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="scheduledDate"
                control={control}
                defaultValue={getDefaultDate()}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Scheduled Date *"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.scheduledDate}
                    helperText={errors.scheduledDate?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="scheduledTime"
                control={control}
                defaultValue={getDefaultTime()}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Scheduled Time *"
                    type="time"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.scheduledTime}
                    helperText={errors.scheduledTime?.message}
                  />
                )}
              />
            </Grid>

            {/* Estimated Hours */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="estimatedHours"
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                  <TextField
                    {...field}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    label="Estimated Hours"
                    type="number"
                    fullWidth
                    inputProps={{ min: 0.5, step: 0.5 }}
                    error={!!errors.estimatedHours}
                    helperText={errors.estimatedHours?.message}
                  />
                )}
              />
            </Grid>

            {/* Reminder Days */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="reminderDays"
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                  <TextField
                    {...field}
                    value={value || 3}
                    onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : 3)}
                    label="Reminder Days Before"
                    type="number"
                    fullWidth
                    inputProps={{ min: 0, max: 30 }}
                    error={!!errors.reminderDays}
                    helperText={errors.reminderDays?.message || 'Days before job to show reminder'}
                  />
                )}
              />
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Scheduling Notes"
                    multiline
                    rows={3}
                    fullWidth
                    placeholder="Any special instructions or notes for this scheduled job..."
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
              '&:hover': {
                backgroundColor: '#d236b8',
              },
            }}
          >
            {submitting ? 'Scheduling...' : 'Schedule Job'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}