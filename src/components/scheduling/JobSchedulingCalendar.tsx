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
  Paper,
  IconButton,
  Tooltip,
  Alert,
  Autocomplete,
  CircularProgress,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CalendarToday as CalendarIcon,
  Schedule as ScheduleIcon,
  Group as GroupIcon,
} from '@mui/icons-material'

// Temporary Grid component for compatibility
const Grid = ({ children, container, spacing, xs, md, size, alignItems, justifyContent, ...props }: any) => (
  <Box 
    sx={{ 
      display: container ? 'flex' : 'block',
      flexWrap: container ? 'wrap' : undefined,
      gap: container && spacing ? spacing : undefined,
      flex: xs === true ? '1 1 auto' : xs ? `1 1 calc(${(xs/12)*100}% - ${spacing || 0}px)` : undefined,
      width: xs === 12 || xs === true ? '100%' : undefined,
      alignItems,
      justifyContent,
      textAlign: props.sx?.textAlign,
      ...props.sx
    }}
    {...props}
  >
    {children}
  </Box>
)

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
import { CalendarGrid } from './CalendarGrid'
import { UnscheduledJobsSection } from './UnscheduledJobsSection'

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

  const getCalendarDays = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }


  if (loading) {
    return (
      <Paper elevation={2} sx={{ p: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={24} />
          <Typography variant="h6" color="text.secondary">
            Loading schedule data...
          </Typography>
        </Box>
      </Paper>
    )
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ pt: 2 }}>
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 4, borderRadius: 2 }} 
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Calendar Header */}
        <Paper 
          elevation={1} 
          sx={{ 
            p: 3, 
            mb: 4, 
            borderRadius: 2,
            bgcolor: 'primary.50'
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between', 
            alignItems: { xs: 'flex-start', sm: 'center' }, 
            gap: { xs: 2, sm: 0 },
            mb: 3 
          }}>
            <Typography variant="h4" sx={{ 
              fontWeight: 700, 
              color: 'primary.main',
              fontSize: { xs: '1.5rem', sm: '2rem' }
            }}>
              Job Scheduling Calendar
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              gap: 1,
              width: { xs: '100%', sm: 'auto' },
              justifyContent: { xs: 'flex-start', sm: 'flex-end' }
            }}>
              <Button
                variant={view === 'month' ? 'contained' : 'outlined'}
                onClick={() => setView('month')}
                size="medium"
                sx={{ 
                  fontWeight: 600,
                  flex: { xs: 1, sm: 'none' },
                  minWidth: { xs: 'auto', sm: '80px' }
                }}
              >
                Month
              </Button>
              <Button
                variant={view === 'week' ? 'contained' : 'outlined'}
                onClick={() => setView('week')}
                size="medium"
                sx={{ 
                  fontWeight: 600,
                  flex: { xs: 1, sm: 'none' },
                  minWidth: { xs: 'auto', sm: '80px' }
                }}
              >
                Week
              </Button>
            </Box>
          </Box>

          {/* Date Navigation */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between', 
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: { xs: 2, sm: 0 }
          }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: { xs: 1, sm: 3 },
              justifyContent: { xs: 'space-between', sm: 'flex-start' }
            }}>
              <Button 
                variant="outlined"
                onClick={() => setCurrentDate(subDays(currentDate, view === 'month' ? 30 : 7))}
                sx={{ 
                  fontWeight: 500,
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  px: { xs: 1, sm: 2 }
                }}
              >
                ← Previous
              </Button>
              <Typography variant="h5" sx={{ 
                fontWeight: 600, 
                textAlign: 'center',
                fontSize: { xs: '1.1rem', sm: '1.5rem' },
                minWidth: { xs: 'auto', sm: 200 },
                flex: { xs: 1, sm: 'none' }
              }}>
                {format(currentDate, 'MMMM yyyy')}
              </Typography>
              <Button 
                variant="outlined"
                onClick={() => setCurrentDate(addDays(currentDate, view === 'month' ? 30 : 7))}
                sx={{ 
                  fontWeight: 500,
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  px: { xs: 1, sm: 2 }
                }}
              >
                Next →
              </Button>
            </Box>
            <Button 
              variant="contained" 
              onClick={() => setCurrentDate(new Date())}
              sx={{ 
                fontWeight: 600,
                alignSelf: { xs: 'center', sm: 'auto' },
                width: { xs: 'auto', sm: 'auto' }
              }}
            >
              Today
            </Button>
          </Box>
        </Paper>

        {/* Unscheduled Jobs Section */}
        <UnscheduledJobsSection
          jobs={unscheduledJobs}
          onJobSelect={handleJobSelect}
          onDialogOpen={() => setDialogOpen(true)}
        />

        {/* Calendar Grid */}
        <CalendarGrid
          days={getCalendarDays()}
          currentDate={currentDate}
          getJobsForDate={getJobsForDate}
          onDateClick={handleDateClick}
          onCrewAssignment={handleCrewAssignment}
          onMaterialReservation={handleMaterialReservation}
        />

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