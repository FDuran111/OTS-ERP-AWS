'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ResponsiveLayout from '@/components/layout/ResponsiveLayout'
import ResponsiveContainer from '@/components/layout/ResponsiveContainer'
import MultiJobTimeEntry from '@/components/time/MultiJobTimeEntry'
import ScheduledJobSuggestions from '@/components/time/ScheduledJobSuggestions'
import WeeklyTimesheetDisplay from '@/components/time/WeeklyTimesheetDisplay'
import CompanyWeeklyJobsSummary from '@/components/time/CompanyWeeklyJobsSummary'
import PendingJobEntries from '@/components/admin/PendingJobEntries'
import OvertimeSettings from '@/components/admin/OvertimeSettings'
import PayrollSummary from '@/components/admin/PayrollSummary'
import TimeEntryAuditTrail from '@/components/admin/TimeEntryAuditTrail'
import ApprovalDashboard from '@/components/admin/ApprovalDashboard'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Paper,
  Button,
  Stack,
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
  Tabs,
  Tab,
  Badge,
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
  Assessment as ReportsIcon,
  Assessment,
  AttachMoney as MoneyIcon,
  CheckCircle as ApprovalIcon,
  Work as JobIcon,
  People as PeopleIcon,
  History as HistoryIcon,
  AccountBalanceWallet as PayrollIcon,
  FilterList as FilterIcon,
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

export default function TimePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<TimeStat[]>([])
  const [loading, setLoading] = useState(true)
  const [manualEntryOpen, setManualEntryOpen] = useState(false)
  const [preselectedJob, setPreselectedJob] = useState<any>(null)

  // Admin view controls
  const [adminTabValue, setAdminTabValue] = useState(0)
  const [selectedRole, setSelectedRole] = useState<'EMPLOYEE' | 'FOREMAN' | 'OWNER_ADMIN'>('EMPLOYEE')
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [selectedViewUser, setSelectedViewUser] = useState<User | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [pendingJobsCount, setPendingJobsCount] = useState(0)

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

  // Check for URL parameters to auto-open entry edit dialog
  useEffect(() => {
    const entryId = searchParams.get('entryId')
    const action = searchParams.get('action')

    if (entryId && action === 'edit' && user) {
      // Fetch the time entry details
      fetchAndOpenEntry(entryId)
    }
  }, [searchParams, user])

  const fetchAndOpenEntry = async (entryId: string) => {
    try {
      const token = localStorage.getItem('auth-token')
      const response = await fetch(`/api/time-entries/${entryId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include'
      })

      if (response.ok) {
        const entry = await response.json()
        // Open the edit dialog with this entry
        setPreselectedJob({
          jobId: entry.jobId,
          jobNumber: entry.jobNumber,
          jobTitle: entry.jobTitle || entry.job?.title,
          date: entry.date,
          hours: entry.hours,
          description: entry.description,
          editingEntryId: entry.id,
          userId: entry.userId
        })
        setManualEntryOpen(true)

        // Clear URL parameters to prevent re-opening on refresh
        router.replace('/time', { scroll: false })
      }
    } catch (error) {
      console.error('Error fetching time entry:', error)
    }
  }

  const fetchAllUsers = async () => {
    try {
      const token = localStorage.getItem('auth-token')
      const response = await fetch('/api/users', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
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

      const token = localStorage.getItem('auth-token')
      const statsResponse = await fetch(
        activeUser?.role === 'EMPLOYEE'
          ? `/api/time-entries/stats?userId=${activeUser.id}`
          : '/api/time-entries/stats', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
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

      // Fetch pending counts for admins
      if (activeUser?.role === 'OWNER_ADMIN' || activeUser?.role === 'FOREMAN') {
        try {
          // Fetch pending time entries
          const token = localStorage.getItem('auth-token')
          const pendingResponse = await fetch('/api/time-entries?status=submitted&limit=100', {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            credentials: 'include'
          })
          if (pendingResponse.ok) {
            const pendingData = await pendingResponse.json()
            setPendingCount(pendingData.length)
          }

          // Fetch pending job entries
          const jobsResponse = await fetch('/api/jobs/pending', {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            credentials: 'include'
          })
          if (jobsResponse.ok) {
            const jobsData = await jobsResponse.json()
            setPendingJobsCount(jobsData.length || 0)
          }
        } catch (err) {
          console.error('Error fetching pending counts:', err)
        }
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
    <Stack direction="row" spacing={1}>
      {(user?.role === 'OWNER_ADMIN' || user?.role === 'FOREMAN') && (
        <>
          <OvertimeSettings triggerButton />
          <Button
            variant="outlined"
            startIcon={<ReportsIcon />}
            onClick={() => alert('Reports feature coming soon!')}
            color="primary"
          >
            Reports
          </Button>
        </>
      )}
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => {
          setPreselectedJob(null) // Clear any previous job selection so date defaults to today
          setManualEntryOpen(true)
        }}
        sx={{
          backgroundColor: '#00bf9a',
          '&:hover': {
            backgroundColor: '#00a884',
          },
        }}
      >
        Manual Time Entry
      </Button>
    </Stack>
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

        {/* Admin Tab Interface */}
        {(user?.role === 'OWNER_ADMIN' || user?.role === 'FOREMAN') && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Tabs
                value={adminTabValue}
                onChange={(_, newValue) => setAdminTabValue(newValue)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
              >
                <Tab
                  icon={<Assessment />}
                  label="Dashboard"
                  iconPosition="start"
                />
                <Tab
                  icon={
                    pendingCount > 0 ? (
                      <Badge badgeContent={pendingCount} color="error">
                        <ApprovalIcon />
                      </Badge>
                    ) : (
                      <ApprovalIcon />
                    )
                  }
                  label="Approvals"
                  iconPosition="start"
                />
                <Tab
                  icon={<PeopleIcon />}
                  label="Employee Timesheets"
                  iconPosition="start"
                />
                <Tab
                  icon={
                    pendingJobsCount > 0 ? (
                      <Badge badgeContent={pendingJobsCount} color="warning">
                        <JobIcon />
                      </Badge>
                    ) : (
                      <JobIcon />
                    )
                  }
                  label="Pending Job Entries"
                  iconPosition="start"
                />
              </Tabs>

              {/* Tab Panel: Dashboard */}
              {adminTabValue === 0 && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    📊 Company Weekly Overview
                  </Typography>
                  <Box sx={{ mb: 3 }}>
                    <CompanyWeeklyJobsSummary />
                  </Box>

                  <Typography variant="h6" sx={{ mb: 2 }}>
                    💰 Payroll Summary
                  </Typography>
                  <Box sx={{ mb: 3 }}>
                    <PayrollSummary />
                  </Box>

                  <Box>
                    <TimeEntryAuditTrail showFilters={true} showTitle={true} />
                  </Box>
                </Box>
              )}

              {/* Tab Panel: Approvals */}
              {adminTabValue === 1 && (
                <Box>
                  <ApprovalDashboard
                    onCountChange={(count: number) => setPendingCount(count)}
                    isVisible={adminTabValue === 1}
                  />
                </Box>
              )}

              {/* Tab Panel: Employee Timesheets */}
              {adminTabValue === 2 && (
                <Box>
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

                  <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto', mb: 3 }}>
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

                  {selectedViewUser && (
                    <Box>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        📅 {selectedViewUser.name}'s Weekly Timesheet
                      </Typography>
                      <WeeklyTimesheetDisplay
                        userId={selectedViewUser.id}
                        selectedUserId={selectedViewUser.id}
                        isAdmin={true}
                        onEditEntry={(entry) => {
                          setPreselectedJob({
                            jobId: entry.jobId,
                            jobNumber: entry.jobNumber,
                            jobTitle: entry.jobTitle,
                            date: entry.date || undefined, // Don't set date if empty string
                            hours: entry.hours,
                            description: entry.description,
                            editingEntryId: entry.id || undefined,
                            userId: selectedViewUser.id
                          })
                          setManualEntryOpen(true)
                        }}
                        onRefresh={fetchTimeData}
                      />
                    </Box>
                  )}
                </Box>
              )}

              {/* Tab Panel: Pending Job Entries */}
              {adminTabValue === 3 && (
                <Box>
                  <PendingJobEntries />
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {/* Weekly Timesheet - For employees only */}
        {user?.role === 'EMPLOYEE' && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              📅 My Weekly Timesheet
            </Typography>
            <WeeklyTimesheetDisplay
              userId={user.id}
              isAdmin={false}
              onEditEntry={(entry) => {
                setPreselectedJob({
                  jobId: entry.jobId,
                  jobNumber: entry.jobNumber,
                  jobTitle: entry.jobTitle,
                  date: entry.date || undefined, // Don't set date if empty string
                  hours: entry.hours,
                  description: entry.description,
                  editingEntryId: entry.id || undefined
                })
                setManualEntryOpen(true)
              }}
              onRefresh={fetchTimeData}
            />
          </Box>
        )}


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

      {/* Manual Time Entry Dialog */}
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
          <IconButton onClick={() => {
            setManualEntryOpen(false)
            setPreselectedJob(null)
          }} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <MultiJobTimeEntry
            onTimeEntriesCreated={() => {
              fetchTimeData()
              setManualEntryOpen(false)
              setPreselectedJob(null)
            }}
            preselectedEmployee={selectedViewUser}
            preselectedJob={preselectedJob}
          />
        </DialogContent>
      </Dialog>

    </ResponsiveLayout>
  )
}