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
  Stack,
  IconButton,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Button,
} from '@mui/material'
import {
  NavigateBefore,
  NavigateNext,
} from '@mui/icons-material'
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks } from 'date-fns'
import HoursBreakdownDisplay from './HoursBreakdownDisplay'

interface JobSummary {
  jobId: string
  jobNumber: string
  jobTitle: string
  customer: string
  monday: number
  tuesday: number
  wednesday: number
  thursday: number
  friday: number
  saturday: number
  sunday: number
  totalHours: number
  employeeCount: number
  employees?: Array<{ id: string; name: string; hours: number }>
}

export default function CompanyWeeklyJobsSummary() {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [jobSummaries, setJobSummaries] = useState<JobSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [weekBreakdown, setWeekBreakdown] = useState<{
    regularHours: number
    overtimeHours: number
    doubleTimeHours: number
    categoryHours: Record<string, number> | null
  }>({ regularHours: 0, overtimeHours: 0, doubleTimeHours: 0, categoryHours: null })
  const [employeeDialog, setEmployeeDialog] = useState<{
    open: boolean
    jobNumber: string
    jobTitle: string
    employees: Array<{ id: string; name: string; hours: number }>
  }>({ open: false, jobNumber: '', jobTitle: '', employees: [] })

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const weekDates = weekDays.map((_, index) => addDays(currentWeek, index))

  useEffect(() => {
    fetchWeekData()
  }, [currentWeek])

  const fetchWeekData = async () => {
    setLoading(true)
    try {
      const weekStart = format(currentWeek, 'yyyy-MM-dd')
      const weekEnd = format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd')

      // Fetch all time entries for the week (all users)
      const response = await fetch(
        `/api/time-entries/company-week?startDate=${weekStart}&endDate=${weekEnd}`,
        { credentials: 'include' }
      )

      if (response.ok) {
        const data = await response.json()

        // Calculate total breakdown for all entries
        let totalRegular = 0
        let totalOvertime = 0
        let totalDoubleTime = 0
        const aggregatedCategoryHours: Record<string, number> = {
          STRAIGHT_TIME: 0,
          STRAIGHT_TIME_TRAVEL: 0,
          OVERTIME: 0,
          OVERTIME_TRAVEL: 0,
          DOUBLE_TIME: 0,
          DOUBLE_TIME_TRAVEL: 0
        }
        let hasCategoryHours = false

        data.forEach((entry: any) => {
          const totalHours = parseFloat(entry.hours || 0)
          let regularHours = parseFloat(entry.regularHours || 0)
          let overtimeHours = parseFloat(entry.overtimeHours || 0)
          let doubleTimeHours = parseFloat(entry.doubleTimeHours || 0)

          // Aggregate categoryHours if available
          if (entry.categoryHours) {
            const cats = typeof entry.categoryHours === 'string'
              ? JSON.parse(entry.categoryHours)
              : entry.categoryHours
            aggregatedCategoryHours.STRAIGHT_TIME += cats.STRAIGHT_TIME || 0
            aggregatedCategoryHours.STRAIGHT_TIME_TRAVEL += cats.STRAIGHT_TIME_TRAVEL || 0
            aggregatedCategoryHours.OVERTIME += cats.OVERTIME || 0
            aggregatedCategoryHours.OVERTIME_TRAVEL += cats.OVERTIME_TRAVEL || 0
            aggregatedCategoryHours.DOUBLE_TIME += cats.DOUBLE_TIME || 0
            aggregatedCategoryHours.DOUBLE_TIME_TRAVEL += cats.DOUBLE_TIME_TRAVEL || 0
            hasCategoryHours = true
          }

          // If the breakdown fields are not populated (old entries), estimate them
          if (regularHours === 0 && overtimeHours === 0 && doubleTimeHours === 0 && totalHours > 0) {
            // Basic estimation if fields are missing - this is per-day calculation
            if (totalHours <= 8) {
              regularHours = totalHours
            } else if (totalHours <= 12) {
              regularHours = 8
              overtimeHours = totalHours - 8
            } else {
              regularHours = 8
              overtimeHours = 4
              doubleTimeHours = totalHours - 12
            }
          }

          totalRegular += regularHours
          totalOvertime += overtimeHours
          totalDoubleTime += doubleTimeHours
        })

        setWeekBreakdown({
          regularHours: totalRegular,
          overtimeHours: totalOvertime,
          doubleTimeHours: totalDoubleTime,
          categoryHours: hasCategoryHours ? aggregatedCategoryHours : null
        })

        // Group by job number (not jobId) and aggregate hours by day
        const jobMap = new Map<string, JobSummary>()
        const employeesByJob = new Map<string, Map<string, { name: string; hours: number }>>()

        data.forEach((entry: any) => {
          // Use job number as the key to group same jobs together
          const jobKey = entry.jobNumber

          if (!jobMap.has(jobKey)) {
            jobMap.set(jobKey, {
              jobId: entry.jobId,
              jobNumber: entry.jobNumber,
              jobTitle: entry.jobTitle,
              customer: entry.customer,
              monday: 0,
              tuesday: 0,
              wednesday: 0,
              thursday: 0,
              friday: 0,
              saturday: 0,
              sunday: 0,
              totalHours: 0,
              employeeCount: 0,
            })
            employeesByJob.set(jobKey, new Map())
          }

          const job = jobMap.get(jobKey)!
          const hours = parseFloat(entry.hours) || 0

          // Parse date string directly without timezone conversion
          // The date comes as "2025-09-25T04:00:00.000Z" or similar
          let dateStr = entry.date

          // If it's an ISO date string with timezone, extract just the date part
          if (typeof dateStr === 'string' && dateStr.includes('T')) {
            // For ISO dates, we need to handle them properly
            // Create a date in UTC to avoid timezone shifts
            const tempDate = new Date(dateStr)
            // Get the UTC date components
            const year = tempDate.getUTCFullYear()
            const month = tempDate.getUTCMonth()
            const day = tempDate.getUTCDate()
            // Create a local date with these components
            const entryDate = new Date(year, month, day)

            const dayIndex = entryDate.getDay()
            const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayIndex]

            // Add hours to the appropriate day
            switch(dayName) {
              case 'monday': job.monday += hours; break;
              case 'tuesday': job.tuesday += hours; break;
              case 'wednesday': job.wednesday += hours; break;
              case 'thursday': job.thursday += hours; break;
              case 'friday': job.friday += hours; break;
              case 'saturday': job.saturday += hours; break;
              case 'sunday': job.sunday += hours; break;
            }
          } else if (typeof dateStr === 'string') {
            // For YYYY-MM-DD format
            const [year, month, day] = dateStr.split('-').map(Number)
            const entryDate = new Date(year, month - 1, day)
            const dayIndex = entryDate.getDay()
            const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayIndex]

            // Add hours to the appropriate day
            switch(dayName) {
              case 'monday': job.monday += hours; break;
              case 'tuesday': job.tuesday += hours; break;
              case 'wednesday': job.wednesday += hours; break;
              case 'thursday': job.thursday += hours; break;
              case 'friday': job.friday += hours; break;
              case 'saturday': job.saturday += hours; break;
              case 'sunday': job.sunday += hours; break;
            }
          }

          job.totalHours += hours

          // Track unique employees with their hours
          const employeeMap = employeesByJob.get(jobKey)!
          if (!employeeMap.has(entry.userId)) {
            employeeMap.set(entry.userId, { name: entry.userName, hours: 0 })
          }
          employeeMap.get(entry.userId)!.hours += hours
        })

        // Update employee counts and store employee data
        const summariesWithEmployees = Array.from(jobMap.entries()).map(([key, job]) => {
          const employees = employeesByJob.get(key)
          job.employeeCount = employees?.size || 0
          return {
            ...job,
            employees: employees ? Array.from(employees.entries()).map(([id, data]) => ({
              id,
              name: data.name,
              hours: data.hours
            })) : []
          }
        })

        setJobSummaries(summariesWithEmployees.sort((a, b) =>
          b.totalHours - a.totalHours // Sort by total hours descending
        ))
      }
    } catch (error) {
      console.error('Error fetching company week data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateDayTotal = (dayName: string): number => {
    return jobSummaries.reduce((sum, job) => {
      return sum + (job[dayName.toLowerCase() as keyof typeof job] as number || 0)
    }, 0)
  }

  const calculateWeekTotal = (): number => {
    return jobSummaries.reduce((sum, job) => sum + job.totalHours, 0)
  }

  const getTotalEmployees = (): number => {
    // This returns the maximum employee count from any job
    return jobSummaries.reduce((max, job) => Math.max(max, job.employeeCount), 0)
  }

  const handleEmployeeClick = (job: JobSummary) => {
    setEmployeeDialog({
      open: true,
      jobNumber: job.jobNumber,
      jobTitle: job.jobTitle,
      employees: job.employees || []
    })
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
            label={`${jobSummaries.length} Active Jobs`}
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`${calculateWeekTotal().toFixed(1)} Total Hours`}
            color="success"
            variant="outlined"
          />
        </Stack>
      </Stack>

      <Box sx={{ mb: 2, p: 2, bgcolor: 'info.main', borderRadius: 1 }}>
        <Typography variant="body2" sx={{ color: 'white' }} textAlign="center">
          This view shows cumulative hours from ALL employees across ALL jobs for the week.
          Select an employee above to view their individual timesheet.
        </Typography>
      </Box>

      {/* Jobs Summary Grid */}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>
                Job
              </TableCell>
              {weekDays.map((day, index) => (
                <TableCell key={day} align="center" sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>
                  <Typography variant="caption" display="block" fontWeight="bold">
                    {day.substring(0, 3)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {format(weekDates[index], 'MM/dd')}
                  </Typography>
                </TableCell>
              ))}
              <TableCell align="center" sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>
                Total
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>
                Employees
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                    <CircularProgress size={24} />
                    <Typography sx={{ ml: 2 }}>Loading company data...</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : jobSummaries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No time entries recorded for this week across the company.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              <>
                {jobSummaries.map((job) => (
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
                      const hours = job[day.toLowerCase() as keyof typeof job] as number
                      return (
                        <TableCell key={day} align="center">
                          <Typography
                            variant="body2"
                            fontWeight={hours > 0 ? 'bold' : 'normal'}
                            color={hours > 0 ? 'text.primary' : 'text.disabled'}
                          >
                            {hours > 0 ? hours.toFixed(1) : '-'}
                          </Typography>
                        </TableCell>
                      )
                    })}

                    <TableCell align="center">
                      <Typography variant="body2" fontWeight="bold" color="primary.main">
                        {job.totalHours.toFixed(1)}
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      <Chip
                        label={job.employeeCount}
                        size="small"
                        variant="outlined"
                        color={job.employeeCount > 1 ? 'info' : 'default'}
                        onClick={() => handleEmployeeClick(job)}
                        sx={{ cursor: 'pointer' }}
                      />
                    </TableCell>
                  </TableRow>
                ))}

                {/* Daily totals row */}
                <TableRow sx={{ bgcolor: 'background.paper' }}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      Daily Company Total
                    </Typography>
                  </TableCell>
                  {weekDays.map((day) => {
                    const dayTotal = calculateDayTotal(day.toLowerCase())
                    return (
                      <TableCell key={day} align="center">
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color={dayTotal > 0 ? 'text.primary' : 'text.disabled'}
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
                      color="primary.main"
                    >
                      {calculateWeekTotal().toFixed(1)}
                    </Typography>
                  </TableCell>
                  <TableCell />
                </TableRow>
                {/* Company Weekly Hours Breakdown Row */}
                <TableRow sx={{ bgcolor: 'background.paper' }}>
                  <TableCell colSpan={10}>
                    <Box sx={{ py: 1 }}>
                      <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
                        Company Weekly Hours Breakdown
                      </Typography>
                      <HoursBreakdownDisplay
                        regularHours={weekBreakdown.regularHours}
                        overtimeHours={weekBreakdown.overtimeHours}
                        doubleTimeHours={weekBreakdown.doubleTimeHours}
                        totalHours={calculateWeekTotal()}
                        weeklyTotal={calculateWeekTotal()}
                        weeklyThreshold={40 * getTotalEmployees()}
                        showDetails={false}
                        categoryHours={weekBreakdown.categoryHours}
                      />
                    </Box>
                  </TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </TableContainer>


      {/* Employee Details Dialog */}
      <Dialog
        open={employeeDialog.open}
        onClose={() => setEmployeeDialog({ ...employeeDialog, open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Employees on {employeeDialog.jobNumber}
          <Typography variant="body2" color="text.secondary">
            {employeeDialog.jobTitle}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {employeeDialog.employees.length === 0 ? (
            <Typography>No employees recorded for this job.</Typography>
          ) : (
            <List>
              {employeeDialog.employees.map((employee, index) => (
                <ListItem key={employee.id} divider={index < employeeDialog.employees.length - 1}>
                  <ListItemText
                    primary={employee.name}
                    secondary={`${employee.hours.toFixed(1)} hours`}
                  />
                </ListItem>
              ))}
              <ListItem>
                <ListItemText
                  primary={<strong>Total</strong>}
                  secondary={
                    <strong>
                      {employeeDialog.employees.reduce((sum, emp) => sum + emp.hours, 0).toFixed(1)} hours
                    </strong>
                  }
                />
              </ListItem>
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmployeeDialog({ ...employeeDialog, open: false })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}