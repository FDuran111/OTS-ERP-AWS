'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Card,
  CardContent,
  Avatar,
  Stack,
  Grid,
  Alert,
  Checkbox,
  FormControlLabel,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  Person as PersonIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  Close as CloseIcon,
} from '@mui/icons-material'
import { format, parseISO } from 'date-fns'

interface CrewMember {
  id: string
  name: string
  email: string
  role: string
  conflicts?: number
}

interface Schedule {
  id: string
  jobId: string
  job: {
    jobNumber: string
    title: string
    customer: string
  }
  startDate: string
  endDate?: string
  estimatedHours: number
}

interface CrewAssignmentDialogProps {
  open: boolean
  onClose: () => void
  schedule: Schedule | null
  onAssignmentUpdate: () => void
}

export default function CrewAssignmentDialog({ 
  open, 
  onClose, 
  schedule, 
  onAssignmentUpdate 
}: CrewAssignmentDialogProps) {
  const [availableCrew, setAvailableCrew] = useState<CrewMember[]>([])
  const [assignedCrew, setAssignedCrew] = useState<CrewMember[]>([])
  const [selectedCrew, setSelectedCrew] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && schedule) {
      fetchCrewData()
    }
  }, [open, schedule])

  const fetchCrewData = async () => {
    if (!schedule) return

    try {
      setLoading(true)
      setError(null)

      // Fetch available crew for the date range
      const startDate = schedule.startDate
      const endDate = schedule.endDate || schedule.startDate

      const [availableRes, assignedRes] = await Promise.all([
        fetch(`/api/crew/available?startDate=${startDate}&endDate=${endDate}`),
        fetch(`/api/schedule/${schedule.id}/crew`)
      ])

      if (availableRes.ok) {
        const availableData = await availableRes.json()
        setAvailableCrew(availableData)
      }

      if (assignedRes.ok) {
        const assignedData = await assignedRes.json()
        setAssignedCrew(assignedData)
        setSelectedCrew(assignedData.map((member: CrewMember) => member.id))
      }
    } catch (error) {
      console.error('Error fetching crew data:', error)
      setError('Failed to load crew information')
    } finally {
      setLoading(false)
    }
  }

  const handleCrewToggle = (crewId: string) => {
    setSelectedCrew(prev => 
      prev.includes(crewId) 
        ? prev.filter(id => id !== crewId)
        : [...prev, crewId]
    )
  }

  const handleSaveAssignments = async () => {
    if (!schedule) return

    try {
      setSubmitting(true)
      setError(null)

      const response = await fetch(`/api/schedule/${schedule.id}/crew`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crewIds: selectedCrew
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update crew assignments')
      }

      onAssignmentUpdate()
      onClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save assignments')
    } finally {
      setSubmitting(false)
    }
  }

  const getCrewStatusIcon = (member: CrewMember) => {
    if (member.conflicts === 0) {
      return <CheckIcon color="success" />
    } else if (member.conflicts === 1) {
      return <WarningIcon color="warning" />
    } else {
      return <WarningIcon color="error" />
    }
  }

  const getCrewStatusText = (member: CrewMember) => {
    if (member.conflicts === 0) {
      return 'Available'
    } else if (member.conflicts === 1) {
      return '1 conflict'
    } else {
      return `${member.conflicts} conflicts`
    }
  }

  const getRoleColor = (role: string) => {
    switch (role.toUpperCase()) {
      case 'ADMIN': return 'primary'
      case 'FIELD_CREW': return 'info'
      case 'OFFICE': return 'warning'
      default: return 'default'
    }
  }

  if (!schedule) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6">
              Crew Assignment
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {schedule.job.jobNumber} - {schedule.job.title}
            </Typography>
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Job Details */}
        <Card sx={{ mb: 3, backgroundColor: 'background.default' }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Customer
                </Typography>
                <Typography variant="body2">
                  {schedule.job.customer}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Scheduled Date
                </Typography>
                <Typography variant="body2">
                  {format(parseISO(schedule.startDate), 'MMM d, yyyy')}
                  {schedule.endDate && schedule.endDate !== schedule.startDate && 
                    ` - ${format(parseISO(schedule.endDate), 'MMM d, yyyy')}`
                  }
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Estimated Hours
                </Typography>
                <Typography variant="body2">
                  {schedule.estimatedHours}h
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Currently Assigned
                </Typography>
                <Typography variant="body2">
                  {assignedCrew.length} crew member{assignedCrew.length !== 1 ? 's' : ''}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography>Loading crew information...</Typography>
          </Box>
        ) : (
          <>
            <Typography variant="h6" gutterBottom>
              Available Crew Members
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Select crew members to assign to this job
            </Typography>

            <Grid container spacing={2}>
              {availableCrew.map((member) => (
                <Grid key={member.id} size={{ xs: 12, sm: 6 }}>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      cursor: 'pointer',
                      backgroundColor: selectedCrew.includes(member.id) ? 'action.selected' : 'background.paper',
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                    onClick={() => handleCrewToggle(member.id)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={selectedCrew.includes(member.id)}
                              onChange={() => handleCrewToggle(member.id)}
                            />
                          }
                          label=""
                          sx={{ margin: 0 }}
                        />
                        
                        <Avatar sx={{ width: 40, height: 40 }}>
                          <PersonIcon />
                        </Avatar>

                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle1">
                            {member.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {member.email}
                          </Typography>
                          
                          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            <Chip 
                              label={member.role} 
                              size="small" 
                              color={getRoleColor(member.role) as any}
                            />
                            <Tooltip title={`This crew member has ${member.conflicts || 0} scheduling conflicts`}>
                              <Chip 
                                icon={getCrewStatusIcon(member)}
                                label={getCrewStatusText(member)}
                                size="small"
                                variant="outlined"
                              />
                            </Tooltip>
                          </Stack>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {availableCrew.length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                No crew members available for the selected date range. 
                Check the schedule for conflicts or add new crew members.
              </Alert>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button 
          onClick={handleSaveAssignments}
          variant="contained"
          disabled={submitting || loading}
          sx={{
            backgroundColor: '#e14eca',
            '&:hover': {
              backgroundColor: '#d236b8',
            },
          }}
        >
          {submitting ? 'Saving...' : `Assign ${selectedCrew.length} Crew Member${selectedCrew.length !== 1 ? 's' : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  )
}