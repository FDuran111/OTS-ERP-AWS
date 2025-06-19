'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Grid,
  Alert,
  Autocomplete,
  Tooltip,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Cancel as CancelIcon,
  Inventory as InventoryIcon,
  Warning as WarningIcon,
} from '@mui/icons-material'

interface Material {
  id: string
  code: string
  name: string
  unit: string
  cost: number
  inStock: number
  minStock: number
  totalReserved: number
  availableStock: number
}

interface JobPhase {
  id: string
  name: string
  status: string
}

interface Reservation {
  id: string
  jobId: string
  materialId: string
  materialCode: string
  materialName: string
  materialUnit: string
  phaseId?: string
  phaseName?: string
  quantityReserved: number
  fulfilledQuantity: number
  remainingQuantity: number
  reservedAt: string
  neededBy?: string
  status: 'ACTIVE' | 'FULFILLED' | 'EXPIRED' | 'CANCELLED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  notes?: string
  availableStock: number
}

interface JobMaterialReservationsProps {
  jobId: string
  jobTitle: string
}

export default function JobMaterialReservations({ jobId, jobTitle }: JobMaterialReservationsProps) {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [jobPhases, setJobPhases] = useState<JobPhase[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [fulfillDialogOpen, setFulfillDialogOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    materialId: '',
    phaseId: '',
    quantityReserved: '',
    neededBy: '',
    priority: 'MEDIUM' as const,
    notes: '',
  })

  const [fulfillData, setFulfillData] = useState({
    quantityFulfilled: '',
    notes: '',
  })

  useEffect(() => {
    fetchData()
  }, [jobId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [reservationsRes, materialsRes, phasesRes] = await Promise.all([
        fetch(`/api/reservations?jobId=${jobId}`),
        fetch('/api/materials/combined'),
        fetch(`/api/jobs/${jobId}/phases`)
      ])

      if (reservationsRes.ok) {
        const reservationsData = await reservationsRes.json()
        setReservations(reservationsData)
      }

      if (materialsRes.ok) {
        const materialsData = await materialsRes.json()
        setMaterials(materialsData.materials)
      }

      if (phasesRes.ok) {
        const phasesData = await phasesRes.json()
        setJobPhases(phasesData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateReservation = async () => {
    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId,
          materialId: formData.materialId,
          phaseId: formData.phaseId || null,
          quantityReserved: parseFloat(formData.quantityReserved),
          neededBy: formData.neededBy || null,
          priority: formData.priority,
          notes: formData.notes || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create reservation')
      }

      setDialogOpen(false)
      setFormData({
        materialId: '',
        phaseId: '',
        quantityReserved: '',
        neededBy: '',
        priority: 'MEDIUM',
        notes: '',
      })
      fetchData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create reservation')
    }
  }

  const handleFulfillReservation = async () => {
    if (!selectedReservation) return

    try {
      const response = await fetch(`/api/reservations/${selectedReservation.id}/fulfill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantityFulfilled: parseFloat(fulfillData.quantityFulfilled),
          notes: fulfillData.notes || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fulfill reservation')
      }

      setFulfillDialogOpen(false)
      setSelectedReservation(null)
      setFulfillData({ quantityFulfilled: '', notes: '' })
      fetchData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fulfill reservation')
    }
  }

  const handleCancelReservation = async (reservationId: string) => {
    try {
      const response = await fetch(`/api/reservations/${reservationId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to cancel reservation')
      }

      fetchData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to cancel reservation')
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'error'
      case 'HIGH': return 'warning'
      case 'MEDIUM': return 'info'
      case 'LOW': return 'default'
      default: return 'default'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'primary'
      case 'FULFILLED': return 'success'
      case 'EXPIRED': return 'warning'
      case 'CANCELLED': return 'error'
      default: return 'default'
    }
  }

  const selectedMaterial = materials.find(m => m.id === formData.materialId)

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <Typography>Loading material reservations...</Typography>
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
          Material Reservations - {jobTitle}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Reserve Material
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <InventoryIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h6">
                    {reservations.filter(r => r.status === 'ACTIVE').length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Active Reservations
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckIcon sx={{ mr: 1, color: 'success.main' }} />
                <Box>
                  <Typography variant="h6">
                    {reservations.filter(r => r.status === 'FULFILLED').length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Fulfilled
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <WarningIcon sx={{ mr: 1, color: 'warning.main' }} />
                <Box>
                  <Typography variant="h6">
                    {reservations.filter(r => r.priority === 'URGENT' || r.priority === 'HIGH').length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    High Priority
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ mr: 1 }}>
                  $
                </Typography>
                <Box>
                  <Typography variant="h6">
                    {reservations.reduce((sum, r) => {
                      const material = materials.find(m => m.id === r.materialId)
                      return sum + (r.remainingQuantity * (material?.cost || 0))
                    }, 0).toFixed(2)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Reserved Value
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Reservations Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Material</TableCell>
              <TableCell>Phase</TableCell>
              <TableCell align="right">Reserved</TableCell>
              <TableCell align="right">Fulfilled</TableCell>
              <TableCell align="right">Remaining</TableCell>
              <TableCell align="right">Available Stock</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reservations.map((reservation) => (
              <TableRow key={reservation.id}>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {reservation.materialCode}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {reservation.materialName}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  {reservation.phaseName || 'No Phase'}
                </TableCell>
                <TableCell align="right">
                  {reservation.quantityReserved} {reservation.materialUnit}
                </TableCell>
                <TableCell align="right">
                  {reservation.fulfilledQuantity} {reservation.materialUnit}
                </TableCell>
                <TableCell align="right">
                  <Typography 
                    color={reservation.remainingQuantity > 0 ? 'text.primary' : 'text.secondary'}
                    fontWeight={reservation.remainingQuantity > 0 ? 'medium' : 'normal'}
                  >
                    {reservation.remainingQuantity} {reservation.materialUnit}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography 
                    color={reservation.availableStock < reservation.remainingQuantity ? 'error' : 'text.primary'}
                  >
                    {reservation.availableStock} {reservation.materialUnit}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={reservation.priority} 
                    size="small" 
                    color={getPriorityColor(reservation.priority) as any}
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={reservation.status} 
                    size="small" 
                    color={getStatusColor(reservation.status) as any}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {reservation.status === 'ACTIVE' && reservation.remainingQuantity > 0 && (
                      <Tooltip title="Fulfill Reservation">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedReservation(reservation)
                            setFulfillData({
                              quantityFulfilled: reservation.remainingQuantity.toString(),
                              notes: ''
                            })
                            setFulfillDialogOpen(true)
                          }}
                        >
                          <CheckIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {reservation.status === 'ACTIVE' && (
                      <Tooltip title="Cancel Reservation">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleCancelReservation(reservation.id)}
                        >
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {reservations.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No material reservations for this job
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Reservation Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reserve Material</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Autocomplete
              options={materials}
              getOptionLabel={(option) => `${option.code} - ${option.name}`}
              value={materials.find(m => m.id === formData.materialId) || null}
              onChange={(_, value) => setFormData({ ...formData, materialId: value?.id || '' })}
              renderInput={(params) => (
                <TextField {...params} label="Material" required />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box>
                    <Typography variant="body2">{option.code} - {option.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Available: {option.availableStock} {option.unit} | 
                      In Stock: {option.inStock} {option.unit} | 
                      Reserved: {option.totalReserved} {option.unit}
                    </Typography>
                  </Box>
                </li>
              )}
            />

            {selectedMaterial && (
              <Alert 
                severity={selectedMaterial.availableStock > 0 ? 'info' : 'warning'}
                sx={{ mb: 1 }}
              >
                Available Stock: {selectedMaterial.availableStock} {selectedMaterial.unit}
                {selectedMaterial.availableStock === 0 && ' - This will create a purchase order requirement'}
              </Alert>
            )}

            <FormControl>
              <InputLabel>Job Phase</InputLabel>
              <Select
                value={formData.phaseId}
                label="Job Phase"
                onChange={(e) => setFormData({ ...formData, phaseId: e.target.value })}
              >
                <MenuItem value="">No Specific Phase</MenuItem>
                {jobPhases.map((phase) => (
                  <MenuItem key={phase.id} value={phase.id}>
                    {phase.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Quantity to Reserve"
              type="number"
              value={formData.quantityReserved}
              onChange={(e) => setFormData({ ...formData, quantityReserved: e.target.value })}
              required
              inputProps={{ min: 0, step: 0.01 }}
              helperText={selectedMaterial ? `Unit: ${selectedMaterial.unit}` : ''}
            />

            <TextField
              label="Needed By"
              type="datetime-local"
              value={formData.neededBy}
              onChange={(e) => setFormData({ ...formData, neededBy: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />

            <FormControl>
              <InputLabel>Priority</InputLabel>
              <Select
                value={formData.priority}
                label="Priority"
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              >
                <MenuItem value="LOW">Low</MenuItem>
                <MenuItem value="MEDIUM">Medium</MenuItem>
                <MenuItem value="HIGH">High</MenuItem>
                <MenuItem value="URGENT">Urgent</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Notes"
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateReservation} 
            variant="contained"
            disabled={!formData.materialId || !formData.quantityReserved}
          >
            Reserve Material
          </Button>
        </DialogActions>
      </Dialog>

      {/* Fulfill Reservation Dialog */}
      <Dialog open={fulfillDialogOpen} onClose={() => setFulfillDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Fulfill Material Reservation</DialogTitle>
        <DialogContent>
          {selectedReservation && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {selectedReservation.materialCode} - {selectedReservation.materialName}
              </Typography>
              <Typography variant="body2">
                Remaining to fulfill: {selectedReservation.remainingQuantity} {selectedReservation.materialUnit}
              </Typography>
              
              <TextField
                label="Quantity to Fulfill"
                type="number"
                value={fulfillData.quantityFulfilled}
                onChange={(e) => setFulfillData({ ...fulfillData, quantityFulfilled: e.target.value })}
                required
                inputProps={{ 
                  min: 0, 
                  max: selectedReservation.remainingQuantity, 
                  step: 0.01 
                }}
                helperText={`Max: ${selectedReservation.remainingQuantity} ${selectedReservation.materialUnit}`}
              />

              <TextField
                label="Notes"
                multiline
                rows={3}
                value={fulfillData.notes}
                onChange={(e) => setFulfillData({ ...fulfillData, notes: e.target.value })}
                placeholder="Optional notes about this fulfillment..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFulfillDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleFulfillReservation} 
            variant="contained"
            disabled={!fulfillData.quantityFulfilled}
          >
            Fulfill Reservation
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}