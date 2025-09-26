'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ResponsiveLayout from '@/components/layout/ResponsiveLayout'
import ResponsiveContainer from '@/components/layout/ResponsiveContainer'
import SimpleTimeEntry from '@/components/time/SimpleTimeEntry'
import ScheduledJobSuggestions from '@/components/time/ScheduledJobSuggestions'
import WeeklyTimesheetDisplay from '@/components/time/WeeklyTimesheetDisplay'
import CompanyWeeklyJobsSummary from '@/components/time/CompanyWeeklyJobsSummary'
import PendingJobEntries from '@/components/admin/PendingJobEntries'
import {
  Box,
  Typography,
  Card,
  CardContent,
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
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
} from '@mui/material'
import {
  Timer,
  PlayArrow,
  Today,
  Group,
  Add as AddIcon,
  Close as CloseIcon,
  ExpandMore,
  ExpandLess,
  Person,
} from '@mui/icons-material'

interface User {
  id: string
  email: string
  name: string
  role: string
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
  const [stats, setStats] = useState<TimeStat[]>([])
  const [loading, setLoading] = useState(true)
  const [manualEntryOpen, setManualEntryOpen] = useState(false)
  const [preselectedJob, setPreselectedJob] = useState<any>(null)

  // Admin view controls
  const [adminViewExpanded, setAdminViewExpanded] = useState(false)
  const [selectedRole, setSelectedRole] = useState<'EMPLOYEE' | 'FOREMAN' | 'OWNER_ADMIN'>('EMPLOYEE')
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [selectedViewUser, setSelectedViewUser] = useState<User | null>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/login')
      return
    }
    const userData = JSON.parse(storedUser)
    setUser(userData)
    fetchTimeData(userData)

    // Fetch all users if admin
    if (userData.role === 'OWNER_ADMIN' || userData.role === 'FOREMAN') {
      fetchAllUsers()
    }
  }, [router])

  const fetchAllUsers = async () => {
    try {
      const response = await fetch('/api/users', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        // Handle both array and object response formats
        const users = Array.isArray(data) ? data : (data.users || [])
        setAllUsers(users)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchTimeData = async (currentUser?: User) => {
    try {
      setLoading(true)
      
      // Use passed user or state user
      const activeUser = currentUser || user
      
      const statsResponse = await fetch(
        activeUser?.role === 'EMPLOYEE'
          ? `/api/time-entries/stats?userId=${activeUser.id}`
          : '/api/time-entries/stats', {
          credentials: 'include'
        }
      )

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

  // Action buttons for the page header - Manual Time Entry button for all users
  const actionButtons = (
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
  )


  return (
    <ResponsiveLayout>
      <ResponsiveContainer
        title="Time Card"
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

        {/* Pending Job Entries - Admin only */}
        {(user?.role === 'OWNER_ADMIN' || user?.role === 'FOREMAN') && (
          <Box sx={{ mb: 3 }}>
            <PendingJobEntries />
          </Box>
        )}

        {/* Admin User Timesheet Viewer */}
        {(user?.role === 'OWNER_ADMIN' || user?.role === 'FOREMAN') && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
                onClick={() => setAdminViewExpanded(!adminViewExpanded)}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Person />
                  <Typography variant="h6">
                    View Employee Timesheets
                  </Typography>
                </Stack>
                <IconButton size="small">
                  {adminViewExpanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>

              <Collapse in={adminViewExpanded}>
                <Box sx={{ mt: 2 }}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Role</InputLabel>
                    <Select
                      value={selectedRole}
                      label="Role"
                      onChange={(e) => {
                        setSelectedRole(e.target.value as any)
                        setSelectedViewUser(null)
                      }}
                    >
                      <MenuItem value="EMPLOYEE">Employees</MenuItem>
                      <MenuItem value="FOREMAN">Foremen</MenuItem>
                      <MenuItem value="OWNER_ADMIN">Admins</MenuItem>
                    </Select>
                  </FormControl>

                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Select a user to view their timesheet:
                  </Typography>

                  <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto' }}>
                    <List dense>
                      {allUsers && Array.isArray(allUsers) && allUsers
                        .filter(u => u.role === selectedRole)
                        .map((u) => (
                          <ListItem key={u.id} disablePadding>
                            <ListItemButton
                              selected={selectedViewUser?.id === u.id}
                              onClick={() => setSelectedViewUser(u)}
                            >
                              <ListItemText
                                primary={u.name}
                                secondary={u.email}
                              />
                            </ListItemButton>
                          </ListItem>
                        ))}
                      {(!allUsers || !Array.isArray(allUsers) || allUsers.filter(u => u.role === selectedRole).length === 0) && (
                        <ListItem>
                          <ListItemText
                            primary="No users found"
                            secondary={`No ${selectedRole.toLowerCase()}s in the system`}
                          />
                        </ListItem>
                      )}
                    </List>
                  </Paper>
                </Box>
              </Collapse>
            </CardContent>
          </Card>
        )}

        {/* Weekly Timesheet - Primary feature */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            📅 {selectedViewUser ? `${selectedViewUser.name}'s Weekly Timesheet` :
               (user?.role === 'EMPLOYEE' ? 'My Weekly Timesheet' : 'All Jobs This Week - Company Overview')}
          </Typography>

          {/* For employees, show their own timesheet */}
          {user?.role === 'EMPLOYEE' && (
            <WeeklyTimesheetDisplay
              userId={user.id}
              isAdmin={false}
              onEditEntry={(entry) => {
                setPreselectedJob({
                  jobId: entry.jobId,
                  jobNumber: entry.jobNumber,
                  jobTitle: entry.jobTitle,
                  date: entry.date,
                  hours: entry.hours,
                  description: entry.description,
                  editingEntryId: entry.id
                })
                setManualEntryOpen(true)
              }}
              onRefresh={fetchTimeData}
            />
          )}

          {/* For admins viewing a specific user */}
          {(user?.role === 'OWNER_ADMIN' || user?.role === 'FOREMAN') && selectedViewUser && (
            <WeeklyTimesheetDisplay
              userId={selectedViewUser.id}
              selectedUserId={selectedViewUser.id}
              isAdmin={true}
              onEditEntry={(entry) => {
                setPreselectedJob({
                  jobId: entry.jobId,
                  jobNumber: entry.jobNumber,
                  jobTitle: entry.jobTitle,
                  date: entry.date,
                  hours: entry.hours,
                  description: entry.description,
                  editingEntryId: entry.id
                })
                setManualEntryOpen(true)
              }}
              onRefresh={fetchTimeData}
            />
          )}

          {/* For admins - show all jobs summary when no user selected */}
          {(user?.role === 'OWNER_ADMIN' || user?.role === 'FOREMAN') && !selectedViewUser && (
            <CompanyWeeklyJobsSummary />
          )}
        </Box>

        {/* Scheduled Job Suggestions - Only for field workers */}
        {user?.role === 'EMPLOYEE' && (
          <Box sx={{ mb: 3, mt: 3 }}>
            <ScheduledJobSuggestions onCreateTimeEntry={(schedule) => {
              // Open the manual entry dialog with the schedule pre-filled
              setPreselectedJob({
                jobId: schedule.jobId || schedule.job?.id,
                jobNumber: schedule.job?.jobNumber,
                jobTitle: schedule.job?.title,
                estimatedHours: schedule.estimatedHours
              })
              setManualEntryOpen(true)
            }} />
          </Box>
        )}

      </ResponsiveContainer>

      {/* Manual Time Entry Dialog for Employees */}
      <Dialog
        open={manualEntryOpen}
        onClose={() => {
          setManualEntryOpen(false)
          setPreselectedJob(null)
        }}
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
            preselectedJob={preselectedJob}
            onTimeEntryCreated={() => {
              fetchTimeData()
              setManualEntryOpen(false)
              setPreselectedJob(null)
            }}
          />
        </DialogContent>
      </Dialog>

    </ResponsiveLayout>
  )
}