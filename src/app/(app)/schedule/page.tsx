'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import ResponsiveLayout from '@/components/layout/ResponsiveLayout'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  Grid,
  useTheme,
  useMediaQuery,
  IconButton,
} from '@mui/material'
import {
  Notifications as NotificationsIcon,
  Event as EventIcon,
  Warning as WarningIcon,
  TaskAlt as TaskIcon,
  Close as CloseIcon,
} from '@mui/icons-material'
import JobSchedulingCalendar from '@/components/scheduling/JobSchedulingCalendar'
import CrewAvailabilityWidget from '@/components/scheduling/CrewAvailabilityWidget'
import ReminderManagement from '@/components/reminders/ReminderManagement'

interface User {
  id: string
  email: string
  name: string
  role: string
}

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

export default function SchedulePage() {
  const router = useRouter()
  const theme = useTheme()
  const { user, loading: authLoading } = useAuth()
  const [upcomingReminders, setUpcomingReminders] = useState<UpcomingReminder[]>([])
  const [showReminders, setShowReminders] = useState(true)
  const [reminderManagementOpen, setReminderManagementOpen] = useState(false)

  useEffect(() => {
    if (authLoading) return // Wait for auth to complete

    if (!user) {
      router.push('/login')
      return
    }

    // Restrict access to OWNER_ADMIN and FOREMAN only
    if (user.role === 'EMPLOYEE') {
      router.push('/dashboard')
      return
    }

    fetchUpcomingReminders()
  }, [user, authLoading, router])

  const fetchUpcomingReminders = async () => {
    try {
      const token = localStorage.getItem('auth-token')
      const remindersResponse = await fetch('/api/schedule/reminders', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include'
      })
      
      if (remindersResponse.ok) {
        const remindersData = await remindersResponse.json()
        setUpcomingReminders(remindersData.reminders || [])
      } else {
        // Mock reminder data for now
        setUpcomingReminders([
          {
            id: '1',
            jobId: 'job1',
            jobNumber: 'J-2024-001',
            title: 'Commercial Wiring Project',
            customer: 'ABC Company',
            scheduledDate: '2024-06-18',
            daysUntil: 3,
            priority: 'high',
            type: 'start_reminder'
          },
          {
            id: '2',
            jobId: 'job2',
            jobNumber: 'J-2024-002',
            title: 'Service Call - Panel Upgrade',
            customer: 'John Smith',
            scheduledDate: '2024-06-20',
            daysUntil: 5,
            priority: 'medium',
            type: 'start_reminder'
          }
        ])
      }
    } catch (error) {
      console.error('Error fetching reminders:', error)
      setUpcomingReminders([])
    }
  }


  const handleJobScheduled = () => {
    fetchUpcomingReminders()
  }

  const getReminderPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'error'
      case 'medium':
        return 'warning'
      case 'low':
        return 'info'
      default:
        return 'default'
    }
  }

  const getReminderIcon = (type: string) => {
    switch (type) {
      case 'start_reminder':
        return <EventIcon />
      case 'deadline_warning':
        return <WarningIcon />
      case 'overdue':
        return <TaskIcon />
      default:
        return <NotificationsIcon />
    }
  }

  if (!user) return null

  return (
    <ResponsiveLayout>
      <Box sx={{ mt: -2 }}>


          {/* Upcoming Reminders Section */}
          {showReminders && upcomingReminders.length > 0 && (
            <Card sx={{ 
              mb: 3, 
              border: '2px solid', 
              borderColor: 'warning.main',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                boxShadow: 3,
              },
            }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <NotificationsIcon sx={{ mr: 1, color: 'warning.main' }} />
                  <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    Upcoming Job Reminders
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setReminderManagementOpen(true)}
                    sx={{ mr: 1 }}
                  >
                    Manage Reminders
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setShowReminders(false)}
                  >
                    Dismiss
                  </Button>
                </Box>
                <Grid container spacing={1.5}>
                  {upcomingReminders.map((reminder) => (
                    <Grid key={reminder.id} size={{ xs: 12, sm: 12, md: 6, lg: 4 }}>
                      <Card sx={{ 
                        backgroundColor: 'background.default', 
                        height: '100%',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          boxShadow: 2,
                          transform: 'translateY(-2px)',
                        },
                      }}>
                        <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: { xs: 'row', sm: 'row' },
                            alignItems: 'flex-start', 
                            gap: 1.5,
                            mb: 1.5
                          }}>
                            <Box sx={{ 
                              color: getReminderPriorityColor(reminder.priority),
                              flexShrink: 0
                            }}>
                              {getReminderIcon(reminder.type)}
                            </Box>
                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                              <Typography 
                                variant="subtitle1" 
                                fontWeight="medium"
                                sx={{
                                  fontSize: { xs: '0.875rem', sm: '1rem' },
                                  lineHeight: 1.3,
                                  mb: 0.5
                                }}
                              >
                                {reminder.jobNumber} - {reminder.title}
                              </Typography>
                              <Typography 
                                variant="body2" 
                                color="text.secondary"
                                sx={{
                                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                  mb: 1
                                }}
                              >
                                {reminder.customer}
                              </Typography>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                  mb: 2
                                }}
                              >
                                Scheduled: {new Date(reminder.scheduledDate).toLocaleDateString()}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ 
                            display: 'flex', 
                            flexWrap: 'wrap',
                            gap: 1, 
                            mt: 'auto'
                          }}>
                            <Chip
                              label={`${reminder.daysUntil} days`}
                              size="small"
                              color={getReminderPriorityColor(reminder.priority) as any}
                              sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                            />
                            <Chip
                              label={reminder.type.replace('_', ' ')}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Job Scheduling Calendar */}
          <Box sx={{
            mb: 3,
            width: '100%',
            overflowX: 'auto',
            overflowY: 'hidden'
          }}>
            <JobSchedulingCalendar onJobScheduled={handleJobScheduled} />
          </Box>

          {/* Crew Availability Widget - Only for managers */}
          {user.role !== 'EMPLOYEE' && (
            <Box sx={{ mb: 3 }}>
              <CrewAvailabilityWidget />
            </Box>
          )}
      </Box>

      {/* Reminder Management Dialog */}
      {reminderManagementOpen && (
        <Box 
          sx={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.5)', 
            zIndex: 1300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setReminderManagementOpen(false)}
        >
          <Box 
            sx={{ 
              backgroundColor: 'background.paper', 
              borderRadius: 2, 
              p: 2.5, 
              maxWidth: '90vw', 
              maxHeight: '90vh', 
              overflow: 'auto',
              minWidth: 600
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5">Reminder Management</Typography>
              <IconButton onClick={() => setReminderManagementOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
            <ReminderManagement />
          </Box>
        </Box>
      )}

    </ResponsiveLayout>
  )
}