'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  Alert,
  Box,
  IconButton,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Tooltip,
  CircularProgress,
} from '@mui/material'
import {
  AttachMoney as MoneyIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Person as PersonIcon,
} from '@mui/icons-material'

interface User {
  id: string
  name: string
  email: string
  role: string
  regularRate?: number
  overtimeRate?: number
  doubleTimeRate?: number
}

interface PayRateDialogProps {
  user: User | null
  open: boolean
  onClose: () => void
  onSave: () => void
}

function PayRateDialog({ user, open, onClose, onSave }: PayRateDialogProps) {
  const [rates, setRates] = useState({
    regularRate: 15.00,
    overtimeRate: 22.50,
    doubleTimeRate: 30.00,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user && open) {
      fetchUserRates()
    }
  }, [user, open])

  const fetchUserRates = async () => {
    if (!user) return

    setLoading(true)
    try {
      const response = await fetch(`/api/users/${user.id}/pay-rates`, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setRates({
          regularRate: data.regularRate || 15.00,
          overtimeRate: data.overtimeRate || 22.50,
          doubleTimeRate: data.doubleTimeRate || 30.00,
        })
      }
    } catch (error) {
      console.error('Error fetching pay rates:', error)
      setError('Failed to load pay rates')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/users/${user.id}/pay-rates`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(rates)
      })

      if (response.ok) {
        onSave()
        onClose()
      } else {
        throw new Error('Failed to update pay rates')
      }
    } catch (error) {
      console.error('Error saving pay rates:', error)
      setError('Failed to save pay rates')
    } finally {
      setLoading(false)
    }
  }

  const handleRateChange = (field: keyof typeof rates) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = parseFloat(event.target.value) || 0
    setRates(prev => {
      const newRates = { ...prev, [field]: value }

      // Auto-calculate OT and DT if changing regular rate
      if (field === 'regularRate') {
        newRates.overtimeRate = Math.round(value * 1.5 * 100) / 100
        newRates.doubleTimeRate = Math.round(value * 2.0 * 100) / 100
      }

      return newRates
    })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MoneyIcon />
          <Typography variant="h6">Pay Rates - {user?.name}</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={2}>
            {error && (
              <Grid item xs={12}>
                <Alert severity="error">{error}</Alert>
              </Grid>
            )}

            <Grid item xs={12}>
              <TextField
                label="Regular Hourly Rate"
                type="number"
                value={rates.regularRate}
                onChange={handleRateChange('regularRate')}
                fullWidth
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  inputProps: { min: 0, step: 0.25 }
                }}
                helperText="Standard hourly rate"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Overtime Rate (1.5x)"
                type="number"
                value={rates.overtimeRate}
                onChange={handleRateChange('overtimeRate')}
                fullWidth
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  inputProps: { min: 0, step: 0.25 }
                }}
                helperText="Usually 1.5x regular rate"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Double Time Rate (2x)"
                type="number"
                value={rates.doubleTimeRate}
                onChange={handleRateChange('doubleTimeRate')}
                fullWidth
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  inputProps: { min: 0, step: 0.25 }
                }}
                helperText="Usually 2x regular rate"
              />
            </Grid>

            <Grid item xs={12}>
              <Alert severity="info" icon={<MoneyIcon />}>
                <Typography variant="body2">
                  Weekly Earnings Estimate (40 hr week):
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  ${(rates.regularRate * 40).toFixed(2)}/week = ${(rates.regularRate * 40 * 52).toFixed(2)}/year
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading}
          startIcon={<SaveIcon />}
        >
          Save Rates
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function EmployeePayRates() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/users', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        const userList = Array.isArray(data) ? data : (data.users || [])

        // Fetch pay rates for each user
        const usersWithRates = await Promise.all(
          userList.map(async (user: User) => {
            try {
              const ratesResponse = await fetch(`/api/users/${user.id}/pay-rates`, {
                credentials: 'include'
              })
              if (ratesResponse.ok) {
                const ratesData = await ratesResponse.json()
                return {
                  ...user,
                  regularRate: ratesData.regularRate,
                  overtimeRate: ratesData.overtimeRate,
                  doubleTimeRate: ratesData.doubleTimeRate,
                }
              }
            } catch (error) {
              console.error(`Error fetching rates for user ${user.id}:`, error)
            }
            return user
          })
        )

        setUsers(usersWithRates.filter(u => u.role === 'EMPLOYEE'))
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditRates = (user: User) => {
    setSelectedUser(user)
    setDialogOpen(true)
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'OWNER_ADMIN': return 'error'
      case 'FOREMAN': return 'warning'
      case 'EMPLOYEE': return 'primary'
      default: return 'default'
    }
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <MoneyIcon sx={{ mr: 1 }} />
        <Typography variant="h6">Employee Pay Rates</Typography>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Role</TableCell>
                <TableCell align="right">Regular Rate</TableCell>
                <TableCell align="right">OT Rate (1.5x)</TableCell>
                <TableCell align="right">DT Rate (2x)</TableCell>
                <TableCell align="right">Weekly (40hr)</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No employees found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon fontSize="small" />
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {user.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {user.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.role}
                        size="small"
                        color={getRoleColor(user.role)}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold">
                        ${(user.regularRate || 15.00).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="warning.main">
                        ${(user.overtimeRate || (user.regularRate || 15.00) * 1.5).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="error.main">
                        ${(user.doubleTimeRate || (user.regularRate || 15.00) * 2.0).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="success.main">
                        ${((user.regularRate || 15.00) * 40).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Edit Pay Rates">
                        <IconButton
                          size="small"
                          onClick={() => handleEditRates(user)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <PayRateDialog
        user={selectedUser}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setSelectedUser(null)
        }}
        onSave={fetchUsers}
      />
    </Paper>
  )
}