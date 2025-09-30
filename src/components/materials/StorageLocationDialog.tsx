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
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Box,
  Chip,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

interface StorageLocation {
  id: string
  name: string
  code: string
  type: string
  address?: string
  description?: string
  active: boolean
}

interface StorageLocationDialogProps {
  open: boolean
  onClose: () => void
  onLocationsUpdated: () => void
}

const locationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  type: z.enum(['WAREHOUSE', 'SHOP', 'TRUCK', 'OFFICE', 'SUPPLIER']),
  address: z.string().optional(),
  description: z.string().optional(),
})

type LocationFormData = z.infer<typeof locationSchema>

export default function StorageLocationDialog({ open, onClose, onLocationsUpdated }: StorageLocationDialogProps) {
  const [locations, setLocations] = useState<StorageLocation[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingLocation, setEditingLocation] = useState<StorageLocation | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
  })

  useEffect(() => {
    if (open) {
      fetchLocations()
    }
  }, [open])

  const fetchLocations = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth-token')
      const response = await fetch('/api/storage-locations', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setLocations(data)
      }
    } catch (error) {
      console.error('Error fetching locations:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: LocationFormData) => {
    try {
      setSubmitting(true)
      
      const url = editingLocation 
        ? `/api/storage-locations/${editingLocation.id}`
        : '/api/storage-locations'
      
      const method = editingLocation ? 'PATCH' : 'POST'

      const token = localStorage.getItem('auth-token')
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save location')
      }

      await fetchLocations()
      onLocationsUpdated()
      reset()
      setShowAddForm(false)
      setEditingLocation(null)
    } catch (error) {
      console.error('Error saving location:', error)
      alert(error instanceof Error ? error.message : 'Failed to save location')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (location: StorageLocation) => {
    setEditingLocation(location)
    reset({
      name: location.name,
      code: location.code,
      type: location.type as any,
      address: location.address || '',
      description: location.description || '',
    })
    setShowAddForm(true)
  }

  const handleDelete = async (location: StorageLocation) => {
    if (!window.confirm(`Are you sure you want to delete "${location.name}"?`)) {
      return
    }

    try {
      const token = localStorage.getItem('auth-token')
      const response = await fetch(`/api/storage-locations/${location.id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete location')
      }

      await fetchLocations()
      onLocationsUpdated()
    } catch (error) {
      console.error('Error deleting location:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete location')
    }
  }

  const handleCancel = () => {
    reset()
    setShowAddForm(false)
    setEditingLocation(null)
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'WAREHOUSE': return 'primary'
      case 'SHOP': return 'success'
      case 'TRUCK': return 'warning'
      case 'OFFICE': return 'info'
      case 'SUPPLIER': return 'secondary'
      default: return 'default'
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Storage Locations Management
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {!showAddForm ? (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">Storage Locations</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setShowAddForm(true)}
                  sx={{
                    backgroundColor: '#e14eca',
                    '&:hover': { backgroundColor: '#d236b8' },
                  }}
                >
                  Add Location
                </Button>
              </Box>

              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Code</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Address</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {locations.map((location) => (
                      <TableRow key={location.id} hover>
                        <TableCell>{location.code}</TableCell>
                        <TableCell>{location.name}</TableCell>
                        <TableCell>
                          <Chip
                            label={location.type}
                            size="small"
                            color={getTypeColor(location.type) as any}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{location.address || '-'}</TableCell>
                        <TableCell>{location.description || '-'}</TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => handleEdit(location)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDelete(location)}>
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {locations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography color="text.secondary">No storage locations found</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <Typography variant="h6" gutterBottom>
                {editingLocation ? 'Edit Location' : 'Add New Location'}
              </Typography>
              
              <Grid container spacing={3} sx={{ mt: 1 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        value={field.value || ''}
                        label="Location Name *"
                        fullWidth
                        error={!!errors.name}
                        helperText={errors.name?.message}
                        placeholder="e.g., Main Warehouse"
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="code"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        value={field.value || ''}
                        label="Location Code *"
                        fullWidth
                        error={!!errors.code}
                        helperText={errors.code?.message}
                        placeholder="e.g., WH01"
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="type"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Location Type *</InputLabel>
                        <Select {...field} value={field.value || ''} label="Location Type *">
                          <MenuItem value="WAREHOUSE">Warehouse</MenuItem>
                          <MenuItem value="SHOP">Shop</MenuItem>
                          <MenuItem value="TRUCK">Truck</MenuItem>
                          <MenuItem value="OFFICE">Office</MenuItem>
                          <MenuItem value="SUPPLIER">Supplier</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="address"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        value={field.value || ''}
                        label="Address"
                        fullWidth
                        placeholder="Optional address"
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        value={field.value || ''}
                        label="Description"
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="Optional description"
                      />
                    )}
                  />
                </Grid>
              </Grid>

              <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                <Button onClick={handleCancel} disabled={submitting}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  disabled={submitting}
                  sx={{
                    backgroundColor: '#e14eca',
                    '&:hover': { backgroundColor: '#d236b8' },
                  }}
                >
                  {submitting ? 'Saving...' : (editingLocation ? 'Update' : 'Create')}
                </Button>
              </Box>
            </form>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}