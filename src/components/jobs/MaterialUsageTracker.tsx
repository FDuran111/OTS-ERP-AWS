'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Alert,
  Stack,
  Tooltip,
  CircularProgress,
  Autocomplete,
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Warning as WarningIcon,
  Inventory as InventoryIcon,
} from '@mui/icons-material'
import { format } from 'date-fns'

interface Material {
  id: string
  code: string
  name: string
  unit: string
  cost: number
  inStock: number
  category: string
}

interface MaterialUsage {
  id: string
  jobId: string
  materialId: string
  materialCode: string
  materialName: string
  materialUnit: string
  materialCategory: string
  jobPhaseId?: string
  phaseName?: string
  userId?: string
  userName?: string
  quantityUsed: number
  unitCost: number
  totalCost: number
  usageType: string
  notes?: string
  usedAt: string
  source?: 'manual' | 'time_entry'
  createdAt: string
  updatedAt: string
}

interface MaterialSummary {
  materialId: string
  materialCode: string
  materialName: string
  materialUnit: string
  totalQuantity: number
  totalCost: number
  usageCount: number
}

interface MaterialUsageTrackerProps {
  jobId: string
  phases?: Array<{ id: string; name: string }>
}

export default function MaterialUsageTracker({ jobId, phases = [] }: MaterialUsageTrackerProps) {
  const [usage, setUsage] = useState<MaterialUsage[]>([])
  const [summary, setSummary] = useState<MaterialSummary[]>([])
  const [totalCost, setTotalCost] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [availableMaterials, setAvailableMaterials] = useState<Material[]>([])
  
  // Form state
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [quantityUsed, setQuantityUsed] = useState<number>(0)
  const [usageType, setUsageType] = useState<string>('CONSUMED')
  const [selectedPhase, setSelectedPhase] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchMaterialUsage()
    fetchAvailableMaterials()
  }, [jobId])

  const fetchMaterialUsage = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/jobs/${jobId}/materials`)
      if (!response.ok) throw new Error('Failed to fetch material usage')
      
      const data = await response.json()
      setUsage(data.usage || [])
      setSummary(data.summary || [])
      setTotalCost(data.totalCost || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load material usage')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableMaterials = async () => {
    try {
      const response = await fetch('/api/materials')
      if (response.ok) {
        const data = await response.json()
        setAvailableMaterials(data.filter((m: Material) => m.inStock > 0))
      }
    } catch (err) {
      console.error('Error fetching materials:', err)
    }
  }

  const handleSubmit = async () => {
    if (!selectedMaterial || quantityUsed <= 0) return

    try {
      setSubmitting(true)
      const response = await fetch(`/api/jobs/${jobId}/materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialId: selectedMaterial.id,
          jobPhaseId: selectedPhase || undefined,
          quantityUsed,
          usageType,
          notes: notes || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to record material usage')
      }

      await fetchMaterialUsage()
      await fetchAvailableMaterials() // Refresh stock levels
      handleCloseDialog()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record material usage')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenDialog = () => {
    setDialogOpen(true)
    setSelectedMaterial(null)
    setQuantityUsed(0)
    setUsageType('CONSUMED')
    setSelectedPhase('')
    setNotes('')
    setError(null)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
  }

  const getUsageTypeColor = (type: string) => {
    switch (type) {
      case 'CONSUMED': return 'primary'
      case 'WASTED': return 'error'
      case 'RETURNED': return 'success'
      case 'TRANSFERRED': return 'info'
      case 'TIME_ENTRY': return 'secondary'
      case 'OFF_TRUCK': return 'warning'
      default: return 'default'
    }
  }

  const getUsageTypeLabel = (type: string) => {
    switch (type) {
      case 'TIME_ENTRY': return 'Time Entry'
      case 'OFF_TRUCK': return 'Off Truck'
      default: return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
    }
  }

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading material usage...</Typography>
      </Box>
    )
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Material Usage & Tracking
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
          sx={{ backgroundColor: '#e14eca' }}
        >
          Record Usage
        </Button>
      </Box>

      {/* Summary Cards */}
      {summary.length > 0 && (
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography color="text.secondary" variant="caption">
                Total Materials Used
              </Typography>
              <Typography variant="h6">{summary.length}</Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography color="text.secondary" variant="caption">
                Total Usage Entries
              </Typography>
              <Typography variant="h6">{usage.length}</Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography color="text.secondary" variant="caption">
                Total Material Cost
              </Typography>
              <Typography variant="h6" color="primary">
                {formatCurrency(totalCost)}
              </Typography>
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* Material Summary Table */}
      {summary.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Material Summary
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Material</TableCell>
                    <TableCell align="right">Total Quantity</TableCell>
                    <TableCell align="right">Total Cost</TableCell>
                    <TableCell align="right">Usage Count</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summary.map((item) => (
                    <TableRow key={item.materialId}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {item.materialCode} - {item.materialName}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {item.totalQuantity.toLocaleString()} {item.materialUnit}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(item.totalCost)}
                      </TableCell>
                      <TableCell align="right">
                        {item.usageCount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Usage History Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Usage History
          </Typography>
          {usage.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <InventoryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography color="text.secondary">
                No material usage recorded yet
              </Typography>
              <Button
                variant="outlined"
                onClick={handleOpenDialog}
                sx={{ mt: 2 }}
              >
                Record First Usage
              </Button>
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date/Time</TableCell>
                    <TableCell>Material</TableCell>
                    <TableCell>Phase</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Cost</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {usage.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <Typography variant="body2">
                          {format(new Date(item.usedAt), 'MMM dd, yyyy')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(item.usedAt), 'HH:mm')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {item.materialCode}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.materialName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {item.phaseName || '-'}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {item.quantityUsed.toLocaleString()} {item.materialUnit}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Chip
                            label={getUsageTypeLabel(item.usageType)}
                            size="small"
                            color={getUsageTypeColor(item.usageType) as any}
                            variant="outlined"
                          />
                          {item.source === 'time_entry' && (
                            <Chip
                              label="From Time Entry"
                              size="small"
                              variant="filled"
                              sx={{ bgcolor: 'info.light', color: 'info.contrastText' }}
                            />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(item.totalCost)}
                      </TableCell>
                      <TableCell>
                        {item.userName || 'System'}
                      </TableCell>
                      <TableCell>
                        {item.notes && (
                          <Tooltip title={item.notes}>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                maxWidth: 100,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'block'
                              }}
                            >
                              {item.notes}
                            </Typography>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Add Material Usage Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Record Material Usage</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={3}>
            <Autocomplete
              options={availableMaterials}
              getOptionLabel={(option) => `${option.code} - ${option.name} (${option.inStock} ${option.unit} available)`}
              value={selectedMaterial}
              onChange={(_, newValue) => setSelectedMaterial(newValue)}
              renderInput={(params) => (
                <TextField {...params} label="Material" required />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {option.code} - {option.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Available: {option.inStock} {option.unit} | Cost: ${option.cost.toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              )}
            />

            <TextField
              label="Quantity Used"
              type="number"
              value={quantityUsed}
              onChange={(e) => setQuantityUsed(parseFloat(e.target.value) || 0)}
              required
              inputProps={{ min: 0, step: 0.01 }}
              helperText={selectedMaterial && quantityUsed > selectedMaterial.inStock ? 
                `Warning: Only ${selectedMaterial.inStock} ${selectedMaterial.unit} available` : ''}
              error={selectedMaterial ? quantityUsed > selectedMaterial.inStock : false}
            />

            <FormControl>
              <InputLabel>Usage Type</InputLabel>
              <Select
                value={usageType}
                onChange={(e) => setUsageType(e.target.value)}
                label="Usage Type"
              >
                <MenuItem value="CONSUMED">Consumed</MenuItem>
                <MenuItem value="WASTED">Wasted</MenuItem>
                <MenuItem value="RETURNED">Returned</MenuItem>
                <MenuItem value="TRANSFERRED">Transferred</MenuItem>
              </Select>
            </FormControl>

            {phases.length > 0 && (
              <FormControl>
                <InputLabel>Job Phase (Optional)</InputLabel>
                <Select
                  value={selectedPhase}
                  onChange={(e) => setSelectedPhase(e.target.value)}
                  label="Job Phase (Optional)"
                >
                  <MenuItem value="">No specific phase</MenuItem>
                  {phases.map((phase) => (
                    <MenuItem key={phase.id} value={phase.id}>
                      {phase.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <TextField
              label="Notes (Optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              multiline
              rows={2}
            />

            {selectedMaterial && quantityUsed > 0 && (
              <Alert severity="info">
                Estimated cost: {formatCurrency(quantityUsed * selectedMaterial.cost)}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!selectedMaterial || quantityUsed <= 0 || submitting}
          >
            {submitting ? 'Recording...' : 'Record Usage'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}