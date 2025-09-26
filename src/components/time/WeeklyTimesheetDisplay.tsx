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
} from '@mui/icons-material'
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks } from 'date-fns'

interface TimesheetEntry {
  id: string
  jobId: string
  jobNumber: string
  jobTitle: string
  customer: string
  date: string
  hours: number
  description?: string
  approvedAt?: string
  approvedBy?: string
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

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const weekDates = weekDays.map((_, index) => addDays(currentWeek, index))

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

        // Check if all entries are approved
        const allApproved = data.length > 0 && data.every((e: TimesheetEntry) => e.approvedAt)
        const anyApproved = data.some((e: TimesheetEntry) => e.approvedAt)

        if (allApproved) {
          setWeekStatus('approved')
        } else if (anyApproved) {
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
          credentials: 'include'
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
                  <Typography color="text.secondary">
                    No time entries for this week. Use the "Manual Time Entry" button to add hours.
                  </Typography>
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

                  {weekDays.map((day) => {
                    const dayKey = day.toLowerCase()
                    const dayData = job.days[dayKey]

                    return (
                      <TableCell key={day} align="center">
                        {dayData ? (
                          <Box
                            onClick={() => {
                              if (editMode && weekStatus === 'draft' && !isAdmin) {
                                const entry = entries.find(e => e.id === dayData.id)
                                if (entry && onEditEntry) onEditEntry(entry)
                              }
                            }}
                            sx={{
                              cursor: editMode && weekStatus === 'draft' && !isAdmin ? 'pointer' : 'default',
                              '&:hover': editMode && weekStatus === 'draft' && !isAdmin ? {
                                backgroundColor: 'action.hover',
                                borderRadius: 1,
                              } : {},
                              padding: 0.5,
                              transition: 'background-color 0.2s',
                            }}
                          >
                            <Typography
                              variant="body2"
                              fontWeight={dayData.hours > 0 ? 'bold' : 'normal'}
                              color={dayData.approved ? 'success.main' : 'text.primary'}
                            >
                              {dayData.hours.toFixed(1)}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.disabled">
                            -
                          </Typography>
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
              <TableRow sx={{ bgcolor: 'grey.50' }}>
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
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Legend */}
      {entries.length > 0 && (
        <Stack direction="row" spacing={2} mt={2}>
          {editMode && (
            <Typography variant="caption" color="primary.main">
              • Click on any hour value to edit it
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            • Hours shown in <span style={{ color: '#2e7d32' }}>green</span> are approved
          </Typography>
          {calculateWeekTotal() > 40 && (
            <Typography variant="caption" color="warning.main">
              • Overtime hours detected (&gt;40 hrs/week)
            </Typography>
          )}
        </Stack>
      )}
    </Paper>
  )
}