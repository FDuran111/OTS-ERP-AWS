'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import ResponsiveLayout from '@/components/layout/ResponsiveLayout'
import ResponsiveContainer from '@/components/layout/ResponsiveContainer'
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material'
import {
  Add as AddIcon,
  CalendarMonth as CalendarIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
} from '@mui/icons-material'
import { format, addMonths, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns'

interface AccountingPeriod {
  id: string
  name: string
  startDate: string
  endDate: string
  status: 'OPEN' | 'CLOSED' | 'LOCKED'
  fiscalYear: number
  periodNumber: number
  closedBy?: string
  closedAt?: string
}

const statusColors = {
  OPEN: 'success',
  CLOSED: 'warning',
  LOCKED: 'error',
}

export default function AccountingPeriodsPage() {
  const { user } = useAuth()
  const [periods, setPeriods] = useState<AccountingPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    fiscalYear: new Date().getFullYear(),
    periodNumber: new Date().getMonth() + 1,
  })

  useEffect(() => {
    fetchPeriods()
  }, [])

  const fetchPeriods = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/accounting/periods')
      if (!response.ok) throw new Error('Failed to fetch periods')
      const data = await response.json()
      setPeriods(data.periods)
      setError(null)
    } catch (err) {
      console.error('Error fetching periods:', err)
      setError('Failed to load accounting periods')
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePeriod = async () => {
    try {
      setActionLoading(true)
      
      const submitData = {
        ...formData,
        name: formData.name || generatePeriodName(),
      }
      
      const response = await fetch('/api/accounting/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create period')
      }

      await fetchPeriods()
      setAddDialogOpen(false)
      resetForm()
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleClosePeriod = async (periodId: string) => {
    if (!confirm('Are you sure you want to close this period? This will prevent new draft entries from being created.')) return

    try {
      setActionLoading(true)
      const response = await fetch(`/api/accounting/periods/${periodId}/close`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to close period')
      }

      await fetchPeriods()
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleReopenPeriod = async (periodId: string) => {
    if (!confirm('Are you sure you want to reopen this period?')) return

    try {
      setActionLoading(true)
      const response = await fetch(`/api/accounting/periods/${periodId}/close`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to reopen period')
      }

      await fetchPeriods()
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const resetForm = () => {
    const now = new Date()
    setFormData({
      name: '',
      startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
      fiscalYear: now.getFullYear(),
      periodNumber: now.getMonth() + 1,
    })
  }

  const generatePeriodName = () => {
    const date = new Date(formData.startDate)
    return `${format(date, 'MMMM yyyy')}`
  }

  return (
    <ResponsiveLayout user={user}>
      <ResponsiveContainer>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CalendarIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h4" fontWeight="bold">
              Accounting Periods
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
          >
            Create Period
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Start Date</TableCell>
                  <TableCell>End Date</TableCell>
                  <TableCell>Fiscal Year</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {periods.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {period.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Period #{period.periodNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {format(new Date(period.startDate), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      {format(new Date(period.endDate), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>{period.fiscalYear}</TableCell>
                    <TableCell>
                      <Chip
                        label={period.status}
                        color={statusColors[period.status] as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {period.status === 'OPEN' ? (
                        <Button
                          size="small"
                          startIcon={<LockIcon />}
                          onClick={() => handleClosePeriod(period.id)}
                          disabled={actionLoading}
                          color="warning"
                        >
                          Close
                        </Button>
                      ) : period.status === 'CLOSED' ? (
                        <Button
                          size="small"
                          startIcon={<LockOpenIcon />}
                          onClick={() => handleReopenPeriod(period.id)}
                          disabled={actionLoading}
                          color="success"
                        >
                          Reopen
                        </Button>
                      ) : (
                        <Chip label="Locked" size="small" color="error" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {periods.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No accounting periods found. Create your first period to get started.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Create Period Dialog */}
        <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create New Accounting Period</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Period Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={generatePeriodName()}
                fullWidth
                helperText="Leave blank to auto-generate from dates"
              />
              <TextField
                label="Start Date"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="End Date"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Fiscal Year"
                type="number"
                value={formData.fiscalYear}
                onChange={(e) => setFormData({ ...formData, fiscalYear: parseInt(e.target.value) })}
                required
                fullWidth
              />
              <TextField
                label="Period Number"
                type="number"
                value={formData.periodNumber}
                onChange={(e) => setFormData({ ...formData, periodNumber: parseInt(e.target.value) })}
                required
                fullWidth
                helperText="1-12 for monthly, 1-4 for quarterly"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreatePeriod} 
              variant="contained"
              disabled={actionLoading}
            >
              {actionLoading ? <CircularProgress size={24} /> : 'Create Period'}
            </Button>
          </DialogActions>
        </Dialog>
      </ResponsiveContainer>
    </ResponsiveLayout>
  )
}
