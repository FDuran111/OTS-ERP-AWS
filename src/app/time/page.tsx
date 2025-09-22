'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ResponsiveLayout from '@/components/layout/ResponsiveLayout'
import ResponsiveContainer from '@/components/layout/ResponsiveContainer'
import SimpleTimeEntry from '@/components/time/SimpleTimeEntry'
import ScheduledJobSuggestions from '@/components/time/ScheduledJobSuggestions'
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
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from '@mui/material'
import {
  AccessTime as TimeIcon,
  PlayArrow,
  Stop,
  Timer,
  Today,
  Group,
  TrendingUp,
  Add as AddIcon,
  Close as CloseIcon,
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
  const [stats, setStats] = useState<TimeStat[]>([])
  const [loading, setLoading] = useState(true)
  const [manualEntryOpen, setManualEntryOpen] = useState(false)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/login')
      return
    }
    const userData = JSON.parse(storedUser)
    setUser(userData)
    fetchTimeData(userData)
  }, [router])

  const fetchTimeData = async (currentUser?: User) => {
    try {
      setLoading(true)
      
      // Use passed user or state user
      const activeUser = currentUser || user
      
      // For employees, only fetch their own time entries
      const timeEntriesUrl = activeUser?.role === 'EMPLOYEE' 
        ? `/api/time-entries?limit=20&userId=${activeUser.id}` 
        : '/api/time-entries?limit=20'
      
      const [entriesResponse, statsResponse] = await Promise.all([
        fetch(timeEntriesUrl, {
          credentials: 'include'
        }),
        fetch(activeUser?.role === 'EMPLOYEE' 
          ? `/api/time-entries/stats?userId=${activeUser.id}`
          : '/api/time-entries/stats', {
          credentials: 'include'
        })
      ])

      if (entriesResponse.ok) {
        const entries = await entriesResponse.json()
        // Only show completed time entries, not active ones
        setTimeEntries(entries.filter((entry: TimeEntry) => !entry.isActive))
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

  // Action buttons for the page header - Manual Time Entry button for employees
  const actionButtons = user.role === 'EMPLOYEE' ? (
    <Button
      variant="contained"
      startIcon={<AddIcon />}
      onClick={() => setManualEntryOpen(true)}
      sx={{
        backgroundColor: '#00bf9a',
        '&:hover': {
          backgroundColor: '#00a884',
        },
      }}
    >
      Manual Time Entry
    </Button>
  ) : null


  return (
    <ResponsiveLayout>
      <ResponsiveContainer
        title="Time Tracking"
        actions={actionButtons}
      >

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
                <Card sx={{ 
                  height: '100%',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    boxShadow: 3,
                    transform: 'translateY(-2px)',
                  },
                }}>
                  <CardContent sx={{ p: 2.5 }}>
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
                <Card sx={{ 
                  height: '100%',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    boxShadow: 3,
                    transform: 'translateY(-2px)',
                  },
                }}>
                  <CardContent sx={{ p: 2.5 }}>
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
            // Open the manual entry dialog with the schedule pre-filled
            setManualEntryOpen(true)
            // TODO: Pass schedule data to SimpleTimeEntry
          }} />
        </Box>

        {/* Quick Time Entry - Show as card for non-employees */}
        {user?.role !== 'EMPLOYEE' && (
          <Box sx={{ mb: 3 }}>
            <SimpleTimeEntry onTimeEntryCreated={fetchTimeData} />
          </Box>
        )}


        <Typography variant="h6" sx={{ mb: 2 }}>
          📋 {user?.role === 'EMPLOYEE' ? 'My Time Entries' : 'Recent Time Entries'}
        </Typography>
        <TableContainer component={Paper} sx={{
          borderRadius: 2,
          overflow: 'hidden',
          transition: 'box-shadow 0.2s',
          '&:hover': {
            boxShadow: 2,
          },
        }}>
          <Table>
            <TableHead>
              <TableRow>
                {user?.role !== 'EMPLOYEE' && (
                  <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>Employee</TableCell>
                )}
                <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>Job</TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>Start Time</TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>End Time</TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>Hours</TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>Phase</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={user?.role === 'EMPLOYEE' ? 6 : 7} align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                      <CircularProgress size={24} />
                      <Typography sx={{ ml: 2 }}>Loading time entries...</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : timeEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={user?.role === 'EMPLOYEE' ? 6 : 7} align="center">
                    <Typography color="text.secondary">No time entries found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                timeEntries.map((entry) => (
                  <TableRow key={entry.id} hover sx={{ 
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}>
                    {user?.role !== 'EMPLOYEE' && (
                      <TableCell>{entry.userName}</TableCell>
                    )}
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
                    <TableCell>{new Date(entry.date + 'T00:00:00').toLocaleDateString()}</TableCell>
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

      {/* Manual Time Entry Dialog for Employees */}
      <Dialog
        open={manualEntryOpen}
        onClose={() => setManualEntryOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1
        }}>
          Manual Time Entry
          <IconButton onClick={() => setManualEntryOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <SimpleTimeEntry
            noCard={true}
            onTimeEntryCreated={() => {
              fetchTimeData()
              setManualEntryOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </ResponsiveLayout>
  )
}