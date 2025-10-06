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
  Chip,
  Stack,
  IconButton,
  Button,
} from '@mui/material'
import {
  NavigateBefore,
  NavigateNext,
  Edit as EditIcon,
  CheckCircle as ApproveIcon,
  Send as SubmitIcon,
  Add as AddIcon,
} from '@mui/icons-material'
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks } from 'date-fns'
import HoursBreakdownDisplay from './HoursBreakdownDisplay'

interface TimesheetEntry {
  id: string
  jobId: string
  jobNumber: string
  jobTitle: string
  customer: string
  date: string
  hours: number
  regularHours?: number
  overtimeHours?: number
  doubleTimeHours?: number
  estimatedPay?: number
  description?: string
  status?: 'draft' | 'submitted' | 'approved' | 'rejected'
  submittedAt?: string
  submittedBy?: string
  approvedAt?: string
  approvedBy?: string
  rejectedAt?: string
  rejectedBy?: string
  rejectionReason?: string
}

interface WeeklyTimesheetDisplayProps {
  userId?: string
  isAdmin?: boolean
  selectedUserId?: string // For admin viewing other users
  onEditEntry?: (entry: TimesheetEntry) => void
  onRefresh?: () => void
}

export default function WeeklyTimesheetDisplay({
  userId,
  isAdmin = false,
  selectedUserId,
  onEditEntry,
  onRefresh
}: WeeklyTimesheetDisplayProps) {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [entries, setEntries] = useState<TimesheetEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [weekStatus, setWeekStatus] = useState<'draft' | 'submitted' | 'approved'>('draft')
  const [editMode, setEditMode] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const weekDates = weekDays.map((_, index) => addDays(currentWeek, index))

  // Get current user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser))
    }
  }, [])

  useEffect(() => {
    fetchWeekData()
  }, [currentWeek, selectedUserId])

  const fetchWeekData = async () => {
    setLoading(true)
    try {
      const targetUserId = isAdmin && selectedUserId ? selectedUserId : userId
      const weekStart = format(currentWeek, 'yyyy-MM-dd')
      const weekEnd = format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd')

      const response = await fetch(
        `/api/time-entries?userId=${targetUserId}&startDate=${weekStart}&endDate=${weekEnd}`,
        { credentials: 'include' }
      )

      if (response.ok) {
        const data = await response.json()
        setEntries(data)

        // Check status based on entries
        const allApproved = data.length > 0 && data.every((e: TimesheetEntry) => e.status === 'approved' || e.approvedAt)
        const anySubmitted = data.some((e: TimesheetEntry) => e.status === 'submitted')
        const anyApproved = data.some((e: TimesheetEntry) => e.status === 'approved' || e.approvedAt)

        if (allApproved) {
          setWeekStatus('approved')
        } else if (anySubmitted) {
          setWeekStatus('submitted')
        } else {
          setWeekStatus('draft')
        }
      }
    } catch (error) {
      console.error('Error fetching week data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Group entries by job
  const groupedEntries = entries.reduce((acc, entry) => {
    const key = `${entry.jobId}`
    if (!acc[key]) {
      acc[key] = {
        jobId: entry.jobId,
        jobNumber: entry.jobNumber,
        jobTitle: entry.jobTitle,
        customer: entry.customer,
        days: {} as Record<string, { hours: number, id: string, approved: boolean }>
      }
    }

    const dayIndex = new Date(entry.date + 'T00:00:00').getDay()
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayIndex]

    acc[key].days[dayName] = {
      hours: entry.hours,
      id: entry.id,
      approved: !!entry.approvedAt
    }

    return acc
  }, {} as Record<string, any>)

  const jobRows = Object.values(groupedEntries)

  const calculateDayTotal = (dayName: string): number => {
    return jobRows.reduce((sum, job) => {
      return sum + (job.days[dayName]?.hours || 0)
    }, 0)
  }

  const calculateJobTotal = (job: any): number => {
    return Object.values(job.days).reduce((sum: number, day: any) => sum + (day?.hours || 0), 0)
  }

  const calculateWeekTotal = (): number => {
    return entries.reduce((sum, entry) => sum + entry.hours, 0)
  }

  // Calculate weekly hours breakdown
  const calculateWeekBreakdown = () => {
    const regularHours = entries.reduce((sum, entry) => sum + (entry.regularHours || 0), 0)
    const overtimeHours = entries.reduce((sum, entry) => sum + (entry.overtimeHours || 0), 0)
    const doubleTimeHours = entries.reduce((sum, entry) => sum + (entry.doubleTimeHours || 0), 0)
    const totalEarnings = entries.reduce((sum, entry) => sum + (entry.estimatedPay || 0), 0)
    return { regularHours, overtimeHours, doubleTimeHours, totalEarnings }
  }

  const weekBreakdown = calculateWeekBreakdown()

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this time entry?')) return

    try {
      const response = await fetch(`/api/time-entries/${entryId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        fetchWeekData()
        if (onRefresh) onRefresh()
      }
    } catch (error) {
      console.error('Error deleting entry:', error)
    }
  }

  const handleSubmitWeek = async () => {
    if (!confirm('Submit this week for approval? You won\'t be able to edit after submission.')) return

    try {
      // Mark all entries as submitted
      for (const entry of entries) {
        await fetch(`/api/time-entries/${entry.id}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            submittedBy: currentUser?.id
          })
        })
      }

      fetchWeekData()
      if (onRefresh) onRefresh()
    } catch (error) {
      console.error('Error submitting week:', error)
    }
  }

  const handleApproveWeek = async () => {
    if (!confirm('Approve all entries for this week?')) return

    try {
      // Admin approving all entries
      for (const entry of entries) {
        await fetch(`/api/time-entries/${entry.id}/approve`, {
          method: 'POST',
          credentials: 'include'
        })
      }

      fetchWeekData()
      if (onRefresh) onRefresh()
    } catch (error) {
      console.error('Error approving week:', error)
    }
  }

  return (
    <Paper sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Stack direction="row" spacing={2} alignItems="center">
          <IconButton onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
            <NavigateBefore />
          </IconButton>
          <Typography variant="h6">
            Week of {format(currentWeek, 'MMM d')} - {format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM d, yyyy')}
          </Typography>
          <IconButton onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
            <NavigateNext />
          </IconButton>
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center">
          <Chip
            label={weekStatus.toUpperCase()}
            color={
              weekStatus === 'approved' ? 'success' :
              weekStatus === 'submitted' ? 'warning' : 'default'
            }
          />

          {/* Edit button for employees on their own timesheet */}
          {!isAdmin && weekStatus === 'draft' && entries.length > 0 && (
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => setEditMode(!editMode)}
                size="small"
                color={editMode ? 'primary' : 'inherit'}
              >
                {editMode ? 'Done Editing' : 'Edit'}
              </Button>
              <Button
                variant="contained"
                startIcon={<SubmitIcon />}
                onClick={handleSubmitWeek}
                size="small"
              >
                Submit Week
              </Button>
            </Stack>
          )}

          {/* Edit button for admins viewing employee timesheets - always show */}
          {isAdmin && (
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => setEditMode(!editMode)}
                size="small"
                color={editMode ? 'primary' : 'inherit'}
              >
                {editMode ? 'Done Editing' : 'Edit'}
              </Button>

              {/* New Entry button - only show in edit mode when there are entries */}
              {editMode && entries.length > 0 && onEditEntry && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    // Create a new entry without a specific job or date (will default to today)
                    const newEntry = {
                      id: '', // Empty ID indicates new entry
                      jobId: '', // Empty job ID - user will select
                      jobNumber: '',
                      jobTitle: '',
                      customer: '',
                      date: '', // Empty date - will default to today in the form
                      hours: 0,
                      description: ''
                    } as TimesheetEntry
                    onEditEntry(newEntry)
                  }}
                  size="small"
                  color="success"
                >
                  New Entry
                </Button>
              )}
            </Stack>
          )}

          {isAdmin && weekStatus === 'submitted' && (
            <Button
              variant="contained"
              color="success"
              startIcon={<ApproveIcon />}
              onClick={handleApproveWeek}
              size="small"
            >
              Approve All
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Timesheet Grid */}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 250 }}>Job</TableCell>
              {weekDays.map((day, index) => (
                <TableCell key={day} align="center" sx={{ minWidth: 80 }}>
                  <Typography variant="caption" display="block" fontWeight="bold">
                    {day.substring(0, 3)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {format(weekDates[index], 'MM/dd')}
                  </Typography>
                </TableCell>
              ))}
              <TableCell align="center" sx={{ minWidth: 80 }}>Total</TableCell>
              <TableCell align="center" width={80}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {jobRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                  <Stack spacing={2} alignItems="center">
                    <Typography color="text.secondary">
                      No time entries for this week
                    </Typography>
                    {editMode && onEditEntry && (
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => {
                          // Create a new entry without a specific job or date (will default to today)
                          const newEntry = {
                            id: '', // Empty ID indicates new entry
                            jobId: '', // Empty job ID - user will select
                            jobNumber: '',
                            jobTitle: '',
                            customer: '',
                            date: '', // Empty date - will default to today in the form
                            hours: 0,
                            description: ''
                          } as TimesheetEntry
                          onEditEntry(newEntry)
                        }}
                        size="small"
                      >
                        Add Time Entry
                      </Button>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ) : (
              jobRows.map((job) => (
                <TableRow key={job.jobId} hover>
                  <TableCell>
                    <Stack>
                      <Typography variant="body2" fontWeight="bold">
                        {job.jobNumber}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {job.jobTitle}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {job.customer}
                      </Typography>
                    </Stack>
                  </TableCell>

                  {weekDays.map((day, dayIndex) => {
                    const dayKey = day.toLowerCase()
                    const dayData = job.days[dayKey]

                    // Calculate if this day is editable (within 14 days)
                    const dayDate = weekDates[dayIndex]
                    const today = new Date()
                    const daysDifference = Math.floor((today.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24))
                    const isEditable = isAdmin || daysDifference <= 14

                    return (
                      <TableCell key={day} align="center">
                        {dayData ? (
                          <Box
                            onClick={() => {
                              // Admins can always edit, employees need draft status and within 14 days
                              const canEdit = isAdmin || (editMode && weekStatus === 'draft' && isEditable)

                              if (editMode && canEdit) {
                                const entry = entries.find(e => e.id === dayData.id)
                                if (entry && onEditEntry) onEditEntry(entry)
                              } else if (!isEditable && !isAdmin) {
                                // Show a message that this is too old to edit
                                alert('This entry is older than 14 days. Please contact your administrator to request changes.')
                              }
                            }}
                            sx={{
                              cursor: editMode && (isAdmin || (weekStatus === 'draft' && isEditable)) ? 'pointer' : 'default',
                              '&:hover': editMode && (isAdmin || (weekStatus === 'draft' && isEditable)) ? {
                                backgroundColor: 'action.hover',
                                borderRadius: 1,
                              } : {},
                              padding: 0.5,
                              transition: 'background-color 0.2s',
                              opacity: !isEditable && !isAdmin ? 0.7 : 1,
                            }}
                          >
                            <Stack alignItems="center" spacing={0.5}>
                              <Typography
                                variant="body2"
                                fontWeight={dayData.hours > 0 ? 'bold' : 'normal'}
                                color={dayData.approved ? 'success.main' : 'text.primary'}
                              >
                                {dayData.hours.toFixed(1)}
                              </Typography>
                              {/* Status indicator */}
                              {(() => {
                                const entry = entries.find(e => e.id === dayData.id)
                                if (entry?.status === 'approved' || entry?.approvedAt) {
                                  return (
                                    <ApproveIcon
                                      sx={{ fontSize: 14, color: 'success.main' }}
                                      titleAccess="Approved"
                                    />
                                  )
                                } else if (entry?.status === 'submitted') {
                                  return (
                                    <SubmitIcon
                                      sx={{ fontSize: 14, color: 'warning.main' }}
                                      titleAccess="Submitted for approval"
                                    />
                                  )
                                } else if (entry?.status === 'rejected') {
                                  return (
                                    <Typography
                                      variant="caption"
                                      color="error"
                                      sx={{ fontSize: 10 }}
                                    >
                                      ❌
                                    </Typography>
                                  )
                                }
                                return null
                              })()}
                            </Stack>
                          </Box>
                        ) : (
                          <Box
                            onClick={() => {
                              // Allow adding new entries for empty days
                              const canEdit = isAdmin || (editMode && weekStatus === 'draft' && isEditable)

                              if (editMode && canEdit && onEditEntry) {
                                // Create a new entry object for this day
                                const newEntry = {
                                  id: '', // Empty ID indicates new entry
                                  jobId: job.jobId,
                                  jobNumber: job.jobNumber,
                                  jobTitle: job.jobTitle,
                                  customer: job.customer,
                                  date: format(weekDates[dayIndex], 'yyyy-MM-dd'),
                                  hours: 0,
                                  description: ''
                                } as TimesheetEntry
                                onEditEntry(newEntry)
                              } else if (!isEditable && !isAdmin) {
                                alert('This date is older than 14 days. Please contact your administrator to add entries.')
                              }
                            }}
                            sx={{
                              cursor: editMode && (isAdmin || (weekStatus === 'draft' && isEditable)) ? 'pointer' : 'default',
                              '&:hover': editMode && (isAdmin || (weekStatus === 'draft' && isEditable)) ? {
                                backgroundColor: 'action.hover',
                                borderRadius: 1,
                              } : {},
                              padding: 0.5,
                              transition: 'background-color 0.2s',
                              opacity: !isEditable && !isAdmin ? 0.5 : 1,
                            }}
                          >
                            <Typography
                              variant="body2"
                              color={editMode && (isAdmin || (weekStatus === 'draft' && isEditable)) ? "text.secondary" : "text.disabled"}
                            >
                              -
                            </Typography>
                          </Box>
                        )}
                      </TableCell>
                    )
                  })}

                  <TableCell align="center">
                    <Typography variant="body2" fontWeight="bold">
                      {calculateJobTotal(job).toFixed(1)}
                    </Typography>
                  </TableCell>

                  <TableCell align="center">
                    {/* Job-level actions if needed */}
                  </TableCell>
                </TableRow>
              ))
            )}

            {jobRows.length > 0 && (
              <>
                <TableRow sx={{ bgcolor: 'background.paper' }}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      Daily Total
                    </Typography>
                  </TableCell>
                  {weekDays.map((day) => {
                    const dayTotal = calculateDayTotal(day.toLowerCase())
                    return (
                      <TableCell key={day} align="center">
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color={dayTotal > 10 ? 'warning.main' : 'text.primary'}
                        >
                          {dayTotal > 0 ? dayTotal.toFixed(1) : '-'}
                        </Typography>
                      </TableCell>
                    )
                  })}
                  <TableCell align="center">
                    <Typography
                      variant="body1"
                      fontWeight="bold"
                      color={calculateWeekTotal() > 40 ? 'warning.main' : 'primary.main'}
                    >
                      {calculateWeekTotal().toFixed(1)}
                    </Typography>
                  </TableCell>
                  <TableCell />
                </TableRow>
                {/* Weekly Hours Breakdown Row - Only show for admins when NOT viewing a specific user */}
                {isAdmin && !selectedUserId && (
                  <>
                    <TableRow sx={{ bgcolor: 'background.paper' }}>
                      <TableCell colSpan={10}>
                        <Box sx={{ py: 1 }}>
                          <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
                            Weekly Hours Breakdown
                          </Typography>
                          <HoursBreakdownDisplay
                            regularHours={weekBreakdown.regularHours}
                            overtimeHours={weekBreakdown.overtimeHours}
                            doubleTimeHours={weekBreakdown.doubleTimeHours}
                            totalHours={calculateWeekTotal()}
                            weeklyTotal={calculateWeekTotal()}
                            weeklyThreshold={40}
                            showDetails={true}
                          />
                        </Box>
                      </TableCell>
                    </TableRow>
                    {/* Weekly Earnings Row - Only show for admins when NOT viewing a specific user */}
                    <TableRow sx={{ bgcolor: 'background.default' }}>
                      <TableCell colSpan={10}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 1 }}>
                          <Typography variant="body1" fontWeight="bold" color="success.main">
                            Estimated Weekly Earnings
                          </Typography>
                          <Typography variant="h6" fontWeight="bold" color="success.main">
                            ${weekBreakdown.totalEarnings.toFixed(2)}
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Legend - Only show edit mode tip */}
      {entries.length > 0 && editMode && (
        <Stack direction="row" spacing={2} mt={2}>
          <Typography variant="caption" color="primary.main">
            • Click on any hour value to edit it
          </Typography>
        </Stack>
      )}
    </Paper>
  )
}