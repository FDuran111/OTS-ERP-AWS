'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  Box,
  Typography,
  Button,
  TextField,
  Autocomplete,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Stack,
  Avatar,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListSubheader
} from '@mui/material'

// Temporary Grid component for compatibility
const Grid = ({ children, container, spacing, xs, md, item, alignItems, justifyContent, ...props }: any) => (
  <Box 
    sx={{ 
      display: container ? 'flex' : 'block',
      flexWrap: container ? 'wrap' : undefined,
      gap: container && spacing ? spacing : undefined,
      flex: xs ? `1 1 calc(${(xs/12)*100}% - ${spacing || 0}px)` : undefined,
      width: xs === 12 ? '100%' : undefined,
      alignItems,
      justifyContent,
      ...props.sx
    }}
    {...props}
  >
    {children}
  </Box>
)

import {
  PlayArrow as ClockInIcon,
  Stop as ClockOutIcon,
  LocationOn as LocationIcon,
  Work as JobIcon,
  Schedule as TimeIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  Refresh as RefreshIcon,
  MyLocation as GPSIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Pause as BreakIcon,
  Coffee as CoffeeIcon,
  Restaurant as LunchIcon,
  BusinessCenter as MeetingIcon
} from '@mui/icons-material'
import { useOfflineSync } from '@/hooks/useOfflineSync'

interface TimeEntry {
  id: string
  userId: string
  jobId?: string
  clockInTime: string
  clockOutTime?: string
  totalHours?: number
  regularHours?: number
  overtimeHours?: number
  totalPay?: number
  workDescription?: string
  appliedRegularRate?: number
  jobNumber?: string
  jobDescription?: string
  status: string
}

interface Job {
  id: string
  jobNumber: string
  description: string
  city: string
  state: string
  status: string
}

interface ActiveBreak {
  id: string
  breakType: 'LUNCH' | 'SHORT_BREAK' | 'PERSONAL' | 'MEETING' | 'TRAVEL' | 'OTHER'
  startTime: string
  currentDurationMinutes: number
  isPaid: boolean
  isDeducted: boolean
  notes?: string
}

interface BreakSummary {
  totalBreaks: number
  totalBreakMinutes: number
  deductedMinutes: number
}

interface MobileTimeClockProps {
  userId: string
  userName?: string
}

export default function MobileTimeClock({ userId, userName }: MobileTimeClockProps) {
  const [timeStatus, setTimeStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [clockLoading, setClockLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  
  // Form state
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [workDescription, setWorkDescription] = useState('')
  const [jobs, setJobs] = useState<Job[]>([])
  
  // Clock out dialog
  const [clockOutDialogOpen, setClockOutDialogOpen] = useState(false)
  
  // Break management
  const [activeBreak, setActiveBreak] = useState<ActiveBreak | null>(null)
  const [breakSummary, setBreakSummary] = useState<BreakSummary | null>(null)
  const [breakDialogOpen, setBreakDialogOpen] = useState(false)
  const [selectedBreakType, setSelectedBreakType] = useState<string>('SHORT_BREAK')
  const [breakLoading, setBreakLoading] = useState(false)
  const [breakElapsedTime, setBreakElapsedTime] = useState<string>('0:00')
  
  // Real-time elapsed time
  const [elapsedTime, setElapsedTime] = useState<string>('0:00')
  
  const { isOnline, queueRequest } = useOfflineSync()

  // Break type helpers
  const getBreakTypeIcon = (breakType: string) => {
    switch (breakType) {
      case 'LUNCH': return <LunchIcon />
      case 'SHORT_BREAK': return <CoffeeIcon />
      case 'MEETING': return <MeetingIcon />
      case 'PERSONAL': return <PersonIcon />
      default: return <BreakIcon />
    }
  }

  const getBreakTypeLabel = (breakType: string) => {
    switch (breakType) {
      case 'LUNCH': return 'Lunch Break'
      case 'SHORT_BREAK': return 'Short Break'
      case 'MEETING': return 'Meeting'
      case 'PERSONAL': return 'Personal'
      case 'TRAVEL': return 'Travel'
      case 'OTHER': return 'Other'
      default: return 'Break'
    }
  }

  const getBreakTypeColor = (breakType: string) => {
    switch (breakType) {
      case 'LUNCH': return 'warning'
      case 'SHORT_BREAK': return 'info'
      case 'MEETING': return 'primary'
      case 'PERSONAL': return 'secondary'
      default: return 'default'
    }
  }

  // Real-time elapsed time update
  useEffect(() => {
    if (!timeStatus?.activeEntry) return

    const updateElapsedTime = () => {
      const now = new Date()
      const clockInTime = new Date(timeStatus.activeEntry.clockInTime)
      const elapsedMinutes = Math.floor((now.getTime() - clockInTime.getTime()) / 60000)
      const hours = Math.floor(elapsedMinutes / 60)
      const minutes = elapsedMinutes % 60
      setElapsedTime(`${hours}:${minutes.toString().padStart(2, '0')}`)
    }

    updateElapsedTime()
    const interval = setInterval(updateElapsedTime, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [timeStatus?.activeEntry])

  // Real-time break elapsed time update
  useEffect(() => {
    if (!activeBreak) return

    const updateBreakElapsedTime = () => {
      const now = new Date()
      const breakStartTime = new Date(activeBreak.startTime)
      const elapsedMinutes = Math.floor((now.getTime() - breakStartTime.getTime()) / 60000)
      const hours = Math.floor(elapsedMinutes / 60)
      const minutes = elapsedMinutes % 60
      setBreakElapsedTime(`${hours}:${minutes.toString().padStart(2, '0')}`)
    }

    updateBreakElapsedTime()
    const interval = setInterval(updateBreakElapsedTime, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [activeBreak])

  // Get user's location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        })
        setLocationError(null)
      },
      (error) => {
        console.error('Location error:', error)
        setLocationError('Unable to get your location')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    )
  }, [])

  // Load time status and jobs
  const loadTimeStatus = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/time-tracking/status?userId=${userId}`)
      const data = await response.json()
      
      if (data.success) {
        setTimeStatus(data.data)
        setActiveBreak(data.data.activeBreak)
        setBreakSummary(data.data.breakSummary)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to load time tracking status')
    } finally {
      setLoading(false)
    }
  }, [userId])

  const loadJobs = useCallback(async () => {
    try {
      const response = await fetch('/api/jobs?status=ACTIVE,SCHEDULED,IN_PROGRESS')
      const data = await response.json()
      
      if (data.success) {
        setJobs(data.data)
      }
    } catch (err) {
      console.error('Failed to load jobs:', err)
    }
  }, [])

  useEffect(() => {
    loadTimeStatus()
    loadJobs()
    getCurrentLocation()
  }, [loadTimeStatus, loadJobs, getCurrentLocation])

  // Clock in function
  const handleClockIn = async () => {
    if (clockLoading) return

    setClockLoading(true)
    setError(null)

    try {
      const clockInData = {
        userId,
        jobId: selectedJob?.id,
        latitude: location?.latitude,
        longitude: location?.longitude,
        workSiteAddress: selectedJob ? `${selectedJob.city}, ${selectedJob.state}` : undefined
      }

      if (isOnline) {
        const response = await fetch('/api/time-tracking/clock-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clockInData)
        })

        const data = await response.json()

        if (data.success) {
          loadTimeStatus() // Refresh status
          setSelectedJob(null)
        } else {
          setError(data.error)
        }
      } else {
        // Queue for offline sync
        queueRequest({
          method: 'POST',
          url: '/api/time-tracking/clock-in',
          data: clockInData,
          maxRetries: 3
        })
        
        // Optimistically update UI (you'd want to store this locally)
        setError('Queued for sync when online')
      }
    } catch (err) {
      setError('Failed to clock in')
    } finally {
      setClockLoading(false)
    }
  }

  // Start break function
  const handleStartBreak = async () => {
    if (breakLoading) return

    setBreakLoading(true)
    setError(null)

    try {
      const breakData = {
        userId,
        breakType: selectedBreakType,
        latitude: location?.latitude,
        longitude: location?.longitude
      }

      if (isOnline) {
        const response = await fetch('/api/time-tracking/breaks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(breakData)
        })

        const data = await response.json()

        if (data.success) {
          loadTimeStatus() // Refresh status
          setBreakDialogOpen(false)
        } else {
          setError(data.error)
        }
      } else {
        queueRequest({
          method: 'POST',
          url: '/api/time-tracking/breaks',
          data: breakData,
          maxRetries: 3
        })
        
        setError('Break start queued for sync when online')
        setBreakDialogOpen(false)
      }
    } catch (err) {
      setError('Failed to start break')
    } finally {
      setBreakLoading(false)
    }
  }

  // End break function
  const handleEndBreak = async () => {
    if (!activeBreak || breakLoading) return

    setBreakLoading(true)
    setError(null)

    try {
      const endBreakData = {
        latitude: location?.latitude,
        longitude: location?.longitude
      }

      if (isOnline) {
        const response = await fetch(`/api/time-tracking/breaks/${activeBreak.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(endBreakData)
        })

        const data = await response.json()

        if (data.success) {
          loadTimeStatus() // Refresh status
        } else {
          setError(data.error)
        }
      } else {
        queueRequest({
          method: 'PUT',
          url: `/api/time-tracking/breaks/${activeBreak.id}`,
          data: endBreakData,
          maxRetries: 3
        })
        
        setError('Break end queued for sync when online')
      }
    } catch (err) {
      setError('Failed to end break')
    } finally {
      setBreakLoading(false)
    }
  }

  // Clock out function
  const handleClockOut = async () => {
    if (!timeStatus?.activeEntry || clockLoading) return

    setClockLoading(true)
    setError(null)

    try {
      const clockOutData = {
        userId,
        latitude: location?.latitude,
        longitude: location?.longitude,
        workDescription,
        notes: ''
      }

      if (isOnline) {
        const response = await fetch('/api/time-tracking/clock-out', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clockOutData)
        })

        const data = await response.json()

        if (data.success) {
          loadTimeStatus() // Refresh status
          setWorkDescription('')
          setClockOutDialogOpen(false)
        } else {
          setError(data.error)
        }
      } else {
        queueRequest({
          method: 'POST',
          url: '/api/time-tracking/clock-out',
          data: clockOutData,
          maxRetries: 3
        })
        
        setError('Queued for sync when online')
        setClockOutDialogOpen(false)
      }
    } catch (err) {
      setError('Failed to clock out')
    } finally {
      setClockLoading(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  const activeEntry = timeStatus?.activeEntry
  const todaySummary = timeStatus?.todaySummary

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 3, mb: 3, bgcolor: 'primary.main', color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.dark' }}>
            <PersonIcon />
          </Avatar>
          <Box>
            <Typography variant="h6">
              {userName || 'Employee'}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton 
            color="inherit" 
            onClick={loadTimeStatus}
            disabled={loading}
          >
            <RefreshIcon />
          </IconButton>
        </Box>

        {/* Online/Offline Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: isOnline ? 'success.main' : 'warning.main'
            }}
          />
          <Typography variant="caption">
            {isOnline ? 'Online' : 'Offline - Data will sync when connected'}
          </Typography>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Active Time Entry */}
      {activeEntry ? (
        <Card sx={{ mb: 3, border: 2, borderColor: 'success.main' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CheckIcon color="success" />
              <Typography variant="h6" color="success.main">
                Currently Clocked In
              </Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Clock In Time
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {new Date(activeEntry.clockInTime).toLocaleTimeString()}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Elapsed Time
                </Typography>
                <Typography variant="h5" color="primary" fontWeight="bold">
                  {elapsedTime}
                </Typography>
              </Grid>
              
              {activeEntry.jobNumber && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Job Assignment
                  </Typography>
                  <Chip
                    icon={<JobIcon />}
                    label={`${activeEntry.jobNumber} - ${activeEntry.jobDescription}`}
                    color="primary"
                    variant="outlined"
                  />
                </Grid>
              )}

              {location && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Location
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>

            <Button
              variant="contained"
              color="error"
              fullWidth
              size="large"
              startIcon={<ClockOutIcon />}
              onClick={() => setClockOutDialogOpen(true)}
              disabled={clockLoading}
              sx={{ mt: 3, py: 2 }}
            >
              {clockLoading ? 'Clocking Out...' : 'Clock Out'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Clock In
            </Typography>

            {/* Job Selection */}
            <Autocomplete
              value={selectedJob}
              onChange={(_, job) => setSelectedJob(job)}
              options={jobs}
              getOptionLabel={(job) => `${job.jobNumber} - ${job.description}`}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Job (Optional)"
                  fullWidth
                  margin="normal"
                />
              )}
              renderOption={(props, job) => (
                <li {...props}>
                  <Box>
                    <Typography variant="body1">
                      {job.jobNumber}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {job.description} • {job.city}, {job.state}
                    </Typography>
                  </Box>
                </li>
              )}
            />

            {/* Location Status */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, mb: 2 }}>
              <IconButton size="small" onClick={getCurrentLocation}>
                <GPSIcon />
              </IconButton>
              <Typography variant="body2" color={location ? 'success.main' : 'warning.main'}>
                {location 
                  ? 'GPS location acquired' 
                  : locationError || 'Getting GPS location...'
                }
              </Typography>
            </Box>

            <Button
              variant="contained"
              color="success"
              fullWidth
              size="large"
              startIcon={<ClockInIcon />}
              onClick={handleClockIn}
              disabled={clockLoading}
              sx={{ py: 2 }}
            >
              {clockLoading ? 'Clocking In...' : 'Clock In'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Break Management */}
      {timeStatus?.activeEntry && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Break Management
            </Typography>

            {activeBreak ? (
              /* On Break */
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  {getBreakTypeIcon(activeBreak.breakType)}
                  <Typography variant="body1" fontWeight="bold">
                    On {getBreakTypeLabel(activeBreak.breakType)}
                  </Typography>
                  <Chip 
                    label={activeBreak.isDeducted ? 'Unpaid' : 'Paid'}
                    size="small"
                    color={activeBreak.isDeducted ? 'warning' : 'success'}
                    variant="outlined"
                  />
                </Box>

                <Box sx={{ textAlign: 'center', mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Break Time
                  </Typography>
                  <Typography variant="h4" color="warning.main" fontWeight="bold">
                    {breakElapsedTime}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Started at {new Date(activeBreak.startTime).toLocaleTimeString()}
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="large"
                  startIcon={<CheckIcon />}
                  onClick={handleEndBreak}
                  disabled={breakLoading}
                  sx={{ py: 2 }}
                >
                  {breakLoading ? 'Ending Break...' : 'End Break'}
                </Button>
              </Box>
            ) : (
              /* Not on Break */
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Take a break when needed. Break times will be tracked automatically.
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<CoffeeIcon />}
                      onClick={() => {
                        setSelectedBreakType('SHORT_BREAK')
                        setBreakDialogOpen(true)
                      }}
                      sx={{ py: 1.5 }}
                    >
                      Short Break
                    </Button>
                  </Grid>
                  <Grid item xs={6}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<LunchIcon />}
                      onClick={() => {
                        setSelectedBreakType('LUNCH')
                        setBreakDialogOpen(true)
                      }}
                      sx={{ py: 1.5 }}
                    >
                      Lunch
                    </Button>
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<BreakIcon />}
                      onClick={() => setBreakDialogOpen(true)}
                      sx={{ py: 1.5 }}
                    >
                      Other Break
                    </Button>
                  </Grid>
                </Grid>

                {breakSummary && breakSummary.totalBreaks > 0 && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'info.50', borderRadius: 1, border: 1, borderColor: 'info.200' }}>
                    <Typography variant="caption" color="text.secondary">
                      Today's Breaks
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                      <Typography variant="body2">
                        {breakSummary.totalBreaks} breaks
                      </Typography>
                      <Typography variant="body2">
                        {Math.round(breakSummary.totalBreakMinutes)} min total
                      </Typography>
                      <Typography variant="body2" color="warning.main">
                        {Math.round(breakSummary.deductedMinutes)} min deducted
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Today's Summary */}
      {todaySummary && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Today's Summary
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {todaySummary.totalHours.toFixed(1)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Hours
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    ${todaySummary.totalPay.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Pay
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Regular Hours
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {todaySummary.regularHours.toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Overtime Hours
                </Typography>
                <Typography variant="body1" fontWeight="bold" color="warning.main">
                  {todaySummary.overtimeHours.toFixed(2)}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Recent Entries */}
      {timeStatus?.recentEntries && timeStatus.recentEntries.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Entries
            </Typography>

            <Stack spacing={2}>
              {timeStatus.recentEntries.slice(0, 5).map((entry: TimeEntry) => (
                <Box key={entry.id}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {new Date(entry.clockInTime).toLocaleDateString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(entry.clockInTime).toLocaleTimeString()} - {' '}
                        {entry.clockOutTime ? new Date(entry.clockOutTime).toLocaleTimeString() : 'In Progress'}
                      </Typography>
                      {entry.jobNumber && (
                        <Typography variant="caption" color="primary">
                          {entry.jobNumber}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" fontWeight="bold">
                        {entry.totalHours?.toFixed(2) || '0.00'} hrs
                      </Typography>
                      <Typography variant="body2" color="success.main">
                        ${entry.totalPay?.toFixed(2) || '0.00'}
                      </Typography>
                    </Box>
                  </Box>
                  <Divider sx={{ mt: 1 }} />
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Clock Out Dialog */}
      <Dialog 
        open={clockOutDialogOpen} 
        onClose={() => setClockOutDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Clock Out</DialogTitle>
        <DialogContent>
          <TextField
            label="Work Description (Optional)"
            fullWidth
            multiline
            rows={3}
            value={workDescription}
            onChange={(e) => setWorkDescription(e.target.value)}
            placeholder="Describe the work completed during this time entry..."
            margin="normal"
          />

          {activeEntry && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Time Summary
              </Typography>
              <Typography variant="body1">
                Elapsed: {elapsedTime}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Clock In: {new Date(activeEntry.clockInTime).toLocaleTimeString()}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClockOutDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleClockOut}
            disabled={clockLoading}
          >
            {clockLoading ? 'Clocking Out...' : 'Clock Out'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Break Selection Dialog */}
      <Dialog 
        open={breakDialogOpen} 
        onClose={() => setBreakDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Start Break</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Break Type</InputLabel>
            <Select
              value={selectedBreakType}
              onChange={(e) => setSelectedBreakType(e.target.value)}
              label="Break Type"
            >
              <ListSubheader>Common Breaks</ListSubheader>
              <MenuItem value="SHORT_BREAK">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CoffeeIcon fontSize="small" />
                  Short Break (Paid)
                </Box>
              </MenuItem>
              <MenuItem value="LUNCH">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LunchIcon fontSize="small" />
                  Lunch Break (Unpaid)
                </Box>
              </MenuItem>
              
              <ListSubheader>Other Breaks</ListSubheader>
              <MenuItem value="PERSONAL">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon fontSize="small" />
                  Personal (Unpaid)
                </Box>
              </MenuItem>
              <MenuItem value="MEETING">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MeetingIcon fontSize="small" />
                  Meeting (Paid)
                </Box>
              </MenuItem>
              <MenuItem value="TRAVEL">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BreakIcon fontSize="small" />
                  Travel (Paid)
                </Box>
              </MenuItem>
              <MenuItem value="OTHER">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BreakIcon fontSize="small" />
                  Other (Unpaid)
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
          
          <Alert severity="info" sx={{ mt: 2 }}>
            {selectedBreakType === 'SHORT_BREAK' && 'Short breaks are typically paid and should be 15 minutes or less.'}
            {selectedBreakType === 'LUNCH' && 'Lunch breaks are unpaid and will be deducted from your total hours.'}
            {selectedBreakType === 'PERSONAL' && 'Personal breaks are unpaid and will be deducted from your total hours.'}
            {selectedBreakType === 'MEETING' && 'Meeting time is paid and counts toward your work hours.'}
            {selectedBreakType === 'TRAVEL' && 'Travel time is paid and counts toward your work hours.'}
            {selectedBreakType === 'OTHER' && 'Other breaks are unpaid and will be deducted from your total hours.'}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBreakDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleStartBreak}
            disabled={breakLoading}
            startIcon={getBreakTypeIcon(selectedBreakType)}
          >
            {breakLoading ? 'Starting...' : `Start ${getBreakTypeLabel(selectedBreakType)}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}