'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Stack,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Divider,
} from '@mui/material'
import {
  AccessTime as TimeIcon,
  CheckCircle as CheckIcon,
  Snooze as SnoozeIcon,
  Close as DismissIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Business as BusinessIcon,
} from '@mui/icons-material'
import { format, addDays, addHours } from 'date-fns'

interface Reminder {
  id: string
  jobId: string
  jobNumber: string
  title: string
  message?: string
  customer: string
  scheduledDate: string
  reminderDate: string
  daysUntil: number
  priority: 'low' | 'medium' | 'high' | 'urgent'
  type: string
  status: string
  acknowledgedAt?: string
  snoozedUntil?: string
  isEnhanced: boolean
}

interface ReminderManagementProps {
  showCreateDialog?: boolean
  onCreateDialogClose?: () => void
}

export default function ReminderManagement({ 
  showCreateDialog = false,
  onCreateDialogClose 
}: ReminderManagementProps) {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [enhancedSystem, setEnhancedSystem] = useState(false)
  const [snoozeDialog, setSnoozeDialog] = useState<{ open: boolean; reminder: Reminder | null }>({
    open: false,
    reminder: null
  })
  const [createDialog, setCreateDialog] = useState(showCreateDialog)
  const [newReminder, setNewReminder] = useState({
    jobId: '',
    type: 'CUSTOM',
    title: '',
    message: '',
    reminderDate: '',
    priority: 'MEDIUM'
  })

  useEffect(() => {
    fetchReminders()
  }, [])

  useEffect(() => {
    setCreateDialog(showCreateDialog)
  }, [showCreateDialog])

  const fetchReminders = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/schedule/reminders?daysAhead=14')
      if (!response.ok) {
        throw new Error(`Failed to fetch reminders: ${response.status}`)
      }
      
      const data = await response.json()
      setReminders(data.reminders || [])
      setEnhancedSystem(data.enhancedSystem || false)
    } catch (err) {
      console.error('Error fetching reminders:', err)
      setError(err instanceof Error ? err.message : 'Failed to load reminders')
    } finally {
      setLoading(false)
    }
  }

  const handleReminderAction = async (reminderId: string, action: string, snoozedUntil?: string) => {
    try {
      const response = await fetch(`/api/schedule/reminders/${reminderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, snoozedUntil }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update reminder')
      }

      await fetchReminders()
    } catch (err) {
      console.error('Error updating reminder:', err)
      setError(err instanceof Error ? err.message : 'Failed to update reminder')
    }
  }

  const handleSnooze = (reminder: Reminder) => {
    setSnoozeDialog({ open: true, reminder })
  }

  const handleSnoozeConfirm = async (hours: number) => {
    if (!snoozeDialog.reminder) return
    
    const snoozedUntil = addHours(new Date(), hours)
    await handleReminderAction(snoozeDialog.reminder.id, 'snooze', snoozedUntil.toISOString())
    setSnoozeDialog({ open: false, reminder: null })
  }

  const createReminder = async () => {
    try {
      const response = await fetch('/api/schedule/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReminder),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create reminder')
      }

      await fetchReminders()
      setCreateDialog(false)
      setNewReminder({
        jobId: '',
        type: 'CUSTOM',
        title: '',
        message: '',
        reminderDate: '',
        priority: 'MEDIUM'
      })
      onCreateDialogClose?.()
    } catch (err) {
      console.error('Error creating reminder:', err)
      setError(err instanceof Error ? err.message : 'Failed to create reminder')
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error'
      case 'high': return 'error'
      case 'medium': return 'warning'
      case 'low': return 'info'
      default: return 'default'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'job_start': return <ScheduleIcon fontSize="small" />
      case 'overdue': return <WarningIcon fontSize="small" />
      case 'deadline_warning': return <TimeIcon fontSize="small" />
      default: return <TimeIcon fontSize="small" />
    }
  }

  const formatDaysUntil = (daysUntil: number) => {
    if (daysUntil < 0) {
      return `${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'} overdue`
    } else if (daysUntil === 0) {
      return 'Today'
    } else if (daysUntil === 1) {
      return 'Tomorrow'
    } else {
      return `In ${daysUntil} days`
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading reminders...</Typography>
      </Box>
    )
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!enhancedSystem && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Using basic reminder system. Create JobReminder table for enhanced features.
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Active Reminders ({reminders.length})
        </Typography>
        <Stack direction="row" spacing={1}>
          {enhancedSystem && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialog(true)}
              size="small"
            >
              Add Reminder
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchReminders}
            size="small"
          >
            Refresh
          </Button>
        </Stack>
      </Box>

      {reminders.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <TimeIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No Active Reminders
          </Typography>
          <Typography variant="body2" color="text.secondary">
            All caught up! No upcoming job reminders at this time.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {reminders.map((reminder) => (
            <Card 
              key={reminder.id} 
              sx={{ 
                border: reminder.daysUntil <= 0 ? '2px solid #f44336' : '1px solid #e0e0e0',
                boxShadow: reminder.priority === 'high' || reminder.priority === 'urgent' ? 3 : 1
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getTypeIcon(reminder.type)}
                    <Typography variant="h6" component="div">
                      {reminder.title}
                    </Typography>
                    <Chip
                      label={reminder.priority.toUpperCase()}
                      size="small"
                      color={getPriorityColor(reminder.priority) as any}
                      variant="outlined"
                    />
                  </Box>
                  <Chip
                    label={formatDaysUntil(reminder.daysUntil)}
                    size="small"
                    color={reminder.daysUntil <= 0 ? 'error' : 'default'}
                    variant={reminder.daysUntil <= 1 ? 'filled' : 'outlined'}
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <BusinessIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                  {reminder.customer} • Job #{reminder.jobNumber}
                </Typography>

                {reminder.message && (
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {reminder.message}
                  </Typography>
                )}

                <Typography variant="caption" color="text.secondary">
                  Job scheduled: {format(new Date(reminder.scheduledDate), 'MMM dd, yyyy HH:mm')}
                </Typography>

                {reminder.status === 'SNOOZED' && reminder.snoozedUntil && (
                  <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
                    Snoozed until: {format(new Date(reminder.snoozedUntil), 'MMM dd, yyyy HH:mm')}
                  </Typography>
                )}
              </CardContent>

              <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                {enhancedSystem && reminder.status === 'ACTIVE' && (
                  <>
                    <Tooltip title="Mark as acknowledged">
                      <IconButton
                        size="small"
                        onClick={() => handleReminderAction(reminder.id, 'acknowledge')}
                        color="success"
                      >
                        <CheckIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Snooze for later">
                      <IconButton
                        size="small"
                        onClick={() => handleSnooze(reminder)}
                        color="warning"
                      >
                        <SnoozeIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Dismiss reminder">
                      <IconButton
                        size="small"
                        onClick={() => handleReminderAction(reminder.id, 'dismiss')}
                        color="error"
                      >
                        <DismissIcon />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
                
                {!enhancedSystem && (
                  <Typography variant="caption" color="text.secondary">
                    Basic reminder - no actions available
                  </Typography>
                )}
              </CardActions>
            </Card>
          ))}
        </Stack>
      )}

      {/* Snooze Dialog */}
      <Dialog open={snoozeDialog.open} onClose={() => setSnoozeDialog({ open: false, reminder: null })}>
        <DialogTitle>Snooze Reminder</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 3 }}>
            How long would you like to snooze this reminder?
          </Typography>
          <Stack spacing={1}>
            <Button variant="outlined" onClick={() => handleSnoozeConfirm(1)}>
              1 Hour
            </Button>
            <Button variant="outlined" onClick={() => handleSnoozeConfirm(4)}>
              4 Hours
            </Button>
            <Button variant="outlined" onClick={() => handleSnoozeConfirm(24)}>
              1 Day
            </Button>
            <Button variant="outlined" onClick={() => handleSnoozeConfirm(72)}>
              3 Days
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSnoozeDialog({ open: false, reminder: null })}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Reminder Dialog */}
      <Dialog 
        open={createDialog} 
        onClose={() => {
          setCreateDialog(false)
          onCreateDialogClose?.()
        }} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Create Custom Reminder</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Job ID"
                value={newReminder.jobId}
                onChange={(e) => setNewReminder({ ...newReminder, jobId: e.target.value })}
                fullWidth
                required
                placeholder="Enter job ID"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={newReminder.type}
                  onChange={(e) => setNewReminder({ ...newReminder, type: e.target.value })}
                  label="Type"
                >
                  <MenuItem value="CUSTOM">Custom</MenuItem>
                  <MenuItem value="JOB_START">Job Start</MenuItem>
                  <MenuItem value="DEADLINE_WARNING">Deadline Warning</MenuItem>
                  <MenuItem value="FOLLOW_UP">Follow Up</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={newReminder.priority}
                  onChange={(e) => setNewReminder({ ...newReminder, priority: e.target.value })}
                  label="Priority"
                >
                  <MenuItem value="LOW">Low</MenuItem>
                  <MenuItem value="MEDIUM">Medium</MenuItem>
                  <MenuItem value="HIGH">High</MenuItem>
                  <MenuItem value="URGENT">Urgent</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Title"
                value={newReminder.title}
                onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Message"
                value={newReminder.message}
                onChange={(e) => setNewReminder({ ...newReminder, message: e.target.value })}
                fullWidth
                multiline
                rows={3}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Reminder Date & Time"
                type="datetime-local"
                value={newReminder.reminderDate}
                onChange={(e) => setNewReminder({ ...newReminder, reminderDate: e.target.value })}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCreateDialog(false)
            onCreateDialogClose?.()
          }}>
            Cancel
          </Button>
          <Button onClick={createReminder} variant="contained">
            Create Reminder
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}