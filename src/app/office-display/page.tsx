'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Chip,
  Grid,
  CircularProgress,
  Alert,
  Paper,
  Stack,
  Divider,
} from '@mui/material'
import {
  Notifications as NotificationsIcon,
  Event as EventIcon,
  Warning as WarningIcon,
  TaskAlt as TaskIcon,
  AccessTime as TimeIcon,
  Work as WorkIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material'

interface UpcomingReminder {
  id: string
  jobId: string
  jobNumber: string
  title: string
  customer: string
  scheduledDate: string
  daysUntil: number
  priority: 'high' | 'medium' | 'low'
  type: 'start_reminder' | 'deadline_warning' | 'overdue'
}

interface ScheduleJob {
  id: string
  time: string
  jobNumber: string
  title: string
  customer: string
  address: string
  status: string
  priority?: string
  estimatedHours?: number
  crew: string
}

interface DashboardStats {
  totalActiveJobs: number
  jobsThisWeek: number
  urgentReminders: number
  crewUtilization: number
}

export default function OfficeDisplayPage() {
  const [reminders, setReminders] = useState<UpcomingReminder[]>([])
  const [todayJobs, setTodayJobs] = useState<ScheduleJob[]>([])
  const [tomorrowJobs, setTomorrowJobs] = useState<ScheduleJob[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalActiveJobs: 0,
    jobsThisWeek: 0,
    urgentReminders: 0,
    crewUtilization: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    // Update time every minute
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    // Fetch data initially and then every 5 minutes
    fetchDisplayData()
    const dataInterval = setInterval(fetchDisplayData, 5 * 60 * 1000)

    return () => {
      clearInterval(timeInterval)
      clearInterval(dataInterval)
    }
  }, [])

  const fetchDisplayData = async () => {
    try {
      setLoading(true)
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const [remindersResponse, scheduleResponse] = await Promise.all([
        fetch('/api/schedule/reminders'),
        fetch(`/api/schedule?viewType=week&date=${today.toISOString()}`)
      ])

      let remindersData: any = { reminders: [] }
      if (remindersResponse.ok) {
        remindersData = await remindersResponse.json()
        setReminders(remindersData.reminders || [])
      }

      if (scheduleResponse.ok) {
        const scheduleData = await scheduleResponse.json()
        
        // Filter jobs for today and tomorrow
        const todayStr = today.toISOString().split('T')[0]
        const tomorrowStr = tomorrow.toISOString().split('T')[0]
        
        const todaySchedule = scheduleData.dateRange.find((day: any) => day.date === todayStr)
        const tomorrowSchedule = scheduleData.dateRange.find((day: any) => day.date === tomorrowStr)
        
        setTodayJobs(todaySchedule?.jobs || [])
        setTomorrowJobs(tomorrowSchedule?.jobs || [])

        // Calculate stats
        const allJobs = scheduleData.dateRange.flatMap((day: any) => day.jobs)
        setStats({
          totalActiveJobs: allJobs.length,
          jobsThisWeek: allJobs.length,
          urgentReminders: remindersData.reminders?.filter((r: any) => r.priority === 'high').length || 0,
          crewUtilization: 75 // Mock data
        })
      }

      setError(null)
    } catch (error) {
      console.error('Error fetching display data:', error)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const getReminderPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error'
      case 'medium': return 'warning'
      case 'low': return 'info'
      default: return 'default'
    }
  }

  const getReminderIcon = (type: string) => {
    switch (type) {
      case 'start_reminder': return <EventIcon />
      case 'deadline_warning': return <WarningIcon />
      case 'overdue': return <TaskIcon />
      default: return <NotificationsIcon />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'info'
      case 'DISPATCHED': return 'warning'
      case 'IN_PROGRESS': return 'primary'
      default: return 'default'
    }
  }

  const formatTime = (time: Date) => {
    return time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: 'background.default'
      }}>
        <CircularProgress size={60} />
      </Box>
    )
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      backgroundColor: 'background.default',
      p: 3
    }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h3" fontWeight="bold" sx={{ color: 'primary.main' }}>
              Ortmeier Technical Services
            </Typography>
            <Typography variant="h5" color="text.secondary">
              Office Dashboard
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h4" fontWeight="bold">
              {formatTime(currentTime)}
            </Typography>
            <Typography variant="h6" color="text.secondary">
              {formatDate(currentTime)}
            </Typography>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Stats Overview */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <WorkIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {stats.totalActiveJobs}
                    </Typography>
                    <Typography color="text.secondary">
                      Active Jobs
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <TimeIcon sx={{ fontSize: 40, color: 'info.main' }} />
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {stats.jobsThisWeek}
                    </Typography>
                    <Typography color="text.secondary">
                      This Week
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <NotificationsIcon sx={{ fontSize: 40, color: 'warning.main' }} />
                  <Box>
                    <Typography variant="h4" fontWeight="bold" color="warning.main">
                      {stats.urgentReminders}
                    </Typography>
                    <Typography color="text.secondary">
                      Urgent Alerts
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <TrendingIcon sx={{ fontSize: 40, color: 'success.main' }} />
                  <Box>
                    <Typography variant="h4" fontWeight="bold" color="success.main">
                      {stats.crewUtilization}%
                    </Typography>
                    <Typography color="text.secondary">
                      Crew Utilization
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Urgent Reminders */}
          {reminders.length > 0 && (
            <Grid size={12}>
              <Card sx={{ border: '2px solid', borderColor: 'warning.main', mb: 3 }}>
                <CardContent>
                  <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <NotificationsIcon sx={{ color: 'warning.main' }} />
                    Upcoming Job Alerts
                  </Typography>
                  <Grid container spacing={2}>
                    {reminders.map((reminder) => (
                      <Grid size={{ xs: 12, md: 6, lg: 4 }} key={reminder.id}>
                        <Paper sx={{ p: 2, backgroundColor: 'background.default' }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                            <Box sx={{ color: getReminderPriorityColor(reminder.priority) }}>
                              {getReminderIcon(reminder.type)}
                            </Box>
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="h6" fontWeight="medium">
                                {reminder.jobNumber}
                              </Typography>
                              <Typography variant="body1">
                                {reminder.title}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {reminder.customer}
                              </Typography>
                              <Typography variant="body2" sx={{ mt: 1 }}>
                                Starts: {new Date(reminder.scheduledDate).toLocaleDateString()}
                              </Typography>
                              <Chip
                                label={`${reminder.daysUntil} days`}
                                size="small"
                                color={getReminderPriorityColor(reminder.priority) as any}
                                sx={{ mt: 1 }}
                              />
                            </Box>
                          </Box>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Today's Jobs */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Today's Schedule
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {todayJobs.length === 0 ? (
                  <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                    No jobs scheduled for today
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    {todayJobs.map((job) => (
                      <Paper key={job.id} sx={{ p: 2, backgroundColor: 'background.default' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="h6" fontWeight="medium">
                            {job.time} - {job.jobNumber}
                          </Typography>
                          <Chip
                            label={job.status}
                            size="small"
                            color={getStatusColor(job.status) as any}
                          />
                        </Box>
                        <Typography variant="body1">
                          {job.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {job.customer}
                        </Typography>
                        {job.address && (
                          <Typography variant="caption" color="text.secondary">
                            {job.address}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                          <Chip label={job.crew} size="small" color="primary" />
                          {job.estimatedHours && (
                            <Chip label={`${job.estimatedHours}h`} size="small" variant="outlined" />
                          )}
                        </Box>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Tomorrow's Jobs */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Tomorrow's Schedule
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {tomorrowJobs.length === 0 ? (
                  <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                    No jobs scheduled for tomorrow
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    {tomorrowJobs.map((job) => (
                      <Paper key={job.id} sx={{ p: 2, backgroundColor: 'background.default' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="h6" fontWeight="medium">
                            {job.time} - {job.jobNumber}
                          </Typography>
                          <Chip
                            label={job.status}
                            size="small"
                            color={getStatusColor(job.status) as any}
                          />
                        </Box>
                        <Typography variant="body1">
                          {job.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {job.customer}
                        </Typography>
                        {job.address && (
                          <Typography variant="caption" color="text.secondary">
                            {job.address}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                          <Chip label={job.crew} size="small" color="primary" />
                          {job.estimatedHours && (
                            <Chip label={`${job.estimatedHours}h`} size="small" variant="outlined" />
                          )}
                        </Box>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Footer */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Auto-refreshes every 5 minutes • Last updated: {formatTime(currentTime)}
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}