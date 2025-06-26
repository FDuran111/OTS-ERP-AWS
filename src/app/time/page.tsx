'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ResponsiveLayout from '@/components/layout/ResponsiveLayout'
import ResponsiveContainer from '@/components/layout/ResponsiveContainer'
import SimpleTimeEntry from '@/components/time/SimpleTimeEntry'
import ScheduledJobSuggestions from '@/components/time/ScheduledJobSuggestions'
import ActiveTimerCard from '@/components/time/ActiveTimerCard'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Stack,
  useMediaQuery,
  useTheme,
  Grid,
  CircularProgress,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  AccessTime as TimeIcon,
  PlayArrow,
  Stop,
  Timer,
  Today,
  Group,
  TrendingUp,
} from '@mui/icons-material'

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface TimeEntry {
  id: string
  userId: string
  userName: string
  jobId: string
  jobNumber: string
  jobTitle: string
  customer: string
  phaseId?: string
  phaseName?: string
  date: string
  startTime: string
  endTime?: string
  hours: number
  calculatedHours?: number
  description?: string
  isActive: boolean
  createdAt: string
}

interface TimeStat {
  title: string
  value: string
  icon: any
  color: string
}

// Icon mapping for stats
const iconMap = {
  timer: Timer,
  play_arrow: PlayArrow,
  today: Today,
  group: Group,
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Active':
      return 'success'
    case 'Pending':
      return 'warning'
    case 'Approved':
      return 'info'
    default:
      return 'default'
  }
}

export default function TimePage() {
  const router = useRouter()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [user, setUser] = useState<User | null>(null)
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [activeTimers, setActiveTimers] = useState<TimeEntry[]>([])
  const [stats, setStats] = useState<TimeStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/login')
      return
    }
    setUser(JSON.parse(storedUser))
    fetchTimeData()
  }, [router])

  const fetchTimeData = async () => {
    try {
      setLoading(true)
      const [entriesResponse, statsResponse] = await Promise.all([
        fetch('/api/time-entries?limit=20', {
          credentials: 'include'
        }),
        fetch('/api/time-entries/stats', {
          credentials: 'include'
        })
      ])

      if (entriesResponse.ok) {
        const entries = await entriesResponse.json()
        setTimeEntries(entries.filter((entry: TimeEntry) => !entry.isActive))
        setActiveTimers(entries.filter((entry: TimeEntry) => entry.isActive))
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        const transformedStats = statsData.stats.map((stat: any) => ({
          ...stat,
          icon: iconMap[stat.icon as keyof typeof iconMap] || Timer,
        }))
        setStats(transformedStats)
      }
    } catch (error) {
      console.error('Error fetching time data:', error)
    } finally {
      setLoading(false)
    }
  }


  if (!user) return null

  // Action buttons for the page header
  const actionButtons = (
    <Stack 
      direction={{ xs: 'column', sm: 'row' }} 
      spacing={1} 
      sx={{ 
        width: { xs: '100%', sm: 'auto' },
        alignItems: { xs: 'stretch', sm: 'center' }
      }}
    >
      <Button
        variant="contained"
        startIcon={<TimeIcon />}
        onClick={() => router.push('/time/mobile')}
        sx={{ 
          bgcolor: 'success.main', 
          '&:hover': { bgcolor: 'success.dark' },
          flex: { xs: 1, sm: 'none' },
          minWidth: { xs: 'auto', sm: '140px' }
        }}
        size={isMobile ? 'small' : 'medium'}
      >
        {isMobile ? 'Mobile Clock' : 'Mobile Clock'}
      </Button>
    </Stack>
  )

  // Breadcrumbs for navigation
  const breadcrumbs = [
    {
      label: 'Home',
      path: '/dashboard',
      icon: <DashboardIcon fontSize="small" />
    },
    {
      label: 'Time Tracking',
      path: '/time',
      icon: <TimeIcon fontSize="small" />
    }
  ]

  return (
    <ResponsiveLayout>
      <ResponsiveContainer
        title="Time Tracking"
        subtitle="Log time worked on jobs - simplified workflow, no timers needed"
        breadcrumbs={breadcrumbs}
        actions={actionButtons}
      >

        <Grid container spacing={3} sx={{ mb: 3 }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                      <CircularProgress size={24} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          ) : (
            stats.map((stat) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.title}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 48,
                          height: 48,
                          borderRadius: '12px',
                          backgroundColor: `${stat.color}20`,
                          mr: 2,
                        }}
                      >
                        {React.createElement(stat.icon, { sx: { color: stat.color } })}
                      </Box>
                      <Box>
                        <Typography color="text.secondary" variant="caption">
                          {stat.title}
                        </Typography>
                        <Typography variant="h5">{stat.value}</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>

        {/* Scheduled Job Suggestions */}
        <Box sx={{ mb: 3 }}>
          <ScheduledJobSuggestions onCreateTimeEntry={(schedule) => {
            // This will trigger the SimpleTimeEntry to pre-fill with the schedule
            // For now, we'll just show an alert, but you could enhance this further
            alert(`Creating time entry for ${schedule.job.jobNumber}`)
          }} />
        </Box>

        {/* Quick Time Entry */}
        <Box sx={{ mb: 3 }}>
          <SimpleTimeEntry onTimeEntryCreated={fetchTimeData} />
        </Box>

        {/* Active Timers - Legacy Support */}
        {activeTimers.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ⏱️ Active Timers (Legacy)
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                These are old-style timers that are still running. Stop them to complete the time entries.
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {activeTimers.map((timer) => (
                    <Grid size={{ xs: 12, md: 6 }} key={timer.id}>
                      <ActiveTimerCard
                        timer={{
                          id: timer.id,
                          userName: timer.userName,
                          jobNumber: timer.jobNumber,
                          jobTitle: timer.jobTitle,
                          customer: timer.customer,
                          phaseName: timer.phaseName,
                          startTime: timer.startTime,
                          description: timer.description,
                        }}
                        onTimerStopped={fetchTimeData}
                      />
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        )}

        <Typography variant="h6" sx={{ mb: 2 }}>
          📋 Recent Time Entries
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Job</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Start Time</TableCell>
                <TableCell>End Time</TableCell>
                <TableCell>Hours</TableCell>
                <TableCell>Phase</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                      <CircularProgress size={24} />
                      <Typography sx={{ ml: 2 }}>Loading time entries...</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : timeEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary">No time entries found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                timeEntries.map((entry) => (
                  <TableRow key={entry.id} hover>
                    <TableCell>{entry.userName}</TableCell>
                    <TableCell>
                      <Stack>
                        <Typography variant="body2">{entry.jobNumber}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {entry.jobTitle}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {entry.customer}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {new Date(entry.startTime).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </TableCell>
                    <TableCell>
                      {entry.endTime 
                        ? new Date(entry.endTime).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })
                        : 'Active'
                      }
                    </TableCell>
                    <TableCell>{entry.hours?.toFixed(1) || '-'}</TableCell>
                    <TableCell>
                      {entry.phaseName ? (
                        <Chip
                          label={entry.phaseName}
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </ResponsiveContainer>
    </ResponsiveLayout>
  )
}