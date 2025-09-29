'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Card,
  CardContent,
  InputAdornment,
  Alert,
  Chip,
  IconButton,
  Autocomplete,
  CircularProgress,
  Stack,
  Fab,
} from '@mui/material'
import {
  Search as SearchIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Inventory as InventoryIcon,
  Close as CloseIcon,
  CameraAlt as CameraIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material'
import toast from 'react-hot-toast'

interface Material {
  id: string
  code: string
  name: string
  unit: string
  inStock: number
  availableStock: number
  category: string
}

interface QuickUsageItem {
  materialId: string
  materialName: string
  unit: string
  quantity: number
  action: 'ADD' | 'REMOVE'
}

interface QuickMaterialUsageProps {
  open: boolean
  onClose: () => void
  onStockUpdated: () => void
  jobId?: string
}

export default function QuickMaterialUsage({ 
  open, 
  onClose, 
  onStockUpdated,
  jobId 
}: QuickMaterialUsageProps) {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [quickItems, setQuickItems] = useState<QuickUsageItem[]>([])
  const [quickQuantity, setQuickQuantity] = useState('')
  const [quickAction, setQuickAction] = useState<'ADD' | 'REMOVE'>('REMOVE')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [clientRequestId] = useState(() => `quick-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)

  useEffect(() => {
    if (open) {
      fetchMaterials()
    }
  }, [open])

  const fetchMaterials = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth-token')
      const response = await fetch('/api/materials', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include'
      })
      
      if (!response.ok) throw new Error('Failed to fetch materials')
      
      const data = await response.json()
      setMaterials(data)
    } catch (error) {
      console.error('Error fetching materials:', error)
      toast.error('Failed to load materials')
    } finally {
      setLoading(false)
    }
  }

  const handleAddQuickItem = () => {
    if (!selectedMaterial || !quickQuantity) {
      toast.error('Please select a material and enter quantity')
      return
    }

    const quantity = parseFloat(quickQuantity)
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Please enter a valid quantity')
      return
    }

    if (quickAction === 'REMOVE' && quantity > selectedMaterial.availableStock) {
      toast.error(`Only ${selectedMaterial.availableStock} ${selectedMaterial.unit} available`)
      return
    }

    const existingIndex = quickItems.findIndex(
      item => item.materialId === selectedMaterial.id && item.action === quickAction
    )

    if (existingIndex >= 0) {
      const updated = [...quickItems]
      updated[existingIndex].quantity += quantity
      setQuickItems(updated)
    } else {
      setQuickItems([
        ...quickItems,
        {
          materialId: selectedMaterial.id,
          materialName: `${selectedMaterial.code} - ${selectedMaterial.name}`,
          unit: selectedMaterial.unit,
          quantity,
          action: quickAction,
        },
      ])
    }

    setQuickQuantity('')
    setSelectedMaterial(null)
    setSearchTerm('')
    toast.success(`${quantity} ${selectedMaterial.unit} added to batch`)
  }

  const handleRemoveQuickItem = (index: number) => {
    setQuickItems(quickItems.filter((_, i) => i !== index))
  }

  const handleSubmitAll = async () => {
    if (quickItems.length === 0) {
      toast.error('No items to submit')
      return
    }

    try {
      setSubmitting(true)

      const promises = quickItems.map(async (item) => {
        const response = await fetch('/api/stock-movements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            materialId: item.materialId,
            quantity: item.quantity,
            type: item.action,
            reason: reason || (jobId ? 'Used on job' : 'Quick adjustment'),
            jobId: jobId || undefined,
            clientRequestId: `${clientRequestId}-${item.materialId}`,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || `Failed to update ${item.materialName}`)
        }

        return response.json()
      })

      await Promise.all(promises)

      toast.success(`${quickItems.length} material(s) updated successfully`)
      setQuickItems([])
      setReason('')
      onStockUpdated()
      onClose()
    } catch (error) {
      console.error('Error submitting batch:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update materials')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredMaterials = materials.filter(m =>
    m.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalItems = quickItems.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
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
          <InventoryIcon />
          Quick Material Usage
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white' }} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {jobId && (
          <Alert severity="info" sx={{ mb: 1 }}>
            Materials will be logged to Job #{jobId}
          </Alert>
        )}

        <Box>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
            Select Material
          </Typography>
          <Autocomplete
            value={selectedMaterial}
            onChange={(_, newValue) => setSelectedMaterial(newValue)}
            inputValue={searchTerm}
            onInputChange={(_, newValue) => setSearchTerm(newValue)}
            options={filteredMaterials}
            getOptionLabel={(option) => `${option.code} - ${option.name}`}
            loading={loading}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search by code or name..."
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                      {params.InputProps.startAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <Box sx={{ width: '100%' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {option.code} - {option.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Available: {option.availableStock} {option.unit} • {option.category}
                  </Typography>
                </Box>
              </li>
            )}
          />
        </Box>

        {selectedMaterial && (
          <Card variant="outlined">
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="body2" gutterBottom sx={{ fontWeight: 600 }}>
                {selectedMaterial.code} - {selectedMaterial.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                In Stock: {selectedMaterial.inStock} {selectedMaterial.unit} • 
                Available: {selectedMaterial.availableStock} {selectedMaterial.unit}
              </Typography>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button
                  variant={quickAction === 'REMOVE' ? 'contained' : 'outlined'}
                  color="error"
                  startIcon={<RemoveIcon />}
                  onClick={() => setQuickAction('REMOVE')}
                  fullWidth
                  size="large"
                >
                  Use
                </Button>
                <Button
                  variant={quickAction === 'ADD' ? 'contained' : 'outlined'}
                  color="success"
                  startIcon={<AddIcon />}
                  onClick={() => setQuickAction('ADD')}
                  fullWidth
                  size="large"
                >
                  Add
                </Button>
              </Box>

              <TextField
                fullWidth
                type="number"
                label={`Quantity (${selectedMaterial.unit})`}
                value={quickQuantity}
                onChange={(e) => setQuickQuantity(e.target.value)}
                inputProps={{ min: 0, step: 0.1 }}
                sx={{ mt: 2 }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddQuickItem()
                  }
                }}
              />

              <Button
                fullWidth
                variant="contained"
                onClick={handleAddQuickItem}
                disabled={!quickQuantity}
                sx={{ mt: 1 }}
                size="large"
              >
                Add to Batch ({quickItems.length})
              </Button>
            </CardContent>
          </Card>
        )}

        {quickItems.length > 0 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
              Batch Items ({quickItems.length})
            </Typography>
            <Stack spacing={1}>
              {quickItems.map((item, index) => (
                <Card key={index} variant="outlined">
                  <CardContent sx={{ 
                    p: 1.5, 
                    '&:last-child': { pb: 1.5 },
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {item.materialName}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Chip
                          label={item.action === 'ADD' ? 'ADD' : 'USE'}
                          color={item.action === 'ADD' ? 'success' : 'error'}
                          size="small"
                          icon={item.action === 'ADD' ? <AddIcon /> : <RemoveIcon />}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {item.quantity} {item.unit}
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton 
                      size="small" 
                      onClick={() => handleRemoveQuickItem(index)}
                      color="error"
                    >
                      <CloseIcon />
                    </IconButton>
                  </CardContent>
                </Card>
              ))}
            </Stack>

            <TextField
              fullWidth
              label="Reason (Optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={jobId ? "Auto: Used on job" : "e.g., Used on project, inventory adjustment..."}
              multiline
              rows={2}
              sx={{ mt: 2 }}
            />
          </Box>
        )}

        {quickItems.length === 0 && !selectedMaterial && (
          <Box sx={{ 
            textAlign: 'center', 
            py: 4, 
            color: 'text.secondary' 
          }}>
            <InventoryIcon sx={{ fontSize: 64, opacity: 0.3, mb: 2 }} />
            <Typography variant="body2">
              Search and select materials to add to your batch
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: 'background.default', gap: 1 }}>
        <Button 
          onClick={onClose} 
          disabled={submitting}
          fullWidth
          size="large"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmitAll}
          variant="contained"
          disabled={submitting || quickItems.length === 0}
          fullWidth
          size="large"
          startIcon={submitting ? <CircularProgress size={20} /> : <CheckCircleIcon />}
        >
          {submitting ? 'Submitting...' : `Submit ${quickItems.length} Item(s)`}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
