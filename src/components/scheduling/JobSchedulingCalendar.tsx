'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  Paper,
  IconButton,
  Tooltip,
  Alert,
  Autocomplete,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CalendarToday as CalendarIcon,
  Schedule as ScheduleIcon,
  Group as GroupIcon,
} from '@mui/icons-material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addDays,
  subDays,
  parseISO
} from 'date-fns'
import CrewAssignmentDialog from './CrewAssignmentDialog'
import MaterialReservationDialog from '../materials/MaterialReservationDialog'

interface Job {
  id: string
  jobNumber: string
  title: string
  customer: string
  customerName: string
  type: 'SERVICE_CALL' | 'COMMERCIAL_PROJECT'
  status: string
  priority: string
  estimatedHours?: number
  dueDate?: string
  startDate?: string
  endDate?: string
  assignedCrew?: string[]
  address?: string
  description?: string
}

interface ScheduleEntry {
  id: string
  jobId: string
  job: Job
  startDate: string
  endDate?: string
  estimatedHours: number
  assignedCrew: string[]
  notes?: string
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
}

interface User {
  id: string
  name: string
  role: string
  email: string
}

interface JobSchedulingCalendarProps {
  onJobScheduled?: () => void
}

export default function JobSchedulingCalendar({ onJobScheduled }: JobSchedulingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'week'>('month')
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([])
  const [unscheduledJobs, setUnscheduledJobs] = useState<Job[]>([])
  const [crew, setCrew] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [crewDialogOpen, setCrewDialogOpen] = useState(false)
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleEntry | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    jobId: '',
    startDate: '',
    endDate: '',
    estimatedHours: '',
    assignedCrew: [] as string[],
    notes: '',
  })

  useEffect(() => {
    fetchData()
  }, [currentDate])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [scheduleRes, jobsRes, crewRes] = await Promise.all([
        fetch(`/api/schedule?month=${format(currentDate, 'yyyy-MM')}`),
        fetch('/api/jobs?status=estimate,scheduled,dispatched&unscheduled=true'),
        fetch('/api/users?role=field_crew,admin')
      ])

      if (scheduleRes.ok) {
        const scheduleData = await scheduleRes.json()
        setScheduleEntries(scheduleData)
      }

      if (jobsRes.ok) {
        const jobsData = await jobsRes.json()
        setUnscheduledJobs(jobsData)
      }

      if (crewRes.ok) {
        const crewData = await crewRes.json()
        setCrew(crewData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Failed to load scheduling data')
    } finally {
      setLoading(false)
    }
  }

  const handleScheduleJob = async () => {
    try {
      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: formData.jobId,
          startDate: formData.startDate,
          endDate: formData.endDate || null,
          estimatedHours: parseFloat(formData.estimatedHours),
          assignedCrew: formData.assignedCrew,
          notes: formData.notes || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to schedule job')
      }

      setDialogOpen(false)
      setFormData({
        jobId: '',
        startDate: '',
        endDate: '',
        estimatedHours: '',
        assignedCrew: [],
        notes: '',
      })
      fetchData()
      onJobScheduled?.()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to schedule job')
    }
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setFormData({
      ...formData,
      startDate: format(date, 'yyyy-MM-dd'),
    })
    setDialogOpen(true)
  }

  const handleJobSelect = (job: Job | null) => {
    setSelectedJob(job)
    if (job) {
      setFormData({
        ...formData,
        jobId: job.id,
        estimatedHours: job.estimatedHours?.toString() || '',
      })
    }
  }

  const handleCrewAssignment = (entry: ScheduleEntry) => {
    setSelectedSchedule(entry)
    setCrewDialogOpen(true)
  }

  const handleMaterialReservation = (entry: ScheduleEntry) => {
    setSelectedSchedule(entry)
    setMaterialDialogOpen(true)
  }

  const getJobsForDate = (date: Date) => {
    return scheduleEntries.filter(entry => 
      isSameDay(parseISO(entry.startDate), date)
    )
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'error'
      case 'Medium': return 'warning'
      case 'Low': return 'info'
      default: return 'default'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'primary'
      case 'IN_PROGRESS': return 'warning'
      case 'COMPLETED': return 'success'
      case 'CANCELLED': return 'error'
      default: return 'default'
    }
  }

  const renderCalendarDays = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)
    
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

    return days.map((day) => {
      const jobsOnDay = getJobsForDate(day)
      const isCurrentMonth = isSameMonth(day, currentDate)
      const isToday = isSameDay(day, new Date())

      return (
        <Paper
          key={day.toISOString()}
          sx={{
            minHeight: 120,
            p: 1,
            cursor: 'pointer',
            backgroundColor: isCurrentMonth ? 'background.paper' : 'grey.50',
            border: isToday ? '2px solid' : '1px solid',
            borderColor: isToday ? 'primary.main' : 'divider',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
          onClick={() => handleDateClick(day)}
        >
          <Typography
            variant="body2"
            sx={{
              fontWeight: isToday ? 'bold' : 'normal',
              color: isCurrentMonth ? 'text.primary' : 'text.secondary',
              mb: 1,
            }}
          >
            {format(day, 'd')}
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {jobsOnDay.slice(0, 2).map((entry) => (
              <Box key={entry.id} sx={{ position: 'relative' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                  <Chip
                    label={`${entry.job.jobNumber} - ${entry.job.customer}`}
                    size="small"
                    color={getPriorityColor(entry.job.priority) as any}
                    onClick={() => handleCrewAssignment(entry)}
                    sx={{ 
                      fontSize: '0.6rem',
                      height: 18,
                      cursor: 'pointer',
                      '& .MuiChip-label': {
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 120,
                      },
                      '&:hover': {
                        opacity: 0.8
                      }
                    }}
                  />
                  <Chip
                    label="Materials"
                    size="small"
                    variant="outlined"
                    onClick={() => handleMaterialReservation(entry)}
                    sx={{ 
                      fontSize: '0.5rem',
                      height: 16,
                      cursor: 'pointer',
                      '& .MuiChip-label': {
                        padding: '0 4px',
                      },
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                  />
                </Box>
                {/* Show crew count if assigned */}
                {entry.crew && entry.crew.length > 0 && (
                  <Box 
                    sx={{ 
                      position: 'absolute', 
                      top: -4, 
                      right: -4, 
                      backgroundColor: 'primary.main',
                      color: 'white',
                      borderRadius: '50%',
                      width: 16,
                      height: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.5rem',
                      fontWeight: 'bold'
                    }}
                  >
                    {entry.crew.length}
                  </Box>
                )}
              </Box>
            ))}
            {jobsOnDay.length > 2 && (
              <Typography variant="caption" color="text.secondary">
                +{jobsOnDay.length - 2} more
              </Typography>
            )}
          </Box>
        </Paper>
      )
    })
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <Typography>Loading schedule...</Typography>
      </Box>
    )
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Calendar Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">
            Job Scheduling Calendar
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant={view === 'month' ? 'contained' : 'outlined'}
              onClick={() => setView('month')}
              size="small"
            >
              Month
            </Button>
            <Button
              variant={view === 'week' ? 'contained' : 'outlined'}
              onClick={() => setView('week')}
              size="small"
            >
              Week
            </Button>
          </Box>
        </Box>

        {/* Date Navigation */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button onClick={() => setCurrentDate(subDays(currentDate, view === 'month' ? 30 : 7))}>
              Previous
            </Button>
            <Typography variant="h6">
              {format(currentDate, 'MMMM yyyy')}
            </Typography>
            <Button onClick={() => setCurrentDate(addDays(currentDate, view === 'month' ? 30 : 7))}>
              Next
            </Button>
          </Box>
          <Button onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
        </Box>

        {/* Unscheduled Jobs Panel */}
        {unscheduledJobs.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📋 Unscheduled Jobs ({unscheduledJobs.length})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {unscheduledJobs.slice(0, 10).map((job) => (
                  <Chip
                    key={job.id}
                    label={`${job.jobNumber} - ${job.customer}`}
                    color={getPriorityColor(job.priority) as any}
                    variant="outlined"
                    onClick={() => {
                      handleJobSelect(job)
                      setDialogOpen(true)
                    }}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
                {unscheduledJobs.length > 10 && (
                  <Typography variant="caption" color="text.secondary">
                    +{unscheduledJobs.length - 10} more
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Calendar Grid */}
        <Paper sx={{ p: 2 }}>
          {/* Day Headers */}
          <Grid container sx={{ mb: 1 }}>
            {weekDays.map((day) => (
              <Grid key={day} size={{ xs: true }} sx={{ textAlign: 'center' }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {day}
                </Typography>
              </Grid>
            ))}
          </Grid>

          {/* Calendar Days */}
          <Grid container spacing={1}>
            {renderCalendarDays().map((dayComponent, index) => (
              <Grid key={index} size={{ xs: true }}>
                {dayComponent}
              </Grid>
            ))}
          </Grid>
        </Paper>

        {/* Schedule Job Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            Schedule Job
            {selectedDate && ` - ${format(selectedDate, 'MMMM d, yyyy')}`}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Autocomplete
                options={unscheduledJobs}
                getOptionLabel={(option) => `${option.jobNumber} - ${option.title} (${option.customer})`}
                value={selectedJob}
                onChange={(_, value) => handleJobSelect(value)}
                renderInput={(params) => (
                  <TextField {...params} label="Select Job" required />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    <Box>
                      <Typography variant="body2">
                        {option.jobNumber} - {option.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Customer: {option.customer} | Priority: {option.priority}
                        {option.estimatedHours && ` | Est. Hours: ${option.estimatedHours}`}
                      </Typography>
                    </Box>
                  </li>
                )}
              />

              <DatePicker
                label="Start Date"
                value={formData.startDate ? new Date(formData.startDate) : null}
                onChange={(date) => setFormData({ 
                  ...formData, 
                  startDate: date ? format(date, 'yyyy-MM-dd') : '' 
                })}
                slotProps={{ textField: { required: true } }}
              />

              <DatePicker
                label="End Date (Optional)"
                value={formData.endDate ? new Date(formData.endDate) : null}
                onChange={(date) => setFormData({ 
                  ...formData, 
                  endDate: date ? format(date, 'yyyy-MM-dd') : '' 
                })}
              />

              <TextField
                label="Estimated Hours"
                type="number"
                value={formData.estimatedHours}
                onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                required
                inputProps={{ min: 0, step: 0.5 }}
              />

              <Autocomplete
                multiple
                options={crew}
                getOptionLabel={(option) => option.name}
                value={crew.filter(member => formData.assignedCrew.includes(member.id))}
                onChange={(_, value) => setFormData({ 
                  ...formData, 
                  assignedCrew: value.map(member => member.id) 
                })}
                renderInput={(params) => (
                  <TextField {...params} label="Assign Crew" />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    <Box>
                      <Typography variant="body2">{option.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.role} - {option.email}
                      </Typography>
                    </Box>
                  </li>
                )}
              />

              <TextField
                label="Notes"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional scheduling notes..."
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleScheduleJob} 
              variant="contained"
              disabled={!formData.jobId || !formData.startDate || !formData.estimatedHours}
            >
              Schedule Job
            </Button>
          </DialogActions>
        </Dialog>

        {/* Crew Assignment Dialog */}
        <CrewAssignmentDialog
          open={crewDialogOpen}
          onClose={() => setCrewDialogOpen(false)}
          schedule={selectedSchedule}
          onAssignmentUpdate={() => {
            fetchData()
            setCrewDialogOpen(false)
          }}
        />

        {/* Material Reservation Dialog */}
        <MaterialReservationDialog
          open={materialDialogOpen}
          onClose={() => setMaterialDialogOpen(false)}
          preselectedJob={selectedSchedule?.job || null}
          onReservationCreated={() => {
            fetchData()
            setMaterialDialogOpen(false)
          }}
        />
      </Box>
    </LocalizationProvider>
  )
}