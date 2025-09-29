'use client'

import React, { useState, useEffect } from 'react'
import {
  Paper,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Stack,
  Chip,
  IconButton,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material'
import {
  Download as ExportIcon,
  AttachMoney as MoneyIcon,
  NavigateBefore,
  NavigateNext,
  Print as PrintIcon,
  Email as EmailIcon,
} from '@mui/icons-material'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'

interface PayrollEntry {
  userId: string
  userName: string
  email: string
  regularHours: number
  overtimeHours: number
  doubleTimeHours: number
  totalHours: number
  regularPay: number
  overtimePay: number
  doubleTimePay: number
  totalPay: number
  status: 'pending' | 'approved' | 'paid'
}

interface PayrollSummaryProps {
  userId?: string
  userName?: string
}

export default function PayrollSummary({ userId, userName }: PayrollSummaryProps = {}) {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [payrollData, setPayrollData] = useState<PayrollEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly')

  useEffect(() => {
    fetchPayrollData()
  }, [currentWeek, selectedPeriod, userId])

  const fetchPayrollData = async () => {
    setLoading(true)
    try {
      let periodStart = currentWeek
      let periodEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })

      // Adjust date range based on selected period
      if (selectedPeriod === 'biweekly') {
        // For bi-weekly, include the previous week
        periodStart = subWeeks(currentWeek, 1)
      } else if (selectedPeriod === 'monthly') {
        // For monthly, include 3 weeks before current week (4 weeks total)
        periodStart = subWeeks(currentWeek, 3)
      }

      const weekStart = format(periodStart, 'yyyy-MM-dd')
      const weekEnd = format(periodEnd, 'yyyy-MM-dd')

      // Fetch time entries for the period - filter by user if provided
      const endpoint = userId
        ? `/api/time-entries?userId=${userId}&startDate=${weekStart}&endDate=${weekEnd}`
        : `/api/time-entries/company-week?startDate=${weekStart}&endDate=${weekEnd}`

      const response = await fetch(endpoint, { credentials: 'include' })

      if (response.ok) {
        const entries = await response.json()

        // Group by user and calculate totals
        const userPayroll = entries.reduce((acc: Record<string, PayrollEntry>, entry: any) => {
          if (!acc[entry.userId]) {
            acc[entry.userId] = {
              userId: entry.userId,
              // If filtering by specific user, use the provided userName, otherwise use from entry
              userName: userId && userName ? userName : (entry.userName || entry.user?.name || 'Unknown'),
              email: '', // Would need to fetch from users API
              regularHours: 0,
              overtimeHours: 0,
              doubleTimeHours: 0,
              totalHours: 0,
              regularPay: 0,
              overtimePay: 0,
              doubleTimePay: 0,
              totalPay: 0,
              status: 'pending',
            }
          }

          const user = acc[entry.userId]
          // Parse hours - the API returns these fields directly
          // If OT/DT fields are missing (old entries), calculate them from total hours
          const totalHours = parseFloat(entry.hours || 0)
          let regularHours = parseFloat(entry.regularHours || 0)
          let overtimeHours = parseFloat(entry.overtimeHours || 0)
          let doubleTimeHours = parseFloat(entry.doubleTimeHours || 0)

          // If the breakdown fields are not populated (old entries), estimate them
          if (regularHours === 0 && overtimeHours === 0 && doubleTimeHours === 0 && totalHours > 0) {
            // Basic estimation if fields are missing
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

          user.regularHours += regularHours
          user.overtimeHours += overtimeHours
          user.doubleTimeHours += doubleTimeHours
          user.totalHours += totalHours
          user.totalPay += parseFloat(entry.estimatedPay || 0)

          if (entry.approvedAt) {
            user.status = 'approved'
          }

          return acc
        }, {})

        // Fetch user details for email
        const usersResponse = await fetch('/api/users', { credentials: 'include' })
        if (usersResponse.ok) {
          const usersData = await usersResponse.json()
          const users = Array.isArray(usersData) ? usersData : (usersData.users || [])

          // Match user emails
          Object.values(userPayroll).forEach((entry: any) => {
            const user = users.find((u: any) => u.id === entry.userId)
            if (user) {
              entry.email = user.email
            }
          })
        }

        // Calculate individual pay components
        for (const entry of Object.values(userPayroll) as PayrollEntry[]) {
          // Fetch user rates
          try {
            const ratesResponse = await fetch(`/api/users/${entry.userId}/pay-rates`, {
              credentials: 'include'
            })
            if (ratesResponse.ok) {
              const rates = await ratesResponse.json()
              entry.regularPay = entry.regularHours * (rates.regularRate || 15)
              entry.overtimePay = entry.overtimeHours * (rates.overtimeRate || 22.5)
              entry.doubleTimePay = entry.doubleTimeHours * (rates.doubleTimeRate || 30)
              entry.totalPay = entry.regularPay + entry.overtimePay + entry.doubleTimePay
            }
          } catch (error) {
            console.error(`Error fetching rates for user ${entry.userId}:`, error)
          }
        }

        setPayrollData(Object.values(userPayroll))
      }
    } catch (error) {
      console.error('Error fetching payroll data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    // Create CSV content
    const headers = ['Employee', 'Email', 'Regular Hours', 'OT Hours', 'DT Hours', 'Total Hours', 'Regular Pay', 'OT Pay', 'DT Pay', 'Total Pay', 'Status']
    const rows = payrollData.map(entry => [
      entry.userName,
      entry.email,
      entry.regularHours.toFixed(2),
      entry.overtimeHours.toFixed(2),
      entry.doubleTimeHours.toFixed(2),
      entry.totalHours.toFixed(2),
      entry.regularPay.toFixed(2),
      entry.overtimePay.toFixed(2),
      entry.doubleTimePay.toFixed(2),
      entry.totalPay.toFixed(2),
      entry.status,
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payroll_${format(currentWeek, 'yyyy-MM-dd')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const calculateTotals = () => {
    return payrollData.reduce((totals, entry) => ({
      regularHours: totals.regularHours + entry.regularHours,
      overtimeHours: totals.overtimeHours + entry.overtimeHours,
      doubleTimeHours: totals.doubleTimeHours + entry.doubleTimeHours,
      totalHours: totals.totalHours + entry.totalHours,
      regularPay: totals.regularPay + entry.regularPay,
      overtimePay: totals.overtimePay + entry.overtimePay,
      doubleTimePay: totals.doubleTimePay + entry.doubleTimePay,
      totalPay: totals.totalPay + entry.totalPay,
    }), {
      regularHours: 0,
      overtimeHours: 0,
      doubleTimeHours: 0,
      totalHours: 0,
      regularPay: 0,
      overtimePay: 0,
      doubleTimePay: 0,
      totalPay: 0,
    })
  }

  const totals = calculateTotals()

  return (
    <Paper sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        {/* Date Range Navigation - Always show */}
        <Stack direction="row" alignItems="center">
          <IconButton onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
            <NavigateBefore />
          </IconButton>
          <Typography variant="h6" sx={{ mx: 2 }}>
            {(() => {
              let start = currentWeek
              let end = endOfWeek(currentWeek, { weekStartsOn: 1 })

              if (selectedPeriod === 'biweekly') {
                start = subWeeks(currentWeek, 1)
              } else if (selectedPeriod === 'monthly') {
                start = subWeeks(currentWeek, 3)
              }

              return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`
            })()}
          </Typography>
          <IconButton onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
            <NavigateNext />
          </IconButton>
        </Stack>

        {/* Controls - Always show */}
        <Stack direction="row" spacing={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Period</InputLabel>
            <Select
              value={selectedPeriod}
              label="Period"
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
            >
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="biweekly">Bi-Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
          >
            Print
          </Button>

          <Button
            variant="contained"
            startIcon={<ExportIcon />}
            onClick={handleExportCSV}
            color="success"
          >
            Export CSV
          </Button>
        </Stack>
      </Stack>

      {/* Payroll Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : payrollData.length === 0 ? (
        <Alert severity="info">No payroll data for this period</Alert>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.paper' }}>
                <TableCell>Employee</TableCell>
                <TableCell align="right">Regular</TableCell>
                <TableCell align="right">OT</TableCell>
                <TableCell align="right">DT</TableCell>
                <TableCell align="right">Total Hours</TableCell>
                <TableCell align="right">Regular Pay</TableCell>
                <TableCell align="right">OT Pay</TableCell>
                <TableCell align="right">DT Pay</TableCell>
                <TableCell align="right">Total Pay</TableCell>
                <TableCell align="center">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payrollData.map((entry) => (
                <TableRow key={entry.userId} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {entry.userName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {entry.email}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">{entry.regularHours.toFixed(1)}</TableCell>
                  <TableCell align="right" sx={{ color: 'warning.main' }}>
                    {entry.overtimeHours.toFixed(1)}
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'error.main' }}>
                    {entry.doubleTimeHours.toFixed(1)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {entry.totalHours.toFixed(1)}
                  </TableCell>
                  <TableCell align="right">${entry.regularPay.toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ color: 'warning.main' }}>
                    ${entry.overtimePay.toFixed(2)}
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'error.main' }}>
                    ${entry.doubleTimePay.toFixed(2)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                    ${entry.totalPay.toFixed(2)}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={entry.status}
                      size="small"
                      color={
                        entry.status === 'paid' ? 'success' :
                        entry.status === 'approved' ? 'primary' : 'default'
                      }
                      variant="outlined"
                    />
                  </TableCell>
                </TableRow>
              ))}

              {/* Totals Row */}
              <TableRow sx={{ bgcolor: 'background.paper' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>TOTAL</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  {totals.regularHours.toFixed(1)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                  {totals.overtimeHours.toFixed(1)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                  {totals.doubleTimeHours.toFixed(1)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  {totals.totalHours.toFixed(1)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  ${totals.regularPay.toFixed(2)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                  ${totals.overtimePay.toFixed(2)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                  ${totals.doubleTimePay.toFixed(2)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main', fontSize: '1.1rem' }}>
                  ${totals.totalPay.toFixed(2)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Summary Stats - Only show when viewing company-wide data */}
      {payrollData.length > 0 && !userId && (
        <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Stack direction="row" justifyContent="space-around" divider={<Divider orientation="vertical" flexItem />}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Employees
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {payrollData.length}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Total Hours
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {totals.totalHours.toFixed(1)}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Average Pay
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="success.main">
                ${(totals.totalPay / payrollData.length).toFixed(2)}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Total Payroll
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="success.main">
                ${totals.totalPay.toFixed(2)}
              </Typography>
            </Box>
          </Stack>
        </Box>
      )}
    </Paper>
  )
}