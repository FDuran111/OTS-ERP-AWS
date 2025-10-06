'use client'

import React, { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
} from '@mui/material'
import {
  Check,
  Close,
  Visibility,
} from '@mui/icons-material'
import { format } from 'date-fns'

interface PendingEntry {
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
  status: string
  createdAt: string
}

export default function PendingJobEntries() {
  const [pendingEntries, setPendingEntries] = useState<PendingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [approvalDialog, setApprovalDialog] = useState<{
    open: boolean
    entry: PendingEntry | null
    action: 'approve' | 'reject'
  }>({ open: false, entry: null, action: 'approve' })
  const [selectedJobId, setSelectedJobId] = useState('')
  const [existingJobs, setExistingJobs] = useState<any[]>([])

  useEffect(() => {
    fetchPendingEntries()
    fetchExistingJobs()
  }, [])

  const fetchPendingEntries = async () => {
    try {
      const response = await fetch('/api/time-entries/new-job?status=PENDING')
      if (response.ok) {
        const data = await response.json()
        setPendingEntries(data)
      } else {
        // Handle error silently - table doesn't exist yet
        setPendingEntries([])
      }
    } catch (error) {
      // Handle error silently - table doesn't exist yet
      setPendingEntries([])
    } finally {
      setLoading(false)
    }
  }

  const fetchExistingJobs = async () => {
    try {
      const response = await fetch('/api/jobs')
      if (response.ok) {
        const data = await response.json()
        setExistingJobs(data)
      }
    } catch (error) {
      console.error('Error fetching jobs:', error)
    }
  }

  const handleAction = (entry: PendingEntry, action: 'approve' | 'reject') => {
    setApprovalDialog({ open: true, entry, action })
    setSelectedJobId('')
  }

  const confirmAction = async () => {
    if (!approvalDialog.entry) return

    try {
      const response = await fetch('/api/time-entries/new-job', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: approvalDialog.entry.id,
          status: approvalDialog.action === 'approve' ? 'APPROVED' : 'REJECTED',
          jobId: approvalDialog.action === 'approve' ? selectedJobId : null,
        }),
      })

      if (response.ok) {
        // Remove from pending list
        setPendingEntries(prev => prev.filter(e => e.id !== approvalDialog.entry?.id))
        setApprovalDialog({ open: false, entry: null, action: 'approve' })
      }
    } catch (error) {
      console.error('Error processing entry:', error)
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Pending New Job Entries
      </Typography>

      {pendingEntries.length === 0 ? (
        <Alert severity="info">
          No pending new job entries to review.
        </Alert>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Job Number</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Hours</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendingEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <Typography variant="body2">{entry.userName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {entry.userEmail}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={entry.jobNumber} size="small" />
                  </TableCell>
                  <TableCell>{entry.customer}</TableCell>
                  <TableCell>
                    {format(new Date(entry.date + 'T00:00:00'), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>{entry.hours}</TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{
                      maxWidth: 200,
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {entry.workDescription || entry.description || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {format(new Date(entry.createdAt), 'MMM d, h:mm a')}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="success"
                      onClick={() => handleAction(entry, 'approve')}
                      title="Approve"
                    >
                      <Check />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleAction(entry, 'reject')}
                      title="Reject"
                    >
                      <Close />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Approval Dialog */}
      <Dialog open={approvalDialog.open} onClose={() => setApprovalDialog({ ...approvalDialog, open: false })}>
        <DialogTitle>
          {approvalDialog.action === 'approve' ? 'Approve' : 'Reject'} New Job Entry
        </DialogTitle>
        <DialogContent>
          {approvalDialog.entry && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Employee:</strong> {approvalDialog.entry.userName}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Job Number:</strong> {approvalDialog.entry.jobNumber}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Customer:</strong> {approvalDialog.entry.customer}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Date:</strong> {format(new Date(approvalDialog.entry.date + 'T00:00:00'), 'MMM d, yyyy')}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Hours:</strong> {approvalDialog.entry.hours}
              </Typography>

              {approvalDialog.action === 'approve' && (
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Select Existing Job or Create New</InputLabel>
                  <Select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    label="Select Existing Job or Create New"
                  >
                    <MenuItem value="CREATE_NEW">
                      <em>Create New Job</em>
                    </MenuItem>
                    {existingJobs.map((job) => (
                      <MenuItem key={job.id} value={job.id}>
                        {job.jobNumber} - {job.title}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialog({ ...approvalDialog, open: false })}>
            Cancel
          </Button>
          <Button
            onClick={confirmAction}
            color={approvalDialog.action === 'approve' ? 'success' : 'error'}
            variant="contained"
            disabled={approvalDialog.action === 'approve' && !selectedJobId}
          >
            {approvalDialog.action === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}