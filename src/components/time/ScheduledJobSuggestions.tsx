'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  Alert,
  Stack,
  Grid,
} from '@mui/material'
import {
  Schedule as ScheduleIcon,
  Add as AddIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material'
import { format } from 'date-fns'

interface ScheduledJob {
  id: string
  jobId: string
  job: {
    id: string
    jobNumber: string
    title: string
    customer: string
  }
  startDate: string
  estimatedHours: number
  hasTimeEntry?: boolean
  crew: any[]
}

interface ScheduledJobSuggestionsProps {
  onCreateTimeEntry: (schedule: ScheduledJob) => void
}

export default function ScheduledJobSuggestions({ onCreateTimeEntry }: ScheduledJobSuggestionsProps) {
  const [todaysSchedule, setTodaysSchedule] = useState<ScheduledJob[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string; name: string; role: string } | null>(null)

  useEffect(() => {
    // Get user from localStorage
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      const userData = JSON.parse(storedUser)
      setUser(userData)
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchTodaysSchedule()
    }
  }, [user])

  const fetchTodaysSchedule = async () => {
    if (!user) return

    try {
      setLoading(true)
      const today = format(new Date(), 'yyyy-MM-dd')

      // Build URL based on user role
      let url = `/api/schedule?startDate=${today}&endDate=${today}`

      // If user is EMPLOYEE, only fetch their assigned jobs
      if (user.role === 'EMPLOYEE') {
        url += `&userId=${user.id}`
      }

      const response = await fetch(url)

      if (response.ok) {
        const scheduleData = await response.json()

        // For employees, further filter to ensure they only see their assigned jobs
        // AND hide jobs where they've already entered time
        if (user.role === 'EMPLOYEE') {
          const filteredData = scheduleData.filter((schedule: ScheduledJob) => {
            // Check if the user is in the crew list
            const isAssigned = schedule.crew?.some((crewMember: any) =>
              crewMember.userId === user.id || crewMember.id === user.id
            )
            // Only show jobs without time entries
            const needsTimeEntry = !schedule.hasTimeEntry
            return isAssigned && needsTimeEntry
          })
          setTodaysSchedule(filteredData)
        } else {
          // Managers/Admins see all jobs
          setTodaysSchedule(scheduleData)
        }
      }
    } catch (error) {
      console.error('Error fetching schedule:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography>Loading today's schedule...</Typography>
        </CardContent>
      </Card>
    )
  }

  if (todaysSchedule.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <ScheduleIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="h6" color="text.secondary">
              No Jobs Scheduled Today
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.role === 'EMPLOYEE'
                ? "You don't have any jobs assigned for today. Check the schedule page for upcoming assignments."
                : "No jobs are scheduled for today. Check the schedule page to assign jobs to today's date."
              }
            </Typography>
          </Box>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <ScheduleIcon color="primary" />
          <Typography variant="h6">
            {user?.role === 'EMPLOYEE' ? 'Your Jobs Today' : "Today's Scheduled Jobs"}
          </Typography>
          <Chip
            label={`${todaysSchedule.length} job${todaysSchedule.length !== 1 ? 's' : ''}`}
            size="small"
            color="primary"
          />
        </Box>


        <Grid container spacing={2}>
          {todaysSchedule.map((schedule) => (
            <Grid key={schedule.id} size={{ xs: 12, md: 6 }}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Stack spacing={1}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {schedule.job.jobNumber}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {schedule.job.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {schedule.job.customer}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        icon={<TimeIcon />}
                        label={`${schedule.estimatedHours}h estimated`}
                        size="small"
                        variant="outlined"
                      />
                      {schedule.crew.length > 0 && (
                        <Chip
                          label={`${schedule.crew.length} crew`}
                          size="small"
                          variant="outlined"
                          color="primary"
                        />
                      )}
                    </Box>

                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => onCreateTimeEntry(schedule)}
                      size="small"
                      sx={{
                        mt: 1,
                        backgroundColor: '#00bf9a',
                        '&:hover': {
                          backgroundColor: '#00a884',
                        },
                      }}
                    >
                      Create Time Entry
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  )
}