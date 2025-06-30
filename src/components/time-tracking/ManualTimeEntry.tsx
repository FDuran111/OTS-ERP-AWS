'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Box,
  Typography,
  Alert,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from '@mui/material'
import { DatePicker, TimePicker } from '@mui/x-date-pickers'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { format, differenceInMinutes, setMinutes, setHours } from 'date-fns'

interface Job {
  id: string
  jobNumber: string
  title: string
  customer: string
}

interface ManualTimeEntryProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: any) => Promise<void>
  jobs: Job[]
  userId: string
}

export default function ManualTimeEntry({
  open,
  onClose,
  onSubmit,
  jobs,
  userId,
}: ManualTimeEntryProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [date, setDate] = useState<Date | null>(new Date())
  const [startTime, setStartTime] = useState<Date | null>(new Date())
  const [endTime, setEndTime] = useState<Date | null>(new Date())
  const [hours, setHours] = useState<number>(0)
  const [description, setDescription] = useState('')

  // Round time to nearest 15-minute increment
  const roundToQuarterHour = (date: Date): Date => {
    const minutes = date.getMinutes()
    const roundedMinutes = Math.round(minutes / 15) * 15
    return setMinutes(date, roundedMinutes)
  }

  // Calculate hours based on start and end time
  const calculateHours = (start: Date | null, end: Date | null): number => {
    if (!start || !end) return 0
    
    const diffInMinutes = differenceInMinutes(end, start)
    if (diffInMinutes <= 0) return 0
    
    // Round to nearest 15-minute increment
    const roundedMinutes = Math.round(diffInMinutes / 15) * 15
    return roundedMinutes / 60
  }

  // Update hours when times change
  const handleTimeChange = (type: 'start' | 'end', value: Date | null) => {
    if (!value) return

    const roundedTime = roundToQuarterHour(value)
    
    if (type === 'start') {
      setStartTime(roundedTime)
      setHours(calculateHours(roundedTime, endTime))
    } else {
      setEndTime(roundedTime)
      setHours(calculateHours(startTime, roundedTime))
    }
  }

  // Handle manual hours input
  const handleHoursChange = (value: string) => {
    const numValue = parseFloat(value)
    if (isNaN(numValue)) {
      setHours(0)
      return
    }

    // Round to nearest 0.25
    const roundedHours = Math.round(numValue * 4) / 4
    setHours(roundedHours)

    // Update end time based on hours
    if (startTime && roundedHours > 0) {
      const endDate = new Date(startTime.getTime() + roundedHours * 60 * 60 * 1000)
      setEndTime(endDate)
    }
  }

  const handleSubmit = async () => {
    if (!selectedJob || !date || !startTime || !endTime || hours === 0) {
      setError('Please fill in all required fields')
      return
    }

    if (endTime <= startTime) {
      setError('End time must be after start time')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Combine date with times
      const startDateTime = new Date(date)
      startDateTime.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0)
      
      const endDateTime = new Date(date)
      endDateTime.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0)

      await onSubmit({
        userId,
        jobId: selectedJob.id,
        date: format(date, 'yyyy-MM-dd'),
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        hours,
        description: description.trim() || undefined,
      })

      // Reset form
      setSelectedJob(null)
      setDescription('')
      setHours(0)
      onClose()
    } catch (error: any) {
      setError(error.message || 'Failed to create time entry')
    } finally {
      setLoading(false)
    }
  }

  const hoursOptions = []
  for (let h = 0.25; h <= 24; h += 0.25) {
    hoursOptions.push(h)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Manual Time Entry</DialogTitle>
      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Stack spacing={3} sx={{ mt: 2 }}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Autocomplete
              options={jobs}
              getOptionLabel={(option) => `${option.jobNumber} - ${option.title}`}
              value={selectedJob}
              onChange={(_, value) => setSelectedJob(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Job"
                  required
                  fullWidth
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Box>
                    <Typography variant="body2">
                      {option.jobNumber} - {option.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.customer}
                    </Typography>
                  </Box>
                </Box>
              )}
            />

            <DatePicker
              label="Date"
              value={date}
              onChange={setDate}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                },
              }}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TimePicker
                label="Start Time"
                value={startTime}
                onChange={(value) => handleTimeChange('start', value)}
                minutesStep={15}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    helperText: '15-minute increments',
                  },
                }}
              />

              <TimePicker
                label="End Time"
                value={endTime}
                onChange={(value) => handleTimeChange('end', value)}
                minutesStep={15}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    helperText: '15-minute increments',
                  },
                }}
              />
            </Box>

            <FormControl fullWidth required>
              <InputLabel>Hours</InputLabel>
              <Select
                value={hours}
                onChange={(e) => handleHoursChange(String(e.target.value))}
                label="Hours"
              >
                <MenuItem value={0}>Select hours</MenuItem>
                {hoursOptions.map((h) => (
                  <MenuItem key={h} value={h}>
                    {h} hours ({h * 60} minutes)
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                Must be in 15-minute (0.25 hour) increments
              </FormHelperText>
            </FormControl>

            <TextField
              label="Description (Optional)"
              multiline
              rows={3}
              fullWidth
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you work on?"
            />

            <Alert severity="info">
              <Typography variant="body2">
                Time entries must be in 15-minute increments. The system will
                automatically round to the nearest quarter hour.
              </Typography>
            </Alert>
          </Stack>
        </LocalizationProvider>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !selectedJob || hours === 0}
        >
          {loading ? 'Creating...' : 'Create Entry'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}