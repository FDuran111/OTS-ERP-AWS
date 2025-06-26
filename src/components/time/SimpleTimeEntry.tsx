'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  Box,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Autocomplete,
  Stack,
} from '@mui/material'
import {
  Add as AddIcon,
  Schedule as ScheduleIcon,
  Work as WorkIcon,
} from '@mui/icons-material'
import { DatePicker, TimePicker } from '@mui/x-date-pickers'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { format, startOfDay, addHours } from 'date-fns'

interface Job {
  id: string
  jobNumber: string
  title: string
  customer: string
  type: string
  estimatedHours?: number
}

interface ScheduledJob {
  id: string
  jobId: string
  job: Job
  startDate: string
  estimatedHours: number
  crew: any[]
}

interface SimpleTimeEntryProps {
  onTimeEntryCreated: () => void
}

export default function SimpleTimeEntry({ onTimeEntryCreated }: SimpleTimeEntryProps) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([])
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduledJob | null>(null)
  const [entryMode, setEntryMode] = useState<'scheduled' | 'manual'>('scheduled')
  
  // Form state
  const [date, setDate] = useState<Date>(new Date())
  const [startTime, setStartTime] = useState<Date>(new Date())
  const [endTime, setEndTime] = useState<Date>(addHours(new Date(), 8))
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [jobsRes, scheduleRes] = await Promise.all([
        fetch('/api/jobs?status=estimate,scheduled,dispatched,in_progress', {
          credentials: 'include'
        }),
        fetch(`/api/schedule?startDate=${format(startOfDay(new Date()), 'yyyy-MM-dd')}&endDate=${format(startOfDay(new Date()), 'yyyy-MM-dd')}`, {
          credentials: 'include'
        })
      ])

      if (jobsRes.ok) {
        const jobsData = await jobsRes.json()
        setJobs(jobsData)
      }

      if (scheduleRes.ok) {
        const scheduleData = await scheduleRes.json()
        setScheduledJobs(scheduleData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const handleScheduleSelect = (schedule: ScheduledJob | null) => {
    setSelectedSchedule(schedule)
    if (schedule) {
      setSelectedJob(schedule.job)
      setDate(new Date(schedule.startDate))
      // Set default times based on schedule
      const scheduleDate = new Date(schedule.startDate)
      setStartTime(new Date(scheduleDate.getFullYear(), scheduleDate.getMonth(), scheduleDate.getDate(), 8, 0))
      setEndTime(new Date(scheduleDate.getFullYear(), scheduleDate.getMonth(), scheduleDate.getDate(), 8 + Math.round(schedule.estimatedHours), 0))
      setDescription(`Work performed on ${schedule.job.jobNumber}`)
    }
  }

  const handleJobSelect = (job: Job | null) => {
    setSelectedJob(job)
    if (job) {
      setDescription(`Work performed on ${job.jobNumber}`)
      // Set default 8-hour workday
      const today = new Date()
      setStartTime(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0))
      setEndTime(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 0))
    }
  }

  const calculateHours = () => {
    if (!startTime || !endTime) return 0
    const diffMs = endTime.getTime() - startTime.getTime()
    return Math.max(0, diffMs / (1000 * 60 * 60))
  }

  const handleSubmit = async () => {
    if (!selectedJob) {
      setError('Please select a job')
      return
    }

    if (!startTime || !endTime) {
      setError('Please set start and end times')
      return
    }

    if (endTime <= startTime) {
      setError('End time must be after start time')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const user = JSON.parse(localStorage.getItem('user') || '{}')
      
      // Create the time entry directly (no timer needed)
      const response = await fetch('/api/time-entries/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: user.id,
          jobId: selectedJob.id,
          date: format(date, 'yyyy-MM-dd'),
          startTime: new Date(
            date.getFullYear(),
            date.getMonth(), 
            date.getDate(),
            startTime.getHours(),
            startTime.getMinutes()
          ).toISOString(),
          endTime: new Date(
            date.getFullYear(),
            date.getMonth(), 
            date.getDate(),
            endTime.getHours(),
            endTime.getMinutes()
          ).toISOString(),
          hours: calculateHours(),
          description: description || undefined,
          scheduleId: selectedSchedule?.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create time entry')
      }

      // Reset form
      setSelectedJob(null)
      setSelectedSchedule(null)
      setDescription('')
      setDate(new Date())
      setStartTime(new Date())
      setEndTime(addHours(new Date(), 8))
      
      onTimeEntryCreated()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create time entry')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📝 Quick Time Entry
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Log time worked on jobs - no timers needed!
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Entry Mode Selection */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Entry Method
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant={entryMode === 'scheduled' ? 'contained' : 'outlined'}
                startIcon={<ScheduleIcon />}
                onClick={() => setEntryMode('scheduled')}
                size="small"
              >
                From Schedule ({scheduledJobs.length})
              </Button>
              <Button
                variant={entryMode === 'manual' ? 'contained' : 'outlined'}
                startIcon={<WorkIcon />}
                onClick={() => setEntryMode('manual')}
                size="small"
              >
                Manual Entry
              </Button>
            </Stack>
          </Box>

          <Grid container spacing={2}>
            {/* Job Selection */}
            {entryMode === 'scheduled' ? (
              <Grid size={{ xs: 12 }}>
                <Autocomplete
                  options={scheduledJobs}
                  getOptionLabel={(option) => `${option.job.jobNumber} - ${option.job.title} (${option.job.customer})`}
                  value={selectedSchedule}
                  onChange={(_, value) => handleScheduleSelect(value)}
                  renderOption={(props, option) => (
                    <li {...props}>
                      <Box>
                        <Typography variant="body2">
                          {option.job.jobNumber} - {option.job.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.job.customer} • {option.estimatedHours}h estimated • {format(new Date(option.startDate), 'MMM d')}
                        </Typography>
                      </Box>
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField {...params} label="Select Scheduled Job" required />
                  )}
                />
              </Grid>
            ) : (
              <Grid size={{ xs: 12 }}>
                <Autocomplete
                  options={jobs}
                  getOptionLabel={(option) => `${option.jobNumber} - ${option.title} (${option.customer})`}
                  value={selectedJob}
                  onChange={(_, value) => handleJobSelect(value)}
                  renderOption={(props, option) => (
                    <li {...props}>
                      <Box>
                        <Typography variant="body2">
                          {option.jobNumber} - {option.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.customer} • {option.type}
                        </Typography>
                      </Box>
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField {...params} label="Select Job" required />
                  )}
                />
              </Grid>
            )}

            {/* Date */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <DatePicker
                label="Date"
                value={date}
                onChange={(newValue) => setDate(newValue || new Date())}
                slotProps={{ textField: { fullWidth: true, required: true } }}
              />
            </Grid>

            {/* Start Time */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <TimePicker
                label="Start Time"
                value={startTime}
                onChange={(newValue) => setStartTime(newValue || new Date())}
                slotProps={{ textField: { fullWidth: true, required: true } }}
              />
            </Grid>

            {/* End Time */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <TimePicker
                label="End Time"
                value={endTime}
                onChange={(newValue) => setEndTime(newValue || new Date())}
                slotProps={{ textField: { fullWidth: true, required: true } }}
              />
            </Grid>

            {/* Hours Display */}
            <Grid size={{ xs: 12 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Total Hours:
                </Typography>
                <Chip 
                  label={`${calculateHours().toFixed(2)}h`} 
                  color="primary" 
                  size="small" 
                />
              </Box>
            </Grid>

            {/* Description */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the work performed..."
              />
            </Grid>

            {/* Submit Button */}
            <Grid size={{ xs: 12 }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleSubmit}
                disabled={submitting || !selectedJob}
                sx={{
                  backgroundColor: '#00bf9a',
                  '&:hover': {
                    backgroundColor: '#00a884',
                  },
                }}
              >
                {submitting ? 'Creating Entry...' : 'Create Time Entry'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </LocalizationProvider>
  )
}