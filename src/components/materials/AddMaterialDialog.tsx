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

interface Vendor {
  id: string
  name: string
  code: string
}

interface AddMaterialDialogProps {
  open: boolean
  onClose: () => void
  onMaterialCreated: () => void
}

const materialSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  manufacturer: z.string().optional(),
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

const commonManufacturers = [
  'Square D',
  'Schneider Electric',
  'Eaton',
  'General Electric',
  'Siemens',
  'ABB',
  'Leviton',
  'Hubbell',
  'Legrand',
  'Cooper',
  'Lutron',
  'Pass & Seymour',
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

export default function AddMaterialDialog({ open, onClose, onMaterialCreated }: AddMaterialDialogProps) {
  const [vendors, setVendors] = useState<Vendor[]>([])
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
    defaultValues: {
      markup: 1.5,
      inStock: 0,
      minStock: 0,
    }
  })

  const watchedCost = watch('cost')
  const watchedMarkup = watch('markup')

  useEffect(() => {
    if (open) {
      fetchVendors()
    }
  }, [open])

  // Auto-calculate price based on cost and markup
  useEffect(() => {
    if (watchedCost && watchedMarkup) {
      const calculatedPrice = watchedCost * watchedMarkup
      setValue('price', Math.round(calculatedPrice * 100) / 100)
    }
  }, [watchedCost, watchedMarkup, setValue])

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/vendors')
      if (response.ok) {
        const data = await response.json()
        setVendors(data)
      }
    } catch (error) {
      console.error('Error fetching vendors:', error)
    }
  }

  const onSubmit = async (data: MaterialFormData) => {
    try {
      setSubmitting(true)

      const submitData = {
        ...data,
        markup: data.markup ?? 1.5,
        inStock: data.inStock ?? 0,
        minStock: data.minStock ?? 0,
      }

      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create material')
      }

      onMaterialCreated()
      onClose()
      reset()
    } catch (error) {
      console.error('Error creating material:', error)
      alert(error instanceof Error ? error.message : 'Failed to create material')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Add New Material</DialogTitle>
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
            <Grid xs={12}>
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

            {/* Manufacturer/Brand */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="manufacturer"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Brand/Manufacturer</InputLabel>
                    <Select {...field} value={field.value || ''} label="Brand/Manufacturer">
                      <MenuItem value="">Not Specified</MenuItem>
                      {commonManufacturers.map((manufacturer) => (
                        <MenuItem key={manufacturer} value={manufacturer}>
                          {manufacturer}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
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
                    <Select {...field} value={field.value || ''} label="Category *">
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
                    <Select {...field} value={field.value || ''} label="Unit *">
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
                  <TextField
                    {...field}
                    label="Storage Location"
                    fullWidth
                    placeholder="e.g., A1-B2"
                  />
                )}
              />
            </Grid>

            {/* Vendor */}
            <Grid xs={12}>
              <Controller
                name="vendorId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Vendor (Optional)</InputLabel>
                    <Select {...field} value={field.value || ''} label="Vendor (Optional)">
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
            {submitting ? 'Creating...' : 'Create Material'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}