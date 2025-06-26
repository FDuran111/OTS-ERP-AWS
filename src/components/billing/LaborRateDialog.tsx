'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Grid,
  InputAdornment,
  Alert,
  IconButton,
} from '@mui/material'
import {
  Close as CloseIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { format } from 'date-fns'

interface LaborRate {
  id: string
  name: string
  description?: string
  hourlyRate: number
  skillLevel: string
  category: string
  effectiveDate: string
  expiryDate?: string
  active: boolean
}

interface LaborRateDialogProps {
  open: boolean
  onClose: () => void
  rate?: LaborRate | null
  onRateCreated?: () => void
  onRateUpdated?: () => void
}

const skillLevels = [
  { value: 'APPRENTICE', label: 'Apprentice' },
  { value: 'HELPER', label: 'Helper' },
  { value: 'TECH_L1', label: 'Technician Level 1' },
  { value: 'TECH_L2', label: 'Technician Level 2' },
  { value: 'JOURNEYMAN', label: 'Journeyman' },
  { value: 'FOREMAN', label: 'Foreman' },
  { value: 'LOW_VOLTAGE', label: 'Low Voltage Specialist' },
  { value: 'CABLING', label: 'Cabling Specialist' },
  { value: 'INSTALL', label: 'Install Specialist' },
]

const categories = [
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'LOW_VOLTAGE', label: 'Low Voltage' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'INSTALL', label: 'Installation' },
  { value: 'SPECIALTY', label: 'Specialty' },
]

export default function LaborRateDialog({
  open,
  onClose,
  rate,
  onRateCreated,
  onRateUpdated
}: LaborRateDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hourlyRate: '',
    skillLevel: '',
    category: 'ELECTRICAL',
    effectiveDate: new Date(),
    expiryDate: null as Date | null,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (rate) {
      setFormData({
        name: rate.name || '',
        description: rate.description || '',
        hourlyRate: rate.hourlyRate.toString(),
        skillLevel: rate.skillLevel || '',
        category: rate.category || 'ELECTRICAL',
        effectiveDate: rate.effectiveDate ? new Date(rate.effectiveDate) : new Date(),
        expiryDate: rate.expiryDate ? new Date(rate.expiryDate) : null,
      })
    } else {
      setFormData({
        name: '',
        description: '',
        hourlyRate: '',
        skillLevel: '',
        category: 'ELECTRICAL',
        effectiveDate: new Date(),
        expiryDate: null,
      })
    }
    setError(null)
  }, [rate, open])

  const handleSubmit = async () => {
    if (!formData.name || !formData.hourlyRate || !formData.skillLevel) {
      setError('Please fill in all required fields')
      return
    }

    const hourlyRate = parseFloat(formData.hourlyRate)
    if (isNaN(hourlyRate) || hourlyRate <= 0) {
      setError('Please enter a valid hourly rate')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const requestData = {
        name: formData.name,
        description: formData.description || undefined,
        hourlyRate,
        skillLevel: formData.skillLevel,
        category: formData.category,
        effectiveDate: format(formData.effectiveDate, 'yyyy-MM-dd'),
        expiryDate: formData.expiryDate ? format(formData.expiryDate, 'yyyy-MM-dd') : undefined,
      }

      const url = rate ? `/api/labor-rates/${rate.id}` : '/api/labor-rates'
      const method = rate ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to ${rate ? 'update' : 'create'} labor rate`)
      }

      if (rate) {
        onRateUpdated?.()
      } else {
        onRateCreated?.()
      }
      onClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : `Failed to ${rate ? 'update' : 'create'} labor rate`)
    } finally {
      setLoading(false)
    }
  }

  const isEditing = Boolean(rate)

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MoneyIcon color="primary" />
              <Typography variant="h6">
                {isEditing ? 'Edit Labor Rate' : 'Add New Labor Rate'}
              </Typography>
            </Box>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            {/* Basic Information */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Rate Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    fullWidth
                    placeholder="e.g., Senior Electrician"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Hourly Rate"
                    type="number"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                    required
                    fullWidth
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                    inputProps={{ min: 0, step: 0.50 }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="Optional description of this rate..."
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Classification */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Classification
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth required>
                    <InputLabel>Skill Level</InputLabel>
                    <Select
                      value={formData.skillLevel}
                      onChange={(e) => setFormData({ ...formData, skillLevel: e.target.value })}
                      label="Skill Level"
                    >
                      {skillLevels.map((level) => (
                        <MenuItem key={level.value} value={level.value}>
                          {level.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      label="Category"
                    >
                      {categories.map((cat) => (
                        <MenuItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>

            {/* Effective Period */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Effective Period
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DatePicker
                    label="Effective Date"
                    value={formData.effectiveDate}
                    onChange={(date) => setFormData({ ...formData, effectiveDate: date || new Date() })}
                    slotProps={{ textField: { required: true, fullWidth: true } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DatePicker
                    label="Expiry Date (Optional)"
                    value={formData.expiryDate}
                    onChange={(date) => setFormData({ ...formData, expiryDate: date })}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Rate Preview */}
            {formData.hourlyRate && (
              <Box sx={{ p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
                <Typography variant="h6" gutterBottom>
                  Rate Preview
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                      Hourly Rate
                    </Typography>
                    <Typography variant="h6">
                      ${parseFloat(formData.hourlyRate || '0').toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                      Daily Rate (8 hours)
                    </Typography>
                    <Typography variant="h6">
                      ${(parseFloat(formData.hourlyRate || '0') * 8).toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                      Weekly Rate (40 hours)
                    </Typography>
                    <Typography variant="h6">
                      ${(parseFloat(formData.hourlyRate || '0') * 40).toFixed(2)}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !formData.name || !formData.hourlyRate || !formData.skillLevel}
            sx={{
              backgroundColor: '#e14eca',
              '&:hover': {
                backgroundColor: '#d236b8',
              },
            }}
          >
            {loading ? 'Saving...' : isEditing ? 'Update Rate' : 'Create Rate'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  )
}