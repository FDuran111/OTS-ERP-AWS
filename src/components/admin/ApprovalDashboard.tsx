'use client'

import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Stack,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Avatar,
} from '@mui/material'
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  Work as JobIcon,
  Comment as CommentIcon,
} from '@mui/icons-material'
import { format } from 'date-fns'

interface PendingEntry {
  id: string
  userId: string
  userName: string
  userEmail: string
  jobId: string
  jobNumber: string
  jobTitle: string
  date: string
  hours: number
  regularHours: number
  overtimeHours: number
  doubleTimeHours: number
  estimatedPay: number
  status: string
  submittedAt: string
  submittedBy: string
  description?: string
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`approval-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  )
}

interface ApprovalDashboardProps {
  onCountChange?: (count: number) => void
  isVisible?: boolean
}

export default function ApprovalDashboard({ onCountChange, isVisible }: ApprovalDashboardProps = {}) {
  const [pendingEntries, setPendingEntries] = useState<PendingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [tabValue, setTabValue] = useState(0)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<PendingEntry | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser))
    }
    fetchPendingEntries()
  }, [])

  // Reload data when tab becomes visible
  useEffect(() => {
    if (isVisible) {
      fetchPendingEntries()
    }
  }, [isVisible])

  const fetchPendingEntries = async () => {
    setLoading(true)
    try {
      // Fetch all submitted entries
      const response = await fetch('/api/time-entries?status=submitted', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setPendingEntries(data)
        // Update parent count
        if (onCountChange) {
          onCountChange(data.length)
        }
      }
    } catch (error) {
      console.error('Error fetching pending entries:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (entry: PendingEntry) => {
    try {
      const response = await fetch(`/api/time-entries/${entry.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          approvedBy: currentUser?.id,
        }),
      })

      if (response.ok) {
        setSuccessMessage(`Approved time entry for ${entry.userName}`)
        fetchPendingEntries()
        setTimeout(() => setSuccessMessage(''), 3000)
      }
    } catch (error) {
      console.error('Error approving entry:', error)
    }
  }

  const handleReject = async () => {
    if (!selectedEntry) return

    try {
      const response = await fetch(`/api/time-entries/${selectedEntry.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          rejectedBy: currentUser?.id,
          rejectionReason,
        }),
      })

      if (response.ok) {
        setSuccessMessage(`Rejected time entry for ${selectedEntry.userName}`)
        setRejectDialogOpen(false)
        setSelectedEntry(null)
        setRejectionReason('')
        fetchPendingEntries()
        setTimeout(() => setSuccessMessage(''), 3000)
      }
    } catch (error) {
      console.error('Error rejecting entry:', error)
    }
  }

  const handleBulkApprove = async () => {
    if (!confirm(`Approve all ${pendingEntries.length} pending entries?`)) return

    try {
      for (const entry of pendingEntries) {
        await fetch(`/api/time-entries/${entry.id}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            approvedBy: currentUser?.id,
          }),
        })
      }
      setSuccessMessage(`Approved ${pendingEntries.length} entries`)
      fetchPendingEntries()
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error bulk approving:', error)
    }
  }

  // Group entries by user for better display
  const groupedByUser = pendingEntries.reduce((acc, entry) => {
    if (!acc[entry.userId]) {
      acc[entry.userId] = {
        user: { id: entry.userId, name: entry.userName, email: entry.userEmail },
        entries: [],
        totalHours: 0,
        totalPay: 0,
      }
    }
    acc[entry.userId].entries.push(entry)
    acc[entry.userId].totalHours += entry.hours
    acc[entry.userId].totalPay += entry.estimatedPay
    return acc
  }, {} as Record<string, any>)

  const userGroups = Object.values(groupedByUser)

  return (
    <Card>
      <CardContent>
        {pendingEntries.length > 0 && (
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
            <Button
              variant="contained"
              color="success"
              startIcon={<ApproveIcon />}
              onClick={handleBulkApprove}
              size="small"
            >
              Approve All ({pendingEntries.length})
            </Button>
          </Stack>
        )}

        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        )}

        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
          <Tab label={`Pending (${pendingEntries.length})`} />
          <Tab label="By Employee" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : pendingEntries.length === 0 ? (
            <Alert severity="info">No entries pending approval</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Job</TableCell>
                    <TableCell align="right">Hours</TableCell>
                    <TableCell align="right">Pay</TableCell>
                    <TableCell>Submitted</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingEntries.map((entry) => (
                    <TableRow key={entry.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar sx={{ width: 24, height: 24 }}>
                            {entry.userName.charAt(0)}
                          </Avatar>
                          <Typography variant="body2">{entry.userName}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {format(new Date(entry.date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {entry.jobNumber} - {entry.jobTitle}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack alignItems="flex-end" spacing={0}>
                          <Typography variant="body2" fontWeight="bold">
                            {entry.hours.toFixed(2)}h
                          </Typography>
                          {entry.overtimeHours > 0 && (
                            <Typography variant="caption" color="warning.main">
                              OT: {entry.overtimeHours.toFixed(2)}h
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          ${entry.estimatedPay.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {entry.submittedAt ? format(new Date(entry.submittedAt), 'MMM dd h:mm a') : 'Not submitted'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleApprove(entry)}
                          >
                            <ApproveIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setSelectedEntry(entry)
                              setRejectDialogOpen(true)
                            }}
                          >
                            <RejectIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {userGroups.length === 0 ? (
            <Alert severity="info">No entries pending approval</Alert>
          ) : (
            <Stack spacing={2}>
              {userGroups.map((group) => (
                <Card key={group.user.id} variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar>{group.user.name.charAt(0)}</Avatar>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {group.user.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {group.entries.length} entries • {group.totalHours.toFixed(2)} hours • ${group.totalPay.toFixed(2)}
                          </Typography>
                        </Box>
                      </Stack>
                      <Button
                        variant="contained"
                        size="small"
                        color="success"
                        startIcon={<ApproveIcon />}
                        onClick={() => {
                          group.entries.forEach((entry: PendingEntry) => handleApprove(entry))
                        }}
                      >
                        Approve All
                      </Button>
                    </Stack>

                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Job</TableCell>
                            <TableCell align="right">Hours</TableCell>
                            <TableCell align="right">Pay</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {group.entries.map((entry: PendingEntry) => (
                            <TableRow key={entry.id}>
                              <TableCell>{format(new Date(entry.date), 'MMM dd')}</TableCell>
                              <TableCell>{entry.jobNumber}</TableCell>
                              <TableCell align="right">{entry.hours.toFixed(2)}h</TableCell>
                              <TableCell align="right">${entry.estimatedPay.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </TabPanel>

        {/* Rejection Dialog */}
        <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Reject Time Entry</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Rejecting entry for {selectedEntry?.userName} - {selectedEntry?.hours} hours on{' '}
              {selectedEntry && format(new Date(selectedEntry.date), 'MMM dd, yyyy')}
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Reason for Rejection"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please explain why this entry is being rejected..."
              required
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleReject}
              color="error"
              variant="contained"
              disabled={!rejectionReason.trim()}
            >
              Reject Entry
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  )
}