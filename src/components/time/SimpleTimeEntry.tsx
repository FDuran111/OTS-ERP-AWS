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

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface SimpleTimeEntryProps {
  onTimeEntryCreated: () => void
  noCard?: boolean // Optional prop to skip Card wrapper for dialog usage
  preselectedJob?: {
    jobId: string
    jobNumber?: string
    jobTitle?: string
    estimatedHours?: number
  } | null
}

export default function SimpleTimeEntry({ onTimeEntryCreated, noCard = false, preselectedJob }: SimpleTimeEntryProps) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([])
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduledJob | null>(null)
  const [entryMode, setEntryMode] = useState<'scheduled' | 'manual' | 'new'>('manual') // Default to manual
  
  // Form state
  const [date, setDate] = useState<Date>(new Date())
  const [startTime, setStartTime] = useState<Date>(new Date())
  const [endTime, setEndTime] = useState<Date>(addHours(new Date(), 8))
  const [hours, setHours] = useState<string>('8.0') // Direct hours input
  const [useTimeRange, setUseTimeRange] = useState<boolean>(false) // Toggle between hours input and time range
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // New job entry fields
  const [newJobNumber, setNewJobNumber] = useState('')
  const [newJobCustomer, setNewJobCustomer] = useState('')
  const [newJobDescription, setNewJobDescription] = useState('')
  
  // User state
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Get current user from localStorage
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      const user = JSON.parse(storedUser)
      setCurrentUser(user)
      setSelectedUser(user) // Default to current user
      setIsAdmin(user.role === 'OWNER_ADMIN')
    }
  }, [])
  
  useEffect(() => {
    fetchData()
  }, [isAdmin])

  // Set preselected job when prop changes
  useEffect(() => {
    if (preselectedJob && jobs.length > 0) {
      const job = jobs.find(j => j.id === preselectedJob.jobId)
      if (job) {
        setSelectedJob(job)
        setEntryMode('manual')
      }
    }
  }, [preselectedJob, jobs])

  const fetchData = async () => {
    try {
      const requests: Promise<Response>[] = [
        fetch('/api/jobs?status=estimate,scheduled,dispatched,in_progress', {
          credentials: 'include'
        }),
        fetch(`/api/schedule?startDate=${format(startOfDay(new Date()), 'yyyy-MM-dd')}&endDate=${format(startOfDay(new Date()), 'yyyy-MM-dd')}`, {
          credentials: 'include'
        })
      ]
      
      // If admin, fetch all users
      if (isAdmin) {
        requests.push(
          fetch('/api/users', {
            credentials: 'include'
          })
        )
      }
      
      const responses = await Promise.all(requests)
      const [jobsRes, scheduleRes, usersRes] = responses

      if (jobsRes.ok) {
        const jobsData = await jobsRes.json()
        setJobs(jobsData)
      }

      if (scheduleRes.ok) {
        const scheduleData = await scheduleRes.json()
        setScheduledJobs(scheduleData)
      }
      
      if (usersRes && usersRes.ok) {
        const usersData = await usersRes.json()
        // Handle both response formats (with and without 'users' wrapper)
        const usersList = Array.isArray(usersData) ? usersData : (usersData.users || [])
        setUsers(usersList.filter((u: User) => u.role !== 'OWNER_ADMIN' || u.id === currentUser?.id))
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
    if (!useTimeRange) {
      return parseFloat(hours) || 0
    }
    if (!startTime || !endTime) return 0
    const diffMs = endTime.getTime() - startTime.getTime()
    return Math.max(0, diffMs / (1000 * 60 * 60))
  }

  const handleSubmit = async () => {
    // Validation for new job entry mode
    if (entryMode === 'new') {
      if (!newJobNumber || !newJobCustomer) {
        setError('Please fill in job number and customer name')
        return
      }
    } else {
      if (!selectedJob) {
        setError('Please select a job')
        return
      }
    }

    if (!useTimeRange && (!hours || parseFloat(hours) <= 0)) {
      setError('Please enter valid hours')
      return
    }

    if (useTimeRange) {
      if (!startTime || !endTime) {
        setError('Please set start and end times')
        return
      }

      if (endTime <= startTime) {
        setError('End time must be after start time')
        return
      }
    }

    try {
      setSubmitting(true)
      setError(null)

      // For new job entries, create a different payload
      if (entryMode === 'new') {
        const newJobData = {
          userId: selectedUser?.id || currentUser?.id,
          jobNumber: newJobNumber,
          customer: newJobCustomer,
          description: newJobDescription,
          date: format(date, 'yyyy-MM-dd'),
          hours: calculateHours(),
          workDescription: description || undefined,
        }

        // Send to a special endpoint for new job entries
        const response = await fetch('/api/time-entries/new-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(newJobData),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create new job entry')
        }

        // Reset form
        setNewJobNumber('')
        setNewJobCustomer('')
        setNewJobDescription('')
        setDescription('')
        setDate(new Date())
        setStartTime(new Date())
        setEndTime(addHours(new Date(), 8))

        onTimeEntryCreated()
        return
      }

      // Create the time entry directly (no timer needed)
      const timeData: any = {
        userId: selectedUser?.id || currentUser?.id,
        jobId: selectedJob.id,
        date: format(date, 'yyyy-MM-dd'),
        hours: calculateHours(),
        description: description || undefined,
        scheduleId: selectedSchedule?.id,
      }
      
      // Only include time range if using time range method
      if (useTimeRange) {
        timeData.startTime = new Date(
          date.getFullYear(),
          date.getMonth(), 
          date.getDate(),
          startTime.getHours(),
          startTime.getMinutes()
        ).toISOString()
        timeData.endTime = new Date(
          date.getFullYear(),
          date.getMonth(), 
          date.getDate(),
          endTime.getHours(),
          endTime.getMinutes()
        ).toISOString()
      }
      
      const response = await fetch('/api/time-entries/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(timeData),
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

  const content = (
    <>
      {!noCard && (
        <>
          <Typography variant="h6" gutterBottom>
            📝 Manual Time Entry
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Enter hours worked manually - perfect for field crews logging time at the end of the day
          </Typography>
        </>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

          {/* Entry Mode Selection - Show different options based on user role */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Entry Method
            </Typography>
            <Stack direction="row" spacing={1}>
              {/* Show 'From Schedule' only for non-employees */}
              {currentUser?.role !== 'EMPLOYEE' && (
                <Button
                  variant={entryMode === 'scheduled' ? 'contained' : 'outlined'}
                  startIcon={<ScheduleIcon />}
                  onClick={() => setEntryMode('scheduled')}
                  size="small"
                >
                  From Schedule ({scheduledJobs.length})
                </Button>
              )}
              <Button
                variant={entryMode === 'manual' ? 'contained' : 'outlined'}
                startIcon={<WorkIcon />}
                onClick={() => setEntryMode('manual')}
                size="small"
              >
                Existing Job
              </Button>
              {/* Show 'New Job Entry' only for employees - TEMPORARILY DISABLED */}
              {false && currentUser?.role === 'EMPLOYEE' && (
                <Button
                  variant={entryMode === 'new' ? 'contained' : 'outlined'}
                  startIcon={<AddIcon />}
                  onClick={() => setEntryMode('new')}
                  size="small"
                >
                  New Job Entry
                </Button>
              )}
            </Stack>
          </Box>

          <Grid container spacing={2}>
            {/* Employee Selection (Admin Only) */}
            {isAdmin && users.length > 0 && (
              <Grid size={{ xs: 12 }}>
                <Autocomplete
                  options={users}
                  getOptionLabel={(option) => `${option.name} (${option.email})`}
                  value={selectedUser}
                  onChange={(_, value) => setSelectedUser(value)}
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props as any
                    return (
                      <li key={key} {...otherProps}>
                        <Box>
                          <Typography variant="body2">
                            {option.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.email} • {option.role}
                          </Typography>
                        </Box>
                      </li>
                    )
                  }}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label="Select Employee" 
                      required 
                      helperText="As an admin, you can enter time for any employee"
                    />
                  )}
                />
              </Grid>
            )}
            
            {/* Job Selection based on entry mode */}
            {entryMode === 'new' ? (
              // New Job Entry Fields
              <>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Job Number"
                    value={newJobNumber}
                    onChange={(e) => setNewJobNumber(e.target.value)}
                    required
                    placeholder="e.g., J-2024-999"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Customer Name"
                    value={newJobCustomer}
                    onChange={(e) => setNewJobCustomer(e.target.value)}
                    required
                    placeholder="e.g., John Smith"
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Job Description"
                    value={newJobDescription}
                    onChange={(e) => setNewJobDescription(e.target.value)}
                    multiline
                    rows={2}
                    placeholder="Brief description of the job..."
                  />
                </Grid>
              </>
            ) : entryMode === 'scheduled' ? (
              <Grid size={{ xs: 12 }}>
                <Autocomplete
                  options={scheduledJobs}
                  getOptionLabel={(option) => `${option.job.jobNumber} - ${option.job.title} (${option.job.customer})`}
                  value={selectedSchedule}
                  onChange={(_, value) => handleScheduleSelect(value)}
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props as any
                    return (
                      <li key={key} {...otherProps}>
                        <Box>
                          <Typography variant="body2">
                            {option.job.jobNumber} - {option.job.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.job.customer} • {option.estimatedHours}h estimated • {format(new Date(option.startDate), 'MMM d')}
                          </Typography>
                        </Box>
                      </li>
                    )
                  }}
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
                  disabled={!!preselectedJob} // Disable when job is preselected
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props as any
                    return (
                      <li key={key} {...otherProps}>
                        <Box>
                          <Typography variant="body2">
                            {option.jobNumber} - {option.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.customer} • {option.type}
                          </Typography>
                        </Box>
                      </li>
                    )
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={preselectedJob ? "Job (Auto-selected)" : "Select Job"}
                      required
                      helperText={preselectedJob ? "This job was selected from your scheduled jobs" : undefined}
                    />
                  )}
                />
              </Grid>
            )}

            {/* Date */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <DatePicker
                label="Date"
                value={date}
                onChange={(newValue) => setDate(newValue || new Date())}
                slotProps={{ textField: { fullWidth: true, required: true } }}
              />
            </Grid>

            {/* Hours Entry Method Toggle */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Time Entry Method</InputLabel>
                <Select
                  value={useTimeRange ? 'range' : 'hours'}
                  onChange={(e) => setUseTimeRange(e.target.value === 'range')}
                  label="Time Entry Method"
                >
                  <MenuItem value="hours">Direct Hours Input</MenuItem>
                  <MenuItem value="range">Start/End Time Range</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {!useTimeRange ? (
              /* Direct Hours Input */
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Hours Worked"
                  type="number"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  inputProps={{ min: 0, max: 24, step: 0.25 }}
                  helperText="Enter the total hours worked (e.g., 8.5)"
                  required
                />
              </Grid>
            ) : (
              /* Time Range Input */
              <>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TimePicker
                    label="Start Time"
                    value={startTime}
                    onChange={(newValue) => setStartTime(newValue || new Date())}
                    slotProps={{ textField: { fullWidth: true, required: true } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TimePicker
                    label="End Time"
                    value={endTime}
                    onChange={(newValue) => setEndTime(newValue || new Date())}
                    slotProps={{ textField: { fullWidth: true, required: true } }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Calculated Hours:
                    </Typography>
                    <Chip 
                      label={`${calculateHours().toFixed(2)}h`} 
                      color="primary" 
                      size="small" 
                    />
                  </Box>
                </Grid>
              </>
            )}

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
                disabled={submitting || (entryMode !== 'new' && !selectedJob)}
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
    </>
  )

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      {noCard ? (
        content
      ) : (
        <Card>
          <CardContent>{content}</CardContent>
        </Card>
      )}
    </LocalizationProvider>
  )
}