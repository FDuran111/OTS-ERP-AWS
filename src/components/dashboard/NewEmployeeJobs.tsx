'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  Chip,
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  Alert,
  Stack,
} from '@mui/material'
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Work as WorkIcon,
  Person as PersonIcon,
  Schedule as TimeIcon,
} from '@mui/icons-material'
import { format } from 'date-fns'

interface NewJobEntry {
  id: string
  userId: string
  userName: string
  userEmail: string
  jobNumber: string
  customer: string
  description?: string
  date: string
  hours: number
  workDescription?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
}

interface Job {
  id: string
  jobNumber: string
  title: string
  customer: string
}

export default function NewEmployeeJobs() {
  const [entries, setEntries] = useState<NewJobEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewDialog, setReviewDialog] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<NewJobEntry | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchNewEntries()
    fetchJobs()
  }, [])

  const fetchNewEntries = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/time-entries/new-job?status=PENDING')

      if (response.ok) {
        const data = await response.json()
        setEntries(data)
      }
    } catch (error) {
      console.error('Error fetching new job entries:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs')
      if (response.ok) {
        const data = await response.json()
        setJobs(data)
      }
    } catch (error) {
      console.error('Error fetching jobs:', error)
    }
  }

  const handleReview = (entry: NewJobEntry) => {
    setSelectedEntry(entry)
    setSelectedJob(null)
    setError(null)
    setReviewDialog(true)
  }

  const handleApprove = async () => {
    if (!selectedEntry) return

    if (!selectedJob) {
      setError('Please select a job to link this entry to')
      return
    }

    try {
      const response = await fetch('/api/time-entries/new-job', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedEntry.id,
          status: 'APPROVED',
          jobId: selectedJob.id,
        }),
      })

      if (response.ok) {
        setReviewDialog(false)
        fetchNewEntries()
      }
    } catch (error) {
      console.error('Error approving entry:', error)
      setError('Failed to approve entry')
    }
  }

  const handleReject = async () => {
    if (!selectedEntry) return

    try {
      const response = await fetch('/api/time-entries/new-job', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedEntry.id,
          status: 'REJECTED',
        }),
      })

      if (response.ok) {
        setReviewDialog(false)
        fetchNewEntries()
      }
    } catch (error) {
      console.error('Error rejecting entry:', error)
      setError('Failed to reject entry')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography>Loading new job entries...</Typography>
        </CardContent>
      </Card>
    )
  }

  if (entries.length === 0) {
    return null // Don't show the card if there are no entries
  }

  return (
    <>
      <Card sx={{
        border: '2px solid',
        borderColor: 'warning.main',
        backgroundColor: 'warning.lighter',
      }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <WorkIcon color="warning" />
            <Typography variant="h6">
              New Employee Jobs
            </Typography>
            <Chip
              label={entries.length}
              size="small"
              color="warning"
            />
          </Box>

          <Typography variant="body2" color="text.secondary" gutterBottom>
            Employees have submitted time for new jobs that need review
          </Typography>

          <List sx={{ mt: 2 }}>
            {entries.slice(0, 5).map((entry) => (
              <ListItem
                key={entry.id}
                sx={{
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  px: 0,
                  '&:last-child': {
                    borderBottom: 'none',
                  },
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2">
                        {entry.jobNumber} - {entry.customer}
                      </Typography>
                      <Chip
                        icon={<PersonIcon />}
                        label={entry.userName}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={
                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                      {entry.description && (
                        <Typography variant="caption" color="text.secondary">
                          {entry.description}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          <TimeIcon sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
                          {entry.hours}h on {format(new Date(entry.date + 'T00:00:00'), 'MMM d')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Submitted {format(new Date(entry.createdAt), 'MMM d h:mm a')}
                        </Typography>
                      </Box>
                    </Stack>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    size="small"
                    color="success"
                    onClick={() => handleReview(entry)}
                  >
                    <ApproveIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => {
                      setSelectedEntry(entry)
                      handleReject()
                    }}
                  >
                    <RejectIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>

          {entries.length > 5 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              +{entries.length - 5} more entries pending review
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog
        open={reviewDialog}
        onClose={() => setReviewDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Review New Job Entry</DialogTitle>
        <DialogContent>
          {selectedEntry && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Alert severity="info">
                Employee {selectedEntry.userName} worked on a job that's not in the system
              </Alert>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Submitted Details:
                </Typography>
                <Typography variant="body2">
                  Job Number: {selectedEntry.jobNumber}
                </Typography>
                <Typography variant="body2">
                  Customer: {selectedEntry.customer}
                </Typography>
                {selectedEntry.description && (
                  <Typography variant="body2">
                    Description: {selectedEntry.description}
                  </Typography>
                )}
                <Typography variant="body2">
                  Hours: {selectedEntry.hours}h on {format(new Date(selectedEntry.date + 'T00:00:00'), 'MMM d, yyyy')}
                </Typography>
              </Box>

              {error && (
                <Alert severity="error">{error}</Alert>
              )}

              <Autocomplete
                options={jobs}
                getOptionLabel={(option) => `${option.jobNumber} - ${option.title}`}
                value={selectedJob}
                onChange={(_, value) => setSelectedJob(value)}
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props as any
                  return (
                    <li key={key} {...otherProps}>
                      <Box>
                        <Typography variant="body2">
                          {option.jobNumber} - {option.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.customer}
                        </Typography>
                      </Box>
                    </li>
                  )
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Link to Existing Job"
                    helperText="Select the job this work should be linked to"
                  />
                )}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleReject}
            color="error"
          >
            Reject
          </Button>
          <Button
            onClick={handleApprove}
            variant="contained"
            color="success"
            disabled={!selectedJob}
          >
            Approve & Link
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}