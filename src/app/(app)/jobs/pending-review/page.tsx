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
  List,
  ListItem,
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
} from '@mui/material'
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as ApproveIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material'
import ResponsiveLayout from '@/components/layout/ResponsiveLayout'
import ResponsiveContainer from '@/components/layout/ResponsiveContainer'
import { useAuthCheck } from '@/hooks/useAuthCheck'

interface PendingJob {
  id: string
  jobNumber: string
  description: string
  customer_name: string
  status: string
  updatedAt: string
  address?: string
  city?: string
  billedAmount?: number
}

export default function PendingReviewJobsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuthCheck()
  const [jobs, setJobs] = useState<PendingJob[]>([])
  const [loading, setLoading] = useState(true)
  const [snackbar, setSnackbar] = useState<{open: boolean, message: string, severity: 'success' | 'error'}>({
    open: false,
    message: '',
    severity: 'success'
  })
  const [approveDialog, setApproveDialog] = useState<{open: boolean, job: PendingJob | null}>({
    open: false,
    job: null
  })
  const [approvalNotes, setApprovalNotes] = useState('')
  const [billedAmount, setBilledAmount] = useState('')

  useEffect(() => {
    if (!authLoading && user) {
      if (!['OWNER_ADMIN', 'FOREMAN'].includes(user.role)) {
        router.push('/dashboard')
        return
      }
      fetchPendingJobs()
    }
  }, [authLoading, user])

  const fetchPendingJobs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/jobs?status=PENDING_REVIEW')

      if (!response.ok) {
        throw new Error('Failed to fetch pending jobs')
      }

      const data = await response.json()
      // The API returns an array directly, not an object with jobs property
      setJobs(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching pending jobs:', error)
      setSnackbar({
        open: true,
        message: 'Failed to load pending jobs',
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApproveClick = (job: PendingJob) => {
    setApproveDialog({ open: true, job })
    setBilledAmount(job.billedAmount?.toString() || '')
    setApprovalNotes(`Job approved and closed by ${user?.name}`)
  }

  const handleApproveJob = async () => {
    if (!approveDialog.job) return

    // Store for rollback
    const previousJobs = [...jobs]
    const jobToApprove = approveDialog.job

    // Optimistic update - immediately remove from list
    setJobs(prev => prev.filter(j => j.id !== jobToApprove.id))
    setSnackbar({
      open: true,
      message: `Job #${jobToApprove.jobNumber} successfully closed!`,
      severity: 'success'
    })
    setApproveDialog({ open: false, job: null })
    setApprovalNotes('')
    setBilledAmount('')

    try {
      const response = await fetch(`/api/jobs/${jobToApprove.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: approvalNotes,
          billedAmount: billedAmount ? parseFloat(billedAmount) : undefined,
        })
      })

      if (!response.ok) {
        throw new Error('Failed to approve job')
      }
    } catch (error) {
      console.error('Error approving job:', error)
      // Rollback on failure
      setJobs(previousJobs)
      setSnackbar({
        open: true,
        message: 'Failed to approve job',
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
            <IconButton onClick={() => router.push('/dashboard')} sx={{ mr: 2 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              Jobs Marked Done
            </Typography>
            {jobs.length > 0 && (
              <Chip
                label={`${jobs.length} Pending`}
                color="warning"
                sx={{ ml: 2 }}
              />
            )}
          </Box>

          {jobs.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Jobs Pending Closure
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  All jobs have been reviewed and closed
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => router.push('/dashboard')}
                  sx={{ mt: 3 }}
                >
                  Back to Dashboard
                </Button>
              </CardContent>
            </Card>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Job Number</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Marked Done</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id} hover>
                      <TableCell>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          #{job.jobNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>{job.description}</TableCell>
                      <TableCell>{job.customer_name}</TableCell>
                      <TableCell>
                        {job.city ? `${job.city}${job.address ? `, ${job.address}` : ''}` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {new Date(job.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          <Button
                            variant="contained"
                            size="small"
                            color="success"
                            startIcon={<ApproveIcon />}
                            onClick={() => handleApproveClick(job)}
                          >
                            Approve & Close
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<ViewIcon />}
                            onClick={() => router.push(`/jobs/${job.id}`)}
                          >
                            View
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

        {/* Approval Dialog */}
        <Dialog
          open={approveDialog.open}
          onClose={() => setApproveDialog({ open: false, job: null })}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Approve and Close Job</DialogTitle>
          <DialogContent>
            {approveDialog.job && (
              <Box sx={{ pt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Job #{approveDialog.job.jobNumber}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {approveDialog.job.description}
                </Typography>
                <TextField
                  fullWidth
                  label="Billed Amount ($)"
                  type="number"
                  value={billedAmount}
                  onChange={(e) => setBilledAmount(e.target.value)}
                  sx={{ mt: 3, mb: 2 }}
                  slotProps={{
                    input: {
                      startAdornment: '$',
                    }
                  }}
                />
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Closure Notes"
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setApproveDialog({ open: false, job: null })}>
              Cancel
            </Button>
            <Button
              onClick={handleApproveJob}
              variant="contained"
              color="success"
            >
              Approve & Close
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