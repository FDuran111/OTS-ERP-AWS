'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Snackbar,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  Grid,
  Stack,
  Divider,
} from '@mui/material'
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  CalendarToday as CalendarIcon,
  Schedule as HoursIcon,
} from '@mui/icons-material'
import ResponsiveLayout from '@/components/layout/ResponsiveLayout'
import ResponsiveContainer from '@/components/layout/ResponsiveContainer'
import { useAuthCheck } from '@/hooks/useAuthCheck'

interface NewJobEntry {
  id: string
  userId: string
  userName: string
  userEmail: string
  jobNumber: string
  customer: string
  description: string
  date: string
  hours: number
  workDescription: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
}

interface Job {
  id: string
  jobNumber: string
  description: string
  customer_name: string
}

export default function NewJobReviewPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuthCheck()
  const [entries, setEntries] = useState<NewJobEntry[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [snackbar, setSnackbar] = useState<{open: boolean, message: string, severity: 'success' | 'error'}>({
    open: false,
    message: '',
    severity: 'success'
  })

  // Dialog states
  const [approveDialog, setApproveDialog] = useState<{open: boolean, entry: NewJobEntry | null}>({
    open: false,
    entry: null
  })
  const [rejectDialog, setRejectDialog] = useState<{open: boolean, entry: NewJobEntry | null}>({
    open: false,
    entry: null
  })

  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    if (!authLoading && user) {
      if (!['OWNER_ADMIN', 'FOREMAN'].includes(user.role)) {
        router.push('/dashboard')
        return
      }
      fetchData()
    }
  }, [authLoading, user])

  const fetchData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth-token')
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {}

      // Fetch pending new job entries
      const entriesResponse = await fetch('/api/time-entries/new-job?status=PENDING', {
        headers: authHeaders,
        credentials: 'include'
      })

      // Fetch all jobs for selection during approval
      const jobsResponse = await fetch('/api/jobs', {
        headers: authHeaders,
        credentials: 'include'
      })

      if (entriesResponse.ok) {
        const entriesData = await entriesResponse.json()
        setEntries(Array.isArray(entriesData) ? entriesData : [])
      }

      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json()
        setJobs(Array.isArray(jobsData) ? jobsData : [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setSnackbar({
        open: true,
        message: 'Failed to load data',
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApproveClick = (entry: NewJobEntry) => {
    setApproveDialog({ open: true, entry })
    // Try to find matching job by job number
    const matchingJob = jobs.find(j =>
      j.jobNumber.toLowerCase() === entry.jobNumber.toLowerCase()
    )
    setSelectedJob(matchingJob || null)
  }

  const handleRejectClick = (entry: NewJobEntry) => {
    setRejectDialog({ open: true, entry })
    setRejectionReason('')
  }

  const handleApprove = async () => {
    if (!approveDialog.entry || !selectedJob) {
      setSnackbar({
        open: true,
        message: 'Please select a job to link this time entry to',
        severity: 'error'
      })
      return
    }

    try {
      const token = localStorage.getItem('auth-token')
      const response = await fetch('/api/time-entries/new-job', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({
          id: approveDialog.entry.id,
          status: 'APPROVED',
          jobId: selectedJob.id,
          approvedBy: user?.id
        })
      })

      if (response.ok) {
        setSnackbar({
          open: true,
          message: `Time entry approved and created for ${selectedJob.jobNumber}`,
          severity: 'success'
        })
        setApproveDialog({ open: false, entry: null })
        setSelectedJob(null)
        fetchData()
      } else {
        throw new Error('Failed to approve entry')
      }
    } catch (error) {
      console.error('Error approving entry:', error)
      setSnackbar({
        open: true,
        message: 'Failed to approve entry',
        severity: 'error'
      })
    }
  }

  const handleReject = async () => {
    if (!rejectDialog.entry) return

    if (!rejectionReason.trim()) {
      setSnackbar({
        open: true,
        message: 'Please provide a reason for rejection',
        severity: 'error'
      })
      return
    }

    try {
      const token = localStorage.getItem('auth-token')
      const response = await fetch('/api/time-entries/new-job', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({
          id: rejectDialog.entry.id,
          status: 'REJECTED',
          rejectionReason,
          approvedBy: user?.id
        })
      })

      if (response.ok) {
        setSnackbar({
          open: true,
          message: 'Entry rejected and employee will be notified',
          severity: 'success'
        })
        setRejectDialog({ open: false, entry: null })
        setRejectionReason('')
        fetchData()
      } else {
        throw new Error('Failed to reject entry')
      }
    } catch (error) {
      console.error('Error rejecting entry:', error)
      setSnackbar({
        open: true,
        message: 'Failed to reject entry',
        severity: 'error'
      })
    }
  }

  if (authLoading) {
    return (
      <ResponsiveLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <Typography>Loading...</Typography>
        </Box>
      </ResponsiveLayout>
    )
  }

  if (!user || !['OWNER_ADMIN', 'FOREMAN'].includes(user.role)) {
    return null
  }

  return (
    <ResponsiveLayout>
      <ResponsiveContainer>
        <Box sx={{ py: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton onClick={() => router.push('/time')} sx={{ mr: 2 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              Employee New Job Requests
            </Typography>
            {entries.length > 0 && (
              <Chip
                label={`${entries.length} Pending`}
                color="warning"
                sx={{ ml: 2 }}
              />
            )}
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            Employees have requested to create new jobs. Review each request and either approve it by linking to an existing job, or reject it with a reason.
          </Alert>

          {entries.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 8 }}>
                <WorkIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Pending New Job Requests
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  All employee requests have been reviewed
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => router.push('/time')}
                  sx={{ mt: 3 }}
                >
                  Back to Time Tracking
                </Button>
              </CardContent>
            </Card>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell>Job Number</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Hours</TableCell>
                    <TableCell>Submitted</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {entry.userName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {entry.userEmail}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={entry.jobNumber} size="small" />
                      </TableCell>
                      <TableCell>{entry.customer}</TableCell>
                      <TableCell>
                        {new Date(entry.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{entry.hours}h</TableCell>
                      <TableCell>
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          <Button
                            variant="contained"
                            size="small"
                            color="success"
                            startIcon={<ApproveIcon />}
                            onClick={() => handleApproveClick(entry)}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            color="error"
                            startIcon={<RejectIcon />}
                            onClick={() => handleRejectClick(entry)}
                          >
                            Reject
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>

        {/* Approve Dialog */}
        <Dialog
          open={approveDialog.open}
          onClose={() => setApproveDialog({ open: false, entry: null })}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Approve New Job Request</DialogTitle>
          <DialogContent>
            {approveDialog.entry && (
              <Box sx={{ pt: 2 }}>
                <Alert severity="warning" sx={{ mb: 3 }}>
                  This will create a time entry for the selected job. Make sure the job exists or create it first.
                </Alert>

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Request Details
                        </Typography>
                        <Stack spacing={1.5} sx={{ mt: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PersonIcon fontSize="small" color="action" />
                            <Typography variant="body2">
                              <strong>Employee:</strong> {approveDialog.entry.userName}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <WorkIcon fontSize="small" color="action" />
                            <Typography variant="body2">
                              <strong>Job Number:</strong> {approveDialog.entry.jobNumber}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PersonIcon fontSize="small" color="action" />
                            <Typography variant="body2">
                              <strong>Customer:</strong> {approveDialog.entry.customer}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CalendarIcon fontSize="small" color="action" />
                            <Typography variant="body2">
                              <strong>Date:</strong> {new Date(approveDialog.entry.date).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <HoursIcon fontSize="small" color="action" />
                            <Typography variant="body2">
                              <strong>Hours:</strong> {approveDialog.entry.hours}h
                            </Typography>
                          </Box>
                          {approveDialog.entry.description && (
                            <Box>
                              <Typography variant="body2">
                                <strong>Job Description:</strong>
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {approveDialog.entry.description}
                              </Typography>
                            </Box>
                          )}
                          {approveDialog.entry.workDescription && (
                            <Box>
                              <Typography variant="body2">
                                <strong>Work Description:</strong>
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {approveDialog.entry.workDescription}
                              </Typography>
                            </Box>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" gutterBottom>
                      Select Existing Job
                    </Typography>
                    <Autocomplete
                      options={jobs}
                      getOptionLabel={(option) => `${option.jobNumber} - ${option.customer_name} - ${option.description}`}
                      value={selectedJob}
                      onChange={(_, value) => setSelectedJob(value)}
                      renderOption={(props, option) => {
                        const { key, ...otherProps } = props as any
                        return (
                          <li key={key} {...otherProps}>
                            <Box>
                              <Typography variant="body2">
                                <strong>{option.jobNumber}</strong> - {option.description}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Customer: {option.customer_name}
                              </Typography>
                            </Box>
                          </li>
                        )
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Link to Job"
                          required
                          helperText="Search and select the job this time entry should be linked to"
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setApproveDialog({ open: false, entry: null })}>
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              variant="contained"
              color="success"
              disabled={!selectedJob}
            >
              Approve & Create Time Entry
            </Button>
          </DialogActions>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog
          open={rejectDialog.open}
          onClose={() => setRejectDialog({ open: false, entry: null })}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Reject New Job Request</DialogTitle>
          <DialogContent>
            {rejectDialog.entry && (
              <Box sx={{ pt: 2 }}>
                <Alert severity="info" sx={{ mb: 3 }}>
                  This will reject the request and notify {rejectDialog.entry.userName}. Please provide a clear reason.
                </Alert>

                <Typography variant="subtitle2" gutterBottom>
                  Request: {rejectDialog.entry.jobNumber} - {rejectDialog.entry.customer}
                </Typography>

                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Rejection Reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                  sx={{ mt: 2 }}
                  placeholder="e.g., Job number already exists, need more details, etc."
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRejectDialog({ open: false, entry: null })}>
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              variant="contained"
              color="error"
              disabled={!rejectionReason.trim()}
            >
              Reject Request
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </ResponsiveContainer>
    </ResponsiveLayout>
  )
}
