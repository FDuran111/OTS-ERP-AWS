'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Typography,
  Box,
} from '@mui/material'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

interface Job {
  id: string
  jobNumber: string
  description: string
  customer: string
  jobPhases?: Array<{
    id: string
    name: string
    status: string
  }>
}

interface StartTimerDialogProps {
  open: boolean
  onClose: () => void
  onTimerStarted: () => void
}

const timerSchema = z.object({
  jobId: z.string().min(1, 'Job is required'),
  phaseId: z.string().optional(),
  description: z.string().optional(),
})

type TimerFormData = z.infer<typeof timerSchema>

export default function StartTimerDialog({ open, onClose, onTimerStarted }: StartTimerDialogProps) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<TimerFormData>({
    resolver: zodResolver(timerSchema),
    defaultValues: {
      jobId: '',
      phaseId: '',
      description: '',
    },
  })

  const watchedJobId = watch('jobId')

  useEffect(() => {
    if (open) {
      fetchJobs()
    }
  }, [open])

  useEffect(() => {
    if (watchedJobId) {
      const job = jobs.find(j => j.id === watchedJobId)
      setSelectedJob(job || null)
    }
  }, [watchedJobId, jobs])

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs')
      if (!response.ok) throw new Error('Failed to fetch jobs')
      const data = await response.json()
      
      // Filter for active jobs only - be more inclusive for testing
      const activeJobs = data.filter((job: any) => 
        !['cancelled', 'billed'].includes(job.status.toLowerCase())
      )
      
      console.log('Fetched jobs:', data.length, 'Active jobs:', activeJobs.length)
      setJobs(activeJobs)
    } catch (error) {
      console.error('Error fetching jobs:', error)
    }
  }

  const onSubmit = async (data: TimerFormData) => {
    try {
      setSubmitting(true)

      // Get current user from localStorage (temporary solution)
      const storedUser = localStorage.getItem('user')
      const user = storedUser ? JSON.parse(storedUser) : null

      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const response = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          userId: user.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start timer')
      }

      onTimerStarted()
      onClose()
      reset()
    } catch (error) {
      console.error('Error starting timer:', error)
      alert(error instanceof Error ? error.message : 'Failed to start timer')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    reset()
    setSelectedJob(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Start Timer</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid size={12}>
              <Controller
                name="jobId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.jobId}>
                    <InputLabel>Job *</InputLabel>
                    <Select
                      {...field}
                      value={field.value || ''}
                      label="Job *"
                    >
                      {jobs.length === 0 ? (
                        <MenuItem disabled value="">
                          <Typography variant="body2" color="text.secondary">
                            No jobs available
                          </Typography>
                        </MenuItem>
                      ) : (
                        jobs.map((job) => (
                          <MenuItem key={job.id} value={job.id}>
                            <Box>
                              <Typography variant="body2">
                                {job.jobNumber} - {job.description}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {job.customer}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))
                      )}
                    </Select>
                    {errors.jobId && (
                      <Typography variant="caption" color="error">
                        {errors.jobId.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>

            {selectedJob?.jobPhases && selectedJob.jobPhases.length > 0 && (
              <Grid size={12}>
                <Controller
                  name="phaseId"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Phase (Optional)</InputLabel>
                      <Select
                        {...field}
                        value={field.value || ''}
                        label="Phase (Optional)"
                      >
                        <MenuItem value="">
                          <em>No specific phase</em>
                        </MenuItem>
                        {selectedJob.jobPhases!.map((phase) => (
                          <MenuItem key={phase.id} value={phase.id}>
                            {phase.name} - {phase.status.replace('_', ' ')}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
            )}

            <Grid size={12}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Description (Optional)"
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="What are you working on?"
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
              backgroundColor: '#00bf9a',
              '&:hover': {
                backgroundColor: '#00a884',
              },
            }}
          >
            {submitting ? 'Starting...' : 'Start Timer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}