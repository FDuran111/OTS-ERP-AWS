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
  CircularProgress,
  Alert,
} from '@mui/material'
import {
  Check,
} from '@mui/icons-material'
import { format } from 'date-fns'

interface PendingEntry {
  id: string
  jobId: string
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
  const [pendingJobs, setPendingJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPendingEntries()
  }, [])

  const fetchPendingEntries = async () => {
    try {
      // First, fetch pending jobs to get their IDs
      const pendingJobsResponse = await fetch('/api/jobs/pending', {
        credentials: 'include'
      })

      if (!pendingJobsResponse.ok) {
        setPendingEntries([])
        setPendingJobs([])
        setLoading(false)
        return
      }

      const jobs = await pendingJobsResponse.json()
      setPendingJobs(jobs)
      const pendingJobIds = new Set(jobs.map((job: any) => job.id))

      // Then fetch all time entries
      const entriesResponse = await fetch('/api/time-entries?status=draft', {
        credentials: 'include'
      })

      if (entriesResponse.ok) {
        const allEntries = await entriesResponse.json()
        // Filter to only show entries linked to pending jobs
        const filteredEntries = allEntries.filter((entry: any) =>
          entry.jobId && pendingJobIds.has(entry.jobId)
        )
        setPendingEntries(filteredEntries)
      } else {
        setPendingEntries([])
      }
    } catch (error) {
      console.error('Error fetching pending entries:', error)
      setPendingEntries([])
      setPendingJobs([])
    } finally {
      setLoading(false)
    }
  }

  const handleApproveJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newStatus: 'SCHEDULED' })
      })

      if (response.ok) {
        alert('✅ Job approved! Time entries are now visible.')
        // Refresh the list
        fetchPendingEntries()
      } else {
        alert('Failed to approve job. Please try again.')
      }
    } catch (error) {
      console.error('Error approving job:', error)
      alert('Failed to approve job. Please try again.')
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
        <>
          <Alert severity="warning" sx={{ mb: 2 }}>
            These time entries are linked to jobs with PENDING status. Approve the associated job to make these entries visible in time tracking.
          </Alert>
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
                      <Chip label={entry.jobNumber} size="small" color="warning" />
                    </TableCell>
                    <TableCell>{entry.customer}</TableCell>
                    <TableCell>
                      {format(new Date(entry.date + 'T00:00:00'), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>{entry.hours} hrs</TableCell>
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
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={<Check />}
                        onClick={() => handleApproveJob(entry.jobId)}
                      >
                        Approve Job
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Paper>
  )
}