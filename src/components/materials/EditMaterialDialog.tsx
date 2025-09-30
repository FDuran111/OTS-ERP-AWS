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
  InputAdornment,
} from '@mui/material'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

interface Material {
  id: string
  code: string
  name: string
  description?: string
  category: string
  unit: string
  cost: number
  price: number
  markup?: number
  vendorId?: string
  inStock: number
  minStock: number
  location?: string
  status: string
  vendor?: {
    id: string
    name: string
    code: string
  }
}

interface Vendor {
  id: string
  name: string
  code: string
}

interface StorageLocation {
  id: string
  name: string
  code: string
  type: string
}

interface EditMaterialDialogProps {
  open: boolean
  material: Material | null
  onClose: () => void
  onMaterialUpdated: () => void
}

const materialSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  unit: z.string().min(1, 'Unit is required'),
  cost: z.number().min(0, 'Cost must be positive'),
  price: z.number().min(0, 'Price must be positive'),
  markup: z.number().min(1, 'Markup must be at least 1').optional(),
  vendorId: z.string().optional(),
  inStock: z.number().int().min(0, 'Stock must be non-negative').optional(),
  minStock: z.number().int().min(0, 'Min stock must be non-negative').optional(),
  location: z.string().optional(),
})

type MaterialFormData = z.infer<typeof materialSchema>

const commonCategories = [
  'Wire',
  'Conduit',
  'Panels',
  'Breakers',
  'Devices',
  'Fixtures',
  'Tools',
  'Hardware',
  'Safety',
  'Other'
]

const commonUnits = [
  'ft',
  'units',
  'rolls',
  'boxes',
  'pieces',
  'lbs',
  'sticks',
  'gallons',
  'each'
]

export default function EditMaterialDialog({ open, material, onClose, onMaterialUpdated }: EditMaterialDialogProps) {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([])
  const [submitting, setSubmitting] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MaterialFormData>({
    resolver: zodResolver(materialSchema),
  })

  const watchedCost = watch('cost')
  const watchedMarkup = watch('markup')

  useEffect(() => {
    if (open && material) {
      fetchVendors()
      fetchStorageLocations()
      // Reset form with material data
      reset({
        code: material.code,
        name: material.name,
        description: material.description || '',
        category: material.category,
        unit: material.unit,
        cost: material.cost,
        price: material.price,
        markup: material.markup || (material.cost > 0 ? material.price / material.cost : 1.5),
        vendorId: material.vendorId || '',
        inStock: material.inStock,
        minStock: material.minStock,
        location: material.location || '',
      })
    }
  }, [open, material, reset])

  // Auto-calculate price based on cost and markup
  useEffect(() => {
    if (watchedCost && watchedMarkup) {
      const calculatedPrice = watchedCost * watchedMarkup
      setValue('price', Math.round(calculatedPrice * 100) / 100)
    }
  }, [watchedCost, watchedMarkup, setValue])

  const fetchVendors = async () => {
    try {
      const token = localStorage.getItem('auth-token')
      const response = await fetch('/api/vendors', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setVendors(data)
      }
    } catch (error) {
      console.error('Error fetching vendors:', error)
    }
  }

  const fetchStorageLocations = async () => {
    try {
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
        setStorageLocations(data)
      }
    } catch (error) {
      console.error('Error fetching storage locations:', error)
    }
  }

  const onSubmit = async (data: MaterialFormData) => {
    if (!material) return

    try {
      setSubmitting(true)

      const token = localStorage.getItem('auth-token')
      const response = await fetch(`/api/materials/${material.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update material')
      }

      onMaterialUpdated()
      onClose()
    } catch (error) {
      console.error('Error updating material:', error)
      alert(error instanceof Error ? error.message : 'Failed to update material')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  if (!material) return null

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Edit Material</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Code and Name */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="code"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Material Code *"
                    fullWidth
                    error={!!errors.code}
                    helperText={errors.code?.message}
                    placeholder="e.g., WIRE-12AWG-BLK"
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Material Name *"
                    fullWidth
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    placeholder="e.g., 12 AWG THHN Wire - Black"
                  />
                )}
              />
            </Grid>

            {/* Description */}
            <Grid size={{ xs: 12 }}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Description"
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="Additional details about the material..."
                  />
                )}
              />
            </Grid>

            {/* Category and Unit */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.category}>
                    <InputLabel>Category *</InputLabel>
                    <Select {...field} label="Category *">
                      {commonCategories.map((category) => (
                        <MenuItem key={category} value={category}>
                          {category}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.category && (
                      <Typography variant="caption" color="error">
                        {errors.category.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="unit"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.unit}>
                    <InputLabel>Unit *</InputLabel>
                    <Select {...field} label="Unit *">
                      {commonUnits.map((unit) => (
                        <MenuItem key={unit} value={unit}>
                          {unit}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.unit && (
                      <Typography variant="caption" color="error">
                        {errors.unit.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>

            {/* Pricing */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Controller
                name="cost"
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                  <TextField
                    {...field}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                    label="Cost *"
                    type="number"
                    fullWidth
                    error={!!errors.cost}
                    helperText={errors.cost?.message}
                    inputProps={{ min: 0, step: 0.01 }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>
                    }}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Controller
                name="markup"
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                  <TextField
                    {...field}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : 1)}
                    label="Markup *"
                    type="number"
                    fullWidth
                    error={!!errors.markup}
                    helperText={errors.markup?.message}
                    inputProps={{ min: 1, step: 0.1 }}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">x</InputAdornment>
                    }}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Controller
                name="price"
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                  <TextField
                    {...field}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                    label="Price *"
                    type="number"
                    fullWidth
                    error={!!errors.price}
                    helperText={errors.price?.message || 'Auto-calculated from cost × markup'}
                    inputProps={{ min: 0, step: 0.01 }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>
                    }}
                  />
                )}
              />
            </Grid>

            {/* Inventory */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Controller
                name="inStock"
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                  <TextField
                    {...field}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : 0)}
                    label="Current Stock"
                    type="number"
                    fullWidth
                    inputProps={{ min: 0 }}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Controller
                name="minStock"
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                  <TextField
                    {...field}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : 0)}
                    label="Minimum Stock"
                    type="number"
                    fullWidth
                    inputProps={{ min: 0 }}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Controller
                name="location"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Storage Location</InputLabel>
                    <Select {...field} value={field.value || ''} label="Storage Location">
                      <MenuItem value="">
                        <em>No location selected</em>
                      </MenuItem>
                      {storageLocations.map((location) => (
                        <MenuItem key={location.id} value={location.code}>
                          {location.name} ({location.code})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            {/* Vendor */}
            <Grid size={{ xs: 12 }}>
              <Controller
                name="vendorId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Vendor (Optional)</InputLabel>
                    <Select {...field} label="Vendor (Optional)">
                      <MenuItem value="">
                        <em>No vendor selected</em>
                      </MenuItem>
                      {vendors.map((vendor) => (
                        <MenuItem key={vendor.id} value={vendor.id}>
                          {vendor.name} ({vendor.code})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={submitting}
          >
            {submitting ? 'Updating...' : 'Update Material'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}