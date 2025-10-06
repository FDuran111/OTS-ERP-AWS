'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Chip,
  Alert,
  Divider,
  Stack,
  IconButton,
  CircularProgress,
} from '@mui/material'
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Send as SendIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material'
import { format } from 'date-fns'
import RejectionNotesThread from './RejectionNotesThread'

interface RejectionFixDialogProps {
  open: boolean
  onClose: () => void
  timeEntryId: string | null
}

interface TimeEntry {
  id: string
  jobId: string
  jobNumber?: string
  job_description?: string
  jobTitle?: string
  date: string
  hours: number
  description: string
  status: string
  rejectionReason?: string
  userName?: string
  user_name?: string
  hasRejectionNotes?: boolean
}

export default function RejectionFixDialog({
  open,
  onClose,
  timeEntryId
}: RejectionFixDialogProps) {
  const [entry, setEntry] = useState<TimeEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [hours, setHours] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (open && timeEntryId) {
      fetchEntry()
    }
  }, [open, timeEntryId])

  const fetchEntry = async () => {
    if (!timeEntryId) return

    try {
      setLoading(true)
      const token = localStorage.getItem('auth-token')
      const response = await fetch(`/api/time-entries/${timeEntryId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Fetched entry data:', data) // Debug log
        console.log('jobNumber:', data.jobNumber) // Debug jobNumber specifically
        console.log('job_description:', data.job_description) // Debug description

        // Map API response to our interface
        const mappedEntry = {
          ...data,
          jobNumber: data.jobNumber, // Keep original
          jobTitle: data.jobTitle || data.job_description,
          userName: data.userName || data.user_name,
          rejectionReason: data.rejectionReason || data.rejection_reason,
        }

        console.log('Mapped entry:', mappedEntry) // Debug mapped entry

        setEntry(mappedEntry)
        setHours(data.hours?.toString() || '0')
        setDescription(data.description || '')
      } else {
        const errorText = await response.text()
        console.error('Failed to fetch entry:', errorText)
        setError('Failed to load time entry')
      }
    } catch (err) {
      console.error('Error fetching entry:', err)
      setError('Failed to load time entry')
    } finally {
      setLoading(false)
    }
  }

  const handleFix = () => {
    setEditMode(true)
    setError(null)
  }

  const handleResubmit = async () => {
    if (!entry) return

    try {
      setSubmitting(true)
      setError(null)

      // Format date properly - extract just YYYY-MM-DD if it's ISO format
      let dateForSubmit = entry.date
      if (entry.date.includes('T')) {
        dateForSubmit = entry.date.split('T')[0]
      }

      const response = await fetch(`/api/time-entries/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          jobId: entry.jobId,
          date: dateForSubmit,
          hours: parseFloat(hours),
          description: description || entry.description,
          status: 'submitted', // Re-submit for approval
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to resubmit time entry')
      }

      setSuccess('Time entry resubmitted successfully!')
      setEditMode(false)

      // Refresh entry data
      await fetchEntry()

      // Close dialog after short delay
      setTimeout(() => {
        setSuccess(null)
        onClose()
      }, 2000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resubmit time entry')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setEditMode(false)
    setError(null)
    setSuccess(null)
    onClose()
  }

  if (!open || !timeEntryId) return null

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            minHeight: '80vh',
            maxHeight: '90vh',
          }
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6">Fix Rejected Time Entry</Typography>
          <Chip label="Rejected" color="error" size="small" />
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
            <CircularProgress />
          </Box>
        ) : entry ? (
          <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
            {/* LEFT SIDE - Time Entry Details */}
            <Box sx={{ flex: 1 }}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Time Entry Details
                </Typography>

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                  </Alert>
                )}

                {success && (
                  <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
                    {success}
                  </Alert>
                )}

                <Stack spacing={2}>
                  {/* Job Info */}
                  <Box>
                    <Typography variant="caption" color="text.secondary">Job</Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {(() => {
                        const jobNum = entry.jobNumber || entry.job?.jobNumber
                        const jobDesc = entry.jobTitle || entry.job_description || entry.job?.description
                        if (jobNum && jobDesc) return `${jobNum} - ${jobDesc}`
                        if (jobNum) return jobNum
                        if (jobDesc) return jobDesc
                        return 'Job information not available'
                      })()}
                    </Typography>
                  </Box>

                  {/* Date */}
                  <Box>
                    <Typography variant="caption" color="text.secondary">Date</Typography>
                    <Typography variant="body1">
                      {(() => {
                        try {
                          if (!entry.date) return 'No date'
                          const dateStr = typeof entry.date === 'string' ? entry.date : String(entry.date)
                          // Check if date already has time component (ISO format)
                          const dateToFormat = dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00'
                          return format(new Date(dateToFormat), 'MMMM d, yyyy')
                        } catch (err) {
                          console.error('Date formatting error:', err, 'Date value:', entry.date)
                          return String(entry.date) || 'Invalid date'
                        }
                      })()}
                    </Typography>
                  </Box>

                  {/* Hours - Editable in fix mode */}
                  <Box>
                    <Typography variant="caption" color="text.secondary">Hours Worked</Typography>
                    {editMode ? (
                      <TextField
                        fullWidth
                        type="number"
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                        slotProps={{ htmlInput: { min: 0, max: 24, step: 0.25 } }}
                        size="small"
                        sx={{ mt: 0.5 }}
                      />
                    ) : (
                      <Typography variant="h4" color="primary">
                        {entry.hours} hrs
                      </Typography>
                    )}
                  </Box>

                  {/* Description - Editable in fix mode */}
                  <Box>
                    <Typography variant="caption" color="text.secondary">Description</Typography>
                    {editMode ? (
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        size="small"
                        sx={{ mt: 0.5 }}
                      />
                    ) : (
                      <Typography variant="body1">
                        {entry.description || 'No description'}
                      </Typography>
                    )}
                  </Box>

                  <Divider />

                  {/* Action Buttons */}
                  <Stack direction="row" spacing={2}>
                    {!editMode ? (
                      <Button
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={handleFix}
                        fullWidth
                      >
                        Fix Entry
                      </Button>
                    ) : (
                      <Button
                        variant="outlined"
                        onClick={() => {
                          setEditMode(false)
                          setHours(entry.hours.toString())
                          setDescription(entry.description || '')
                        }}
                        fullWidth
                      >
                        Cancel Edit
                      </Button>
                    )}

                    <Button
                      variant="contained"
                      startIcon={submitting ? <CircularProgress size={16} /> : <SendIcon />}
                      onClick={handleResubmit}
                      disabled={submitting || !hours || parseFloat(hours) <= 0}
                      fullWidth
                      sx={{
                        backgroundColor: '#00bf9a',
                        '&:hover': {
                          backgroundColor: '#00a884',
                        },
                      }}
                    >
                      {submitting ? 'Submitting...' : 'Re-submit Entry'}
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            </Box>

            {/* RIGHT SIDE - Rejection Thread */}
            <Box sx={{ flex: 1 }}>
              <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom>
                  💬 Discussion
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
                  Discuss this rejection with your admin
                </Typography>

                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                  <RejectionNotesThread
                    timeEntryId={entry.id}
                    onNewNote={() => {
                      // Optionally refresh entry data
                      fetchEntry()
                    }}
                  />
                </Box>
              </Paper>
            </Box>
          </Box>
        ) : (
          <Alert severity="error">Failed to load time entry</Alert>
        )}
      </DialogContent>
    </Dialog>
  )
}
