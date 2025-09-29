'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Autocomplete,
  TextField,
  Stack,
  Divider,
} from '@mui/material'
import {
  Add as AddIcon,
  Close as CloseIcon,
  LocalShipping as ShippingIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

interface StorageLocation {
  id: string
  name: string
  code: string
  type: string
}

interface Material {
  id: string
  code: string
  name: string
  unit: string
  inStock: number
  stockLocations?: {
    id: string
    quantity: number
    location: StorageLocation
  }[]
}

interface TransferItem {
  materialId: string
  quantity: number
  material?: {
    code: string
    name: string
    unit: string
  }
  availableAtSource?: number
}

interface Transfer {
  id: string
  referenceNumber: string
  status: string
  fromLocationId: string
  toLocationId: string
  requestedBy?: string
  notes?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
  fromLocation: StorageLocation
  toLocation: StorageLocation
  items: TransferItem[]
}

interface MaterialTransfersProps {
  open: boolean
  onClose: () => void
  onTransferCompleted: () => void
}

export default function MaterialTransfers({
  open,
  onClose,
  onTransferCompleted,
}: MaterialTransfersProps) {
  const [tabValue, setTabValue] = useState(0)
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null)

  useEffect(() => {
    if (open) {
      fetchTransfers()
    }
  }, [open])

  const fetchTransfers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/stock-transfers', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      })

      if (!response.ok) throw new Error('Failed to fetch transfers')

      const data = await response.json()
      setTransfers(data)
    } catch (error) {
      console.error('Error fetching transfers:', error)
      toast.error('Failed to load transfers')
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteTransfer = async (transfer: Transfer) => {
    if (!confirm(`Complete transfer ${transfer.referenceNumber}? This will move the materials.`)) {
      return
    }

    try {
      const response = await fetch(`/api/stock-transfers/${transfer.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to complete transfer')
      }

      toast.success('Transfer completed successfully')
      fetchTransfers()
      onTransferCompleted()
    } catch (error) {
      console.error('Error completing transfer:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to complete transfer')
    }
  }

  const handleCancelTransfer = async (transfer: Transfer) => {
    if (!confirm(`Cancel transfer ${transfer.referenceNumber}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/stock-transfers/${transfer.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to cancel transfer')
      }

      toast.success('Transfer cancelled')
      fetchTransfers()
      onTransferCompleted()
    } catch (error) {
      console.error('Error cancelling transfer:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to cancel transfer')
    }
  }

  const handleMarkInTransit = async (transfer: Transfer) => {
    try {
      const response = await fetch(`/api/stock-transfers/${transfer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_TRANSIT' }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update transfer')
      }

      toast.success('Transfer marked as in transit')
      fetchTransfers()
    } catch (error) {
      console.error('Error updating transfer:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update transfer')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'warning'
      case 'IN_TRANSIT':
        return 'info'
      case 'COMPLETED':
        return 'success'
      default:
        return 'default'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <PendingIcon fontSize="small" />
      case 'IN_TRANSIT':
        return <ShippingIcon fontSize="small" />
      case 'COMPLETED':
        return <CheckCircleIcon fontSize="small" />
      default:
        return null
    }
  }

  const filteredTransfers = transfers.filter((t) => {
    if (tabValue === 0) return t.status === 'PENDING' || t.status === 'IN_TRANSIT'
    if (tabValue === 1) return t.status === 'COMPLETED'
    return true
  })

  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="lg" 
        fullWidth
        fullScreen
        PaperProps={{
          sx: {
            height: '100%',
            m: 0,
            borderRadius: 0,
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: 'primary.main', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShippingIcon />
            Material Transfers
          </Box>
          <IconButton onClick={onClose} sx={{ color: 'white' }} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Tabs 
            value={tabValue} 
            onChange={(_, newValue) => setTabValue(newValue)}
            sx={{ px: 2 }}
          >
            <Tab label="Active" />
            <Tab label="Completed" />
          </Tabs>
        </Box>

        <DialogContent sx={{ p: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ mb: 2 }}
            fullWidth
          >
            Create New Transfer
          </Button>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredTransfers.length === 0 ? (
            <Alert severity="info">
              No {tabValue === 0 ? 'active' : 'completed'} transfers found
            </Alert>
          ) : (
            <Stack spacing={2}>
              {filteredTransfers.map((transfer) => (
                <Card key={transfer.id} variant="outlined">
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {transfer.referenceNumber}
                        </Typography>
                        <Chip
                          label={transfer.status}
                          color={getStatusColor(transfer.status) as any}
                          size="small"
                          icon={getStatusIcon(transfer.status) || undefined}
                          sx={{ mb: 1 }}
                        />
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedTransfer(transfer)
                          setViewDialogOpen(true)
                        }}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Box>

                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        From: <strong>{transfer.fromLocation.name}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        To: <strong>{transfer.toLocation.name}</strong>
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {transfer.items.length} item(s) • Created {format(new Date(transfer.createdAt), 'MMM dd, yyyy HH:mm')}
                      </Typography>
                    </Box>

                    {transfer.notes && (
                      <Typography variant="body2" sx={{ mt: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                        {transfer.notes}
                      </Typography>
                    )}

                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      {transfer.status === 'PENDING' && (
                        <>
                          <Button
                            size="small"
                            variant="contained"
                            color="info"
                            startIcon={<ShippingIcon />}
                            onClick={() => handleMarkInTransit(transfer)}
                            fullWidth
                          >
                            Mark In Transit
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => handleCancelTransfer(transfer)}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                      {transfer.status === 'IN_TRANSIT' && (
                        <>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<CheckCircleIcon />}
                            onClick={() => handleCompleteTransfer(transfer)}
                            fullWidth
                          >
                            Complete Transfer
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => handleCancelTransfer(transfer)}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} fullWidth size="large">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <CreateTransferDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onTransferCreated={() => {
          fetchTransfers()
          onTransferCompleted()
          setCreateDialogOpen(false)
        }}
      />

      <ViewTransferDialog
        transfer={selectedTransfer}
        open={viewDialogOpen}
        onClose={() => {
          setViewDialogOpen(false)
          setSelectedTransfer(null)
        }}
      />
    </>
  )
}

function CreateTransferDialog({
  open,
  onClose,
  onTransferCreated,
}: {
  open: boolean
  onClose: () => void
  onTransferCreated: () => void
}) {
  const [locations, setLocations] = useState<StorageLocation[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [fromLocation, setFromLocation] = useState<StorageLocation | null>(null)
  const [toLocation, setToLocation] = useState<StorageLocation | null>(null)
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<TransferItem[]>([])
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [quantity, setQuantity] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [locationsRes, materialsRes] = await Promise.all([
        fetch('/api/storage-locations', { cache: 'no-store' }),
        fetch('/api/materials', { cache: 'no-store' }),
      ])

      if (locationsRes.ok) setLocations(await locationsRes.json())
      if (materialsRes.ok) setMaterials(await materialsRes.json())
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = () => {
    if (!selectedMaterial || !quantity || !fromLocation) {
      toast.error('Please select material, enter quantity, and select source location')
      return
    }

    const qty = parseFloat(quantity)
    if (isNaN(qty) || qty <= 0) {
      toast.error('Please enter a valid quantity')
      return
    }

    const stockAtLocation = selectedMaterial.stockLocations?.find(
      (sl) => sl.location.id === fromLocation.id
    )
    const available = stockAtLocation?.quantity || 0

    if (qty > available) {
      toast.error(`Only ${available} ${selectedMaterial.unit} available at ${fromLocation.name}`)
      return
    }

    setItems([
      ...items,
      {
        materialId: selectedMaterial.id,
        quantity: qty,
        material: {
          code: selectedMaterial.code,
          name: selectedMaterial.name,
          unit: selectedMaterial.unit,
        },
        availableAtSource: available,
      },
    ])

    setSelectedMaterial(null)
    setQuantity('')
    toast.success('Item added to transfer')
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!fromLocation || !toLocation || items.length === 0) {
      toast.error('Please select locations and add at least one item')
      return
    }

    if (fromLocation.id === toLocation.id) {
      toast.error('Source and destination locations must be different')
      return
    }

    try {
      setSubmitting(true)

      const response = await fetch('/api/stock-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromLocationId: fromLocation.id,
          toLocationId: toLocation.id,
          items: items.map((item) => ({
            materialId: item.materialId,
            quantity: item.quantity,
          })),
          notes: notes || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create transfer')
      }

      toast.success('Transfer created successfully')
      onTransferCreated()
    } catch (error) {
      console.error('Error creating transfer:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create transfer')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredMaterials = fromLocation
    ? materials.filter((m) =>
        m.stockLocations?.some((sl) => sl.location.id === fromLocation.id && sl.quantity > 0)
      )
    : []

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Create Material Transfer</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2}>
          <Autocomplete
            value={fromLocation}
            onChange={(_, newValue) => {
              setFromLocation(newValue)
              setItems([])
            }}
            options={locations}
            getOptionLabel={(option) => `${option.name} (${option.code})`}
            renderInput={(params) => (
              <TextField {...params} label="From Location *" placeholder="Select source location" />
            )}
          />

          <Autocomplete
            value={toLocation}
            onChange={(_, newValue) => setToLocation(newValue)}
            options={locations.filter((l) => l.id !== fromLocation?.id)}
            getOptionLabel={(option) => `${option.name} (${option.code})`}
            renderInput={(params) => (
              <TextField {...params} label="To Location *" placeholder="Select destination location" />
            )}
            disabled={!fromLocation}
          />

          <Divider />

          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Transfer Items
          </Typography>

          <Autocomplete
            value={selectedMaterial}
            onChange={(_, newValue) => setSelectedMaterial(newValue)}
            options={filteredMaterials}
            getOptionLabel={(option) => `${option.code} - ${option.name}`}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Material"
                placeholder={fromLocation ? 'Search materials...' : 'Select source location first'}
              />
            )}
            renderOption={(props, option) => {
              const stockAtLocation = option.stockLocations?.find(
                (sl) => sl.location.id === fromLocation?.id
              )
              return (
                <li {...props} key={option.id}>
                  <Box sx={{ width: '100%' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {option.code} - {option.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Available: {stockAtLocation?.quantity || 0} {option.unit}
                    </Typography>
                  </Box>
                </li>
              )
            }}
            disabled={!fromLocation}
          />

          {selectedMaterial && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label={`Quantity (${selectedMaterial.unit})`}
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                inputProps={{ min: 0, step: 0.1 }}
                sx={{ flex: 1 }}
              />
              <Button variant="contained" onClick={handleAddItem} disabled={!quantity}>
                Add
              </Button>
            </Box>
          )}

          {items.length > 0 && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Material</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {item.material?.code} - {item.material?.name}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {item.quantity} {item.material?.unit}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="error" onClick={() => handleRemoveItem(index)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <TextField
            label="Notes (Optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            rows={2}
            placeholder="Add any notes about this transfer..."
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={submitting || !fromLocation || !toLocation || items.length === 0}
          startIcon={submitting ? <CircularProgress size={20} /> : <CheckCircleIcon />}
        >
          {submitting ? 'Creating...' : 'Create Transfer'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function ViewTransferDialog({
  transfer,
  open,
  onClose,
}: {
  transfer: Transfer | null
  open: boolean
  onClose: () => void
}) {
  if (!transfer) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Transfer Details: {transfer.referenceNumber}
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="caption" color="text.secondary">Status</Typography>
            <Chip
              label={transfer.status}
              color={
                transfer.status === 'COMPLETED'
                  ? 'success'
                  : transfer.status === 'IN_TRANSIT'
                  ? 'info'
                  : 'warning'
              }
              size="small"
              sx={{ mt: 0.5 }}
            />{' '}
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">From Location</Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {transfer.fromLocation.name} ({transfer.fromLocation.code})
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">To Location</Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {transfer.toLocation.name} ({transfer.toLocation.code})
            </Typography>
          </Box>

          {transfer.notes && (
            <Box>
              <Typography variant="caption" color="text.secondary">Notes</Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {transfer.notes}
              </Typography>
            </Box>
          )}

          <Divider />

          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Transfer Items ({transfer.items.length})
          </Typography>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Material</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transfer.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {item.material?.code} - {item.material?.name}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {item.quantity} {item.material?.unit}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">Created</Typography>
            <Typography variant="body2">
              {format(new Date(transfer.createdAt), 'MMMM dd, yyyy HH:mm')}
            </Typography>
          </Box>

          {transfer.completedAt && (
            <Box>
              <Typography variant="caption" color="text.secondary">Completed</Typography>
              <Typography variant="body2">
                {format(new Date(transfer.completedAt), 'MMMM dd, yyyy HH:mm')}
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
