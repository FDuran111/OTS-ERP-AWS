'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Box,
  Chip,
  Alert,
  Autocomplete,
  Stack,
  IconButton,
  Divider,
  Paper,
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material'
import { DatePicker } from '@mui/x-date-pickers'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { format } from 'date-fns'

interface Job {
  id: string
  jobNumber: string
  title: string
  customer: string
  type: string
  estimatedHours?: number
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface JobEntry {
  id: string // Temporary ID for UI tracking
  jobId: string | null
  job: Job | null
  hours: string
  description: string
}

interface MultiJobTimeEntryProps {
  onTimeEntriesCreated: () => void
  preselectedEmployee?: User | null
  preselectedJob?: any
}

export default function MultiJobTimeEntry({ onTimeEntriesCreated, preselectedEmployee, preselectedJob }: MultiJobTimeEntryProps) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(preselectedEmployee || null)
  const [date, setDate] = useState<Date>(preselectedJob?.date ? new Date(preselectedJob.date) : new Date())
  const [entries, setEntries] = useState<JobEntry[]>([
    {
      id: preselectedJob?.editingEntryId || '1',
      jobId: preselectedJob?.jobId || null,
      job: preselectedJob ? {
        id: preselectedJob.jobId,
        jobNumber: preselectedJob.jobNumber,
        title: preselectedJob.jobTitle,
        customer: '',
        type: ''
      } : null,
      hours: preselectedJob?.hours?.toString() || '',
      description: preselectedJob?.description || ''
    }
  ])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Get current user from localStorage
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      const user = JSON.parse(storedUser)
      setCurrentUser(user)
      setIsAdmin(user.role === 'OWNER_ADMIN')
      if (!preselectedEmployee) {
        setSelectedUser(user) // Default to current user if no preselection
      }
    }
  }, [preselectedEmployee])

  useEffect(() => {
    fetchData()
  }, [isAdmin])

  useEffect(() => {
    if (preselectedEmployee) {
      setSelectedUser(preselectedEmployee)
    }
  }, [preselectedEmployee])

  useEffect(() => {
    if (preselectedJob && jobs.length > 0) {
      // Find the full job object from the jobs list
      const fullJob = jobs.find(j => j.id === preselectedJob.jobId)
      if (fullJob) {
        setEntries([{
          id: preselectedJob.editingEntryId || '1',
          jobId: fullJob.id,
          job: fullJob,
          hours: preselectedJob.hours?.toString() || '',
          description: preselectedJob.description || ''
        }])
        setDate(preselectedJob.date ? new Date(preselectedJob.date) : new Date())
      }
    }
  }, [preselectedJob, jobs])

  const fetchData = async () => {
    try {
      const requests: Promise<Response>[] = [
        fetch('/api/jobs?status=estimate,scheduled,dispatched,in_progress', {
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
      const [jobsRes, usersRes] = responses

      if (jobsRes.ok) {
        const jobsData = await jobsRes.json()
        setJobs(jobsData)
      }

      if (usersRes && usersRes.ok) {
        const usersData = await usersRes.json()
        const usersList = Array.isArray(usersData) ? usersData : (usersData.users || [])
        setUsers(usersList)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const addEntry = () => {
    const newEntry: JobEntry = {
      id: Date.now().toString(),
      jobId: null,
      job: null,
      hours: '',
      description: ''
    }
    setEntries([...entries, newEntry])
  }

  const removeEntry = (entryId: string) => {
    if (entries.length === 1) {
      setError('Must have at least one entry')
      return
    }
    setEntries(entries.filter(e => e.id !== entryId))
  }

  const updateEntry = (entryId: string, field: keyof JobEntry, value: any) => {
    setEntries(entries.map(entry => {
      if (entry.id === entryId) {
        if (field === 'job') {
          return { ...entry, job: value, jobId: value?.id || null }
        }
        return { ...entry, [field]: value }
      }
      return entry
    }))
  }

  const calculateTotalHours = () => {
    return entries.reduce((sum, entry) => {
      return sum + (parseFloat(entry.hours) || 0)
    }, 0)
  }

  const validateEntries = (): boolean => {
    if (!selectedUser) {
      setError('Please select an employee')
      return false
    }

    if (!date) {
      setError('Please select a date')
      return false
    }

    // Check if all entries have required fields
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      if (!entry.job) {
        setError(`Entry ${i + 1}: Please select a job`)
        return false
      }
      if (!entry.hours || parseFloat(entry.hours) <= 0) {
        setError(`Entry ${i + 1}: Please enter valid hours`)
        return false
      }
    }

    // Check for duplicate jobs
    const jobIds = entries.map(e => e.jobId).filter(id => id)
    const uniqueJobIds = new Set(jobIds)
    if (jobIds.length !== uniqueJobIds.size) {
      setError('Cannot have duplicate jobs in the same submission')
      return false
    }

    // Check total hours (warning, not error)
    const total = calculateTotalHours()
    if (total > 24) {
      setError('Total hours cannot exceed 24 hours per day')
      return false
    }

    if (total > 12) {
      // Just a warning, still allow submission
      console.warn('Total hours exceed 12 - overtime rates will apply')
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateEntries()) {
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      setSuccess(null)

      // Check if we're editing an existing entry (single entry only)
      if (preselectedJob?.editingEntryId && entries.length === 1) {
        // Update existing entry
        const entry = entries[0]
        const response = await fetch(`/api/time-entries/${preselectedJob.editingEntryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            jobId: entry.jobId!,
            date: format(date, 'yyyy-MM-dd'),
            hours: parseFloat(entry.hours),
            description: entry.description || `Work performed on ${entry.job!.jobNumber}`,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to update time entry')
        }

        setSuccess('Time entry updated successfully')
      } else {
        // Create new entries using bulk endpoint
        const timeEntries = entries.map(entry => ({
          userId: selectedUser!.id,
          jobId: entry.jobId!,
          date: format(date, 'yyyy-MM-dd'),
          hours: parseFloat(entry.hours),
          description: entry.description || `Work performed on ${entry.job!.jobNumber}`,
        }))

        const response = await fetch('/api/time-entries/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            entries: timeEntries,
            userId: selectedUser!.id,
            date: format(date, 'yyyy-MM-dd'),
            currentUserId: currentUser?.id, // Pass the actual logged-in user
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create time entries')
        }

        const result = await response.json()
        setSuccess(`Successfully created ${result.created} time entries totaling ${calculateTotalHours().toFixed(2)} hours`)
      }

      // Reset form to initial state
      setEntries([{ id: '1', jobId: null, job: null, hours: '', description: '' }])
      setDate(new Date())
      if (!preselectedEmployee && !isAdmin) {
        setSelectedUser(currentUser)
      }

      // Call the callback
      onTimeEntriesCreated()

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000)

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create time entries')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📋 Time Entry
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Enter time for one or more jobs. Add multiple jobs with the "Add Another Job" button.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          {/* Employee and Date Selection */}
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {/* Employee Selection (Admin Only) */}
              {isAdmin && users.length > 0 && (
                <Box sx={{ flex: 1, minWidth: 250 }}>
                  <Autocomplete
                    options={users}
                    getOptionLabel={(option) => `${option.name} (${option.email})`}
                    value={selectedUser}
                    onChange={(_, value) => setSelectedUser(value)}
                    disabled={!!preselectedEmployee}
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
                        label="Employee"
                        required
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                        }}
                      />
                    )}
                  />
                </Box>
              )}

              {/* Date Selection */}
              <Box sx={{ flex: 1, minWidth: 250 }}>
                <DatePicker
                  label="Date"
                  value={date}
                  onChange={(newValue) => setDate(newValue || new Date())}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                      InputProps: {
                        startAdornment: <CalendarIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                      }
                    }
                  }}
                />
              </Box>
            </Box>
          </Paper>

          {/* Job Entries */}
          <Stack spacing={2}>
            {entries.map((entry, index) => (
              <Paper key={entry.id} sx={{ p: 2 }} variant="outlined">
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <Chip
                    label={`Entry ${index + 1}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  {entries.length > 1 && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => removeEntry(entry.id)}
                      sx={{ ml: 'auto' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {/* Job Selection */}
                  <Box sx={{ flex: 2, minWidth: 250 }}>
                    <Autocomplete
                      options={jobs}
                      getOptionLabel={(option) => `${option.jobNumber} - ${option.title}`}
                      value={entry.job}
                      onChange={(_, value) => updateEntry(entry.id, 'job', value)}
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
                          label="Job"
                          required
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: <WorkIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                          }}
                        />
                      )}
                    />
                  </Box>

                  {/* Hours Input */}
                  <Box sx={{ minWidth: 100 }}>
                    <TextField
                      fullWidth
                      label="Hours"
                      type="number"
                      value={entry.hours}
                      onChange={(e) => updateEntry(entry.id, 'hours', e.target.value)}
                      inputProps={{ min: 0, max: 24, step: 0.25 }}
                      required
                    />
                  </Box>

                  {/* Description */}
                  <Box sx={{ flex: 1, minWidth: 150 }}>
                    <TextField
                      fullWidth
                      label="Description (Optional)"
                      value={entry.description}
                      onChange={(e) => updateEntry(entry.id, 'description', e.target.value)}
                      placeholder="Work performed..."
                    />
                  </Box>
                </Box>
              </Paper>
            ))}

            {/* Add Entry Button */}
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addEntry}
              sx={{ alignSelf: 'flex-start' }}
            >
              Add Another Job
            </Button>
          </Stack>

          <Divider sx={{ my: 3 }} />

          {/* Summary and Submit */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="body1">
                Total Hours:
              </Typography>
              <Chip
                label={`${calculateTotalHours().toFixed(2)}h`}
                color={calculateTotalHours() > 12 ? 'warning' : 'success'}
                sx={{ fontWeight: 'bold' }}
              />
              {calculateTotalHours() > 12 && (
                <Typography variant="caption" color="warning.main">
                  Overtime rates will apply
                </Typography>
              )}
            </Stack>

            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSubmit}
              disabled={submitting || entries.length === 0}
              size="large"
              sx={{
                backgroundColor: '#00bf9a',
                '&:hover': {
                  backgroundColor: '#00a884',
                },
              }}
            >
              {submitting ? 'Creating Entries...' : `Create ${entries.length} Time Entries`}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </LocalizationProvider>
  )
}