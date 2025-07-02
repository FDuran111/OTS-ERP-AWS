'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  CircularProgress,
  Card,
  CardContent,
  Tooltip,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  MonetizationOn as MoneyIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface LaborRateOverride {
  id: string
  job_id: string
  user_id: string
  overridden_rate: number
  notes?: string
  created_at: string
  updated_at: string
  user_name: string
  user_email: string
  user_role: string
}

interface DefaultLaborRate {
  id: string
  user_id: string
  rate: number
  effective_date: string
  user_name: string
  user_role: string
}

interface JobLaborRateOverridesProps {
  jobId: string
}

export default function JobLaborRateOverrides({ jobId }: JobLaborRateOverridesProps) {
  const [overrides, setOverrides] = useState<LaborRateOverride[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [defaultRates, setDefaultRates] = useState<DefaultLaborRate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingOverride, setEditingOverride] = useState<LaborRateOverride | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [selectedUserId, setSelectedUserId] = useState('')
  const [overriddenRate, setOverriddenRate] = useState<number | ''>('')
  const [notes, setNotes] = useState('')

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [jobId])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load existing overrides for this job
      const overridesResponse = await fetch(`/api/jobs/${jobId}/labor-rates`)
      if (!overridesResponse.ok) {
        throw new Error('Failed to load labor rate overrides')
      }
      const overridesData = await overridesResponse.json()
      setOverrides(overridesData)

      // Load all users for dropdown
      const usersResponse = await fetch('/api/users')
      if (!usersResponse.ok) {
        throw new Error('Failed to load users')
      }
      const usersData = await usersResponse.json()
      // Handle both array and object response formats
      const usersList = Array.isArray(usersData) ? usersData : (usersData.users || [])
      setUsers(usersList)

      // Load default labor rates to show comparison
      const ratesResponse = await fetch('/api/labor-rates')
      if (!ratesResponse.ok) {
        throw new Error('Failed to load default labor rates')
      }
      const ratesData = await ratesResponse.json()
      setDefaultRates(ratesData)

    } catch (error) {
      console.error('Error loading data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (override?: LaborRateOverride) => {
    if (override) {
      // Editing existing override
      setEditingOverride(override)
      setSelectedUserId(override.user_id)
      setOverriddenRate(override.overridden_rate)
      setNotes(override.notes || '')
    } else {
      // Creating new override
      setEditingOverride(null)
      setSelectedUserId('')
      setOverriddenRate('')
      setNotes('')
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingOverride(null)
    setSelectedUserId('')
    setOverriddenRate('')
    setNotes('')
  }

  const handleSubmit = async () => {
    if (!selectedUserId || !overriddenRate) {
      alert('Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)

      const requestData = {
        userId: selectedUserId,
        overriddenRate: Number(overriddenRate),
        notes: notes.trim() || undefined,
      }

      let response
      if (editingOverride) {
        // Update existing override
        response = await fetch(`/api/jobs/${jobId}/labor-rates/${editingOverride.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            overriddenRate: Number(overriddenRate),
            notes: notes.trim() || undefined,
          }),
        })
      } else {
        // Create new override
        response = await fetch(`/api/jobs/${jobId}/labor-rates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData),
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save labor rate override')
      }

      // Reload data and close dialog
      await loadData()
      handleCloseDialog()

    } catch (error) {
      console.error('Error saving override:', error)
      alert(error instanceof Error ? error.message : 'Failed to save override')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (override: LaborRateOverride) => {
    const confirmMessage = `Are you sure you want to remove the rate override for ${override.user_name}?`
    
    if (!window.confirm(confirmMessage)) {
      return
    }

    try {
      const response = await fetch(`/api/jobs/${jobId}/labor-rates/${override.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete override')
      }

      // Reload data
      await loadData()

    } catch (error) {
      console.error('Error deleting override:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete override')
    }
  }

  const getDefaultRate = (userId: string): number | null => {
    const defaultRate = defaultRates.find(rate => rate.user_id === userId)
    return defaultRate ? defaultRate.rate : null
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const getAvailableUsers = () => {
    // Show users who don't already have overrides, or the currently editing user
    const usersWithOverrides = new Set(overrides.map(o => o.user_id))
    return users.filter(user => 
      !usersWithOverrides.has(user.id) || 
      (editingOverride && user.id === editingOverride.user_id)
    )
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <MoneyIcon sx={{ color: '#e14eca' }} />
          Labor Rate Overrides
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{
            backgroundColor: '#e14eca',
            '&:hover': { backgroundColor: '#d236b8' },
          }}
        >
          Add Override
        </Button>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
        <Box sx={{ flex: '1 1 calc(33.33% - 24px)', minWidth: '250px' }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PersonIcon sx={{ fontSize: 40, color: '#e14eca', mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {overrides.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Workers with Overrides
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 calc(33.33% - 24px)', minWidth: '250px' }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <MoneyIcon sx={{ fontSize: 40, color: '#4caf50', mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {overrides.length > 0 ? formatCurrency(
                  overrides.reduce((sum, o) => sum + o.overridden_rate, 0) / overrides.length
                ) : '$0.00'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Average Override Rate
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 calc(33.33% - 24px)', minWidth: '250px' }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <ScheduleIcon sx={{ fontSize: 40, color: '#ff9800', mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {users.length - overrides.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Using Default Rates
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Overrides Table */}
      <Paper elevation={3}>
        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Worker</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Role</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Default Rate</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Override Rate</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Impact</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Notes</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {overrides.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="text.secondary">
                      No labor rate overrides set for this job. Click "Add Override" to create one.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                overrides.map((override) => {
                  const defaultRate = getDefaultRate(override.user_id)
                  const impact = defaultRate ? override.overridden_rate - defaultRate : 0
                  const impactPercentage = defaultRate ? ((impact / defaultRate) * 100) : 0

                  return (
                    <TableRow key={override.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                            {override.user_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {override.user_email}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={override.user_role}
                          size="small"
                          sx={{ backgroundColor: '#e3f2fd', color: '#1976d2' }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {defaultRate ? formatCurrency(defaultRate) : 'N/A'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        {formatCurrency(override.overridden_rate)}
                      </TableCell>
                      <TableCell align="center">
                        {defaultRate ? (
                          <Tooltip 
                            title={`${impact >= 0 ? '+' : ''}${formatCurrency(impact)} per hour`}
                          >
                            <Chip
                              label={`${impactPercentage >= 0 ? '+' : ''}${impactPercentage.toFixed(1)}%`}
                              size="small"
                              sx={{
                                backgroundColor: impact >= 0 ? '#e8f5e8' : '#ffebee',
                                color: impact >= 0 ? '#2e7d32' : '#d32f2f',
                              }}
                            />
                          </Tooltip>
                        ) : (
                          <Chip label="New" size="small" sx={{ backgroundColor: '#fff3e0', color: '#f57c00' }} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {override.notes || 'No notes'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(override)}
                          sx={{ mr: 1 }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(override)}
                          sx={{ color: 'error.main' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingOverride ? 'Edit Labor Rate Override' : 'Add Labor Rate Override'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Worker</InputLabel>
              <Select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                label="Worker"
                disabled={editingOverride !== null}
              >
                {getAvailableUsers().map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    <Box>
                      <Typography variant="body1">{user.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {user.role} • {user.email}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Override Rate ($/hour)"
              type="number"
              value={overriddenRate}
              onChange={(e) => setOverriddenRate(e.target.value === '' ? '' : Number(e.target.value))}
              inputProps={{ min: 0, step: 0.01 }}
              sx={{ mb: 3 }}
            />

            <TextField
              fullWidth
              label="Notes (Optional)"
              multiline
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for rate override, special skills, etc."
            />

            {selectedUserId && (
              <Box sx={{ mt: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                {(() => {
                  const defaultRate = getDefaultRate(selectedUserId)
                  const newRate = Number(overriddenRate) || 0
                  const impact = defaultRate ? newRate - defaultRate : 0
                  
                  return (
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Rate Impact Analysis:
                      </Typography>
                      {defaultRate ? (
                        <>
                          <Typography variant="body2">
                            Default Rate: {formatCurrency(defaultRate)} / hour
                          </Typography>
                          <Typography variant="body2">
                            Override Rate: {formatCurrency(newRate)} / hour
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 'bold',
                              color: impact >= 0 ? '#2e7d32' : '#d32f2f'
                            }}
                          >
                            Impact: {impact >= 0 ? '+' : ''}{formatCurrency(impact)} per hour
                            ({impact >= 0 ? '+' : ''}{defaultRate ? ((impact / defaultRate) * 100).toFixed(1) : 0}%)
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No default rate found for this worker
                        </Typography>
                      )}
                    </Box>
                  )
                })()}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting || !selectedUserId || !overriddenRate}
            sx={{
              backgroundColor: '#e14eca',
              '&:hover': { backgroundColor: '#d236b8' },
            }}
          >
            {submitting ? 'Saving...' : (editingOverride ? 'Update' : 'Add')} Override
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}