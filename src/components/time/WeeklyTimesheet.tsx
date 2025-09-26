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
  TextField,
  Button,
  IconButton,
  Typography,
  Chip,
  Stack,
  Alert,
  Autocomplete,
  Divider,
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Send as SendIcon,
  ContentCopy as CopyIcon,
  NavigateBefore,
  NavigateNext,
} from '@mui/icons-material'
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isWeekend } from 'date-fns'

interface Job {
  id: string
  jobNumber: string
  title: string
  customer: string
}

interface TimesheetRow {
  id: string
  jobId: string
  job?: Job
  hours: {
    monday: number
    tuesday: number
    wednesday: number
    thursday: number
    friday: number
    saturday: number
    sunday: number
  }
  notes?: string
}

interface WeeklyTimesheetProps {
  userId?: string
  isAdmin?: boolean
  selectedUserId?: string // For admin viewing other users
}

export default function WeeklyTimesheet({ userId, isAdmin = false, selectedUserId }: WeeklyTimesheetProps) {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [rows, setRows] = useState<TimesheetRow[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'draft' | 'submitted' | 'approved' | 'rejected'>('draft')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const weekDates = weekDays.map((_, index) => addDays(currentWeek, index))

  // Load jobs and timesheet data
  useEffect(() => {
    fetchJobs()
    fetchTimesheet()
  }, [currentWeek, selectedUserId])

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs?status=SCHEDULED,IN_PROGRESS', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setJobs(data)
      }
    } catch (error) {
      console.error('Error fetching jobs:', error)
    }
  }

  const fetchTimesheet = async () => {
    setLoading(true)
    try {
      const targetUserId = isAdmin && selectedUserId ? selectedUserId : userId
      const weekStart = format(currentWeek, 'yyyy-MM-dd')
      const weekEnd = format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd')

      const response = await fetch(
        `/api/time-entries/weekly?userId=${targetUserId}&weekStart=${weekStart}&weekEnd=${weekEnd}`,
        { credentials: 'include' }
      )

      if (response.ok) {
        const data = await response.json()
        if (data.rows && data.rows.length > 0) {
          setRows(data.rows)
          setStatus(data.status || 'draft')
        } else {
          // Initialize with one empty row
          setRows([createEmptyRow()])
        }
      }
    } catch (error) {
      console.error('Error fetching timesheet:', error)
      setRows([createEmptyRow()])
    } finally {
      setLoading(false)
    }
  }

  const createEmptyRow = (): TimesheetRow => ({
    id: `new-${Date.now()}-${Math.random()}`,
    jobId: '',
    hours: {
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
      saturday: 0,
      sunday: 0,
    },
    notes: ''
  })

  const addRow = () => {
    setRows([...rows, createEmptyRow()])
  }

  const deleteRow = (rowId: string) => {
    setRows(rows.filter(row => row.id !== rowId))
  }

  const updateRow = (rowId: string, field: string, value: any) => {
    setRows(rows.map(row => {
      if (row.id === rowId) {
        if (field.startsWith('hours.')) {
          const day = field.split('.')[1]
          return {
            ...row,
            hours: {
              ...row.hours,
              [day]: parseFloat(value) || 0
            }
          }
        }
        return { ...row, [field]: value }
      }
      return row
    }))
  }

  const calculateRowTotal = (row: TimesheetRow): number => {
    return Object.values(row.hours).reduce((sum, hours) => sum + hours, 0)
  }

  const calculateDayTotal = (day: keyof TimesheetRow['hours']): number => {
    return rows.reduce((sum, row) => sum + row.hours[day], 0)
  }

  const calculateWeekTotal = (): number => {
    return rows.reduce((sum, row) => sum + calculateRowTotal(row), 0)
  }

  const saveTimesheet = async (submit = false) => {
    setSaving(true)
    setMessage(null)

    try {
      const targetUserId = isAdmin && selectedUserId ? selectedUserId : userId
      const response = await fetch('/api/time-entries/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: targetUserId,
          weekStart: format(currentWeek, 'yyyy-MM-dd'),
          rows: rows.filter(row => row.jobId), // Only save rows with jobs selected
          status: submit ? 'submitted' : 'draft',
          action: submit ? 'submit' : 'save'
        })
      })

      if (response.ok) {
        setMessage({
          type: 'success',
          text: submit ? 'Timesheet submitted for approval!' : 'Timesheet saved successfully!'
        })
        if (submit) {
          setStatus('submitted')
        }
        fetchTimesheet() // Reload to get updated data
      } else {
        throw new Error('Failed to save timesheet')
      }
    } catch (error) {
      console.error('Error saving timesheet:', error)
      setMessage({
        type: 'error',
        text: 'Failed to save timesheet. Please try again.'
      })
    } finally {
      setSaving(false)
    }
  }

  const copyPreviousWeek = async () => {
    try {
      const previousWeek = subWeeks(currentWeek, 1)
      const targetUserId = isAdmin && selectedUserId ? selectedUserId : userId
      const weekStart = format(previousWeek, 'yyyy-MM-dd')
      const weekEnd = format(endOfWeek(previousWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd')

      const response = await fetch(
        `/api/time-entries/weekly?userId=${targetUserId}&weekStart=${weekStart}&weekEnd=${weekEnd}`,
        { credentials: 'include' }
      )

      if (response.ok) {
        const data = await response.json()
        if (data.rows && data.rows.length > 0) {
          // Copy structure but clear the hours
          const newRows = data.rows.map((row: TimesheetRow) => ({
            ...row,
            id: `new-${Date.now()}-${Math.random()}`,
            hours: {
              monday: 0,
              tuesday: 0,
              wednesday: 0,
              thursday: 0,
              friday: 0,
              saturday: 0,
              sunday: 0,
            }
          }))
          setRows(newRows)
          setMessage({
            type: 'success',
            text: 'Previous week structure copied. Please enter this week\'s hours.'
          })
        }
      }
    } catch (error) {
      console.error('Error copying previous week:', error)
    }
  }

  const canEdit = status === 'draft' || status === 'rejected' || isAdmin

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

        <Stack direction="row" spacing={2}>
          {status === 'draft' && (
            <Button
              variant="outlined"
              startIcon={<CopyIcon />}
              onClick={copyPreviousWeek}
              size="small"
            >
              Copy Previous Week
            </Button>
          )}
          <Chip
            label={status.toUpperCase()}
            color={
              status === 'approved' ? 'success' :
              status === 'submitted' ? 'warning' :
              status === 'rejected' ? 'error' : 'default'
            }
          />
        </Stack>
      </Stack>

      {message && (
        <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      {/* Timesheet Grid */}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 200 }}>Job</TableCell>
              {weekDays.map((day, index) => (
                <TableCell key={day} align="center" sx={{ minWidth: 80 }}>
                  <Typography variant="caption" display="block">{day.substr(0, 3)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {format(weekDates[index], 'MM/dd')}
                  </Typography>
                </TableCell>
              ))}
              <TableCell align="center">Total</TableCell>
              <TableCell align="center" width={100}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Autocomplete
                    options={jobs}
                    value={jobs.find(j => j.id === row.jobId) || null}
                    onChange={(_, job) => updateRow(row.id, 'jobId', job?.id || '')}
                    getOptionLabel={(option) => `${option.jobNumber} - ${option.title}`}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        variant="outlined"
                        size="small"
                        placeholder="Select job..."
                        disabled={!canEdit}
                      />
                    )}
                    disabled={!canEdit}
                    fullWidth
                  />
                </TableCell>
                {weekDays.map((day) => (
                  <TableCell key={day} align="center">
                    <TextField
                      type="number"
                      value={row.hours[day.toLowerCase() as keyof TimesheetRow['hours']]}
                      onChange={(e) => updateRow(row.id, `hours.${day.toLowerCase()}`, e.target.value)}
                      inputProps={{ min: 0, max: 24, step: 0.5 }}
                      disabled={!canEdit}
                      size="small"
                      sx={{ width: 70 }}
                    />
                  </TableCell>
                ))}
                <TableCell align="center">
                  <Typography variant="body2" fontWeight="bold">
                    {calculateRowTotal(row).toFixed(1)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={() => deleteRow(row.id)}
                    disabled={!canEdit || rows.length === 1}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}

            {/* Daily Totals Row */}
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell>
                <Typography variant="body2" fontWeight="bold">Daily Total</Typography>
              </TableCell>
              {weekDays.map((day) => {
                const dayTotal = calculateDayTotal(day.toLowerCase() as keyof TimesheetRow['hours'])
                return (
                  <TableCell key={day} align="center">
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color={dayTotal > 10 ? 'warning.main' : 'text.primary'}
                    >
                      {dayTotal.toFixed(1)}
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
          </TableBody>
        </Table>
      </TableContainer>

      {/* Actions */}
      <Stack direction="row" justifyContent="space-between" mt={3}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={addRow}
          disabled={!canEdit}
        >
          Add Job
        </Button>

        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<SaveIcon />}
            onClick={() => saveTimesheet(false)}
            disabled={!canEdit || saving}
          >
            Save Draft
          </Button>
          {!isAdmin && status !== 'approved' && (
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={() => saveTimesheet(true)}
              disabled={!canEdit || saving || rows.every(r => !r.jobId)}
            >
              Submit for Approval
            </Button>
          )}
        </Stack>
      </Stack>
    </Paper>
  )
}