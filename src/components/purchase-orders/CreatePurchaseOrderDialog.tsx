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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Divider,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  InputAdornment,
  Chip,
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
} from '@mui/icons-material'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface Vendor {
  id: string
  name: string
  code: string
  contactName?: string
  email?: string
  phone?: string
}

interface Job {
  id: string
  jobNumber: string
  title: string
  status: string
}

interface Material {
  id: string
  code: string
  name: string
  description?: string
  unit: string
  cost: number
}

interface LineItem {
  id: string
  materialId?: string
  itemCode?: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  taxRate: number
  lineTotal: number
  material?: Material
}

interface CreatePurchaseOrderDialogProps {
  open: boolean
  onClose: () => void
  onPurchaseOrderCreated: () => void
  currentUser: User
}

const CreatePurchaseOrderDialog: React.FC<CreatePurchaseOrderDialogProps> = ({
  open,
  onClose,
  onPurchaseOrderCreated,
  currentUser
}) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [materialSearch, setMaterialSearch] = useState('')
  
  // Form state
  const [selectedVendor, setSelectedVendor] = useState('')
  const [selectedJob, setSelectedJob] = useState('')
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL')
  const [requiredDate, setRequiredDate] = useState('')
  const [notes, setNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  
  // Shipping details
  const [shipToAddress, setShipToAddress] = useState('')
  const [shipToCity, setShipToCity] = useState('')
  const [shipToState, setShipToState] = useState('')
  const [shipToZip, setShipToZip] = useState('')
  
  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [newItem, setNewItem] = useState({
    materialId: '',
    itemCode: '',
    description: '',
    quantity: 1,
    unit: 'each',
    unitPrice: 0,
    taxRate: 0
  })

  useEffect(() => {
    if (open) {
      fetchVendors()
      fetchJobs()
      fetchMaterials()
    }
  }, [open])

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

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs?status=IN_PROGRESS,SCHEDULED,PENDING')
      if (response.ok) {
        const data = await response.json()
        setJobs(data)
      }
    } catch (error) {
      console.error('Error fetching jobs:', error)
    }
  }

  const fetchMaterials = async () => {
    try {
      const response = await fetch('/api/materials')
      if (response.ok) {
        const data = await response.json()
        setMaterials(data)
      }
    } catch (error) {
      console.error('Error fetching materials:', error)
    }
  }

  const addLineItem = () => {
    if (!newItem.description || newItem.quantity <= 0 || newItem.unitPrice < 0) {
      setError('Please fill in all required fields for the line item')
      return
    }

    const lineTotal = newItem.quantity * newItem.unitPrice * (1 + newItem.taxRate / 100)
    const lineItem: LineItem = {
      id: Date.now().toString(),
      materialId: newItem.materialId || undefined,
      itemCode: newItem.itemCode || undefined,
      description: newItem.description,
      quantity: newItem.quantity,
      unit: newItem.unit,
      unitPrice: newItem.unitPrice,
      taxRate: newItem.taxRate,
      lineTotal,
      material: newItem.materialId ? materials.find(m => m.id === newItem.materialId) : undefined
    }

    setLineItems([...lineItems, lineItem])
    setNewItem({
      materialId: '',
      itemCode: '',
      description: '',
      quantity: 1,
      unit: 'each',
      unitPrice: 0,
      taxRate: 0
    })
    setError(null)
  }

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id))
  }

  const handleMaterialSelect = (materialId: string) => {
    const material = materials.find(m => m.id === materialId)
    if (material) {
      setNewItem({
        ...newItem,
        materialId: material.id,
        itemCode: material.code,
        description: material.name,
        unit: material.unit,
        unitPrice: material.cost
      })
    }
  }

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  }

  const calculateTax = () => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice * item.taxRate / 100), 0)
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax()
  }

  const handleSubmit = async () => {
    if (!selectedVendor) {
      setError('Please select a vendor')
      return
    }

    if (lineItems.length === 0) {
      setError('Please add at least one line item')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const subtotal = calculateSubtotal()
      const taxAmount = calculateTax()

      const poData = {
        vendorId: selectedVendor,
        jobId: selectedJob || undefined,
        createdBy: currentUser.id,
        priority,
        requiredDate: requiredDate || undefined,
        subtotal,
        taxAmount,
        shippingAmount: 0,
        discountAmount: 0,
        shipToAddress: shipToAddress || undefined,
        shipToCity: shipToCity || undefined,
        shipToState: shipToState || undefined,
        shipToZip: shipToZip || undefined,
        paymentTerms: paymentTerms || undefined,
        notes: notes || undefined,
        internalNotes: internalNotes || undefined,
        items: lineItems.map(item => ({
          materialId: item.materialId,
          itemCode: item.itemCode,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate
        }))
      }

      const response = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(poData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create purchase order')
      }

      onPurchaseOrderCreated()
      handleClose()
    } catch (error) {
      console.error('Error creating purchase order:', error)
      setError(error instanceof Error ? error.message : 'Failed to create purchase order')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedVendor('')
    setSelectedJob('')
    setPriority('NORMAL')
    setRequiredDate('')
    setNotes('')
    setInternalNotes('')
    setPaymentTerms('')
    setShipToAddress('')
    setShipToCity('')
    setShipToState('')
    setShipToZip('')
    setLineItems([])
    setNewItem({
      materialId: '',
      itemCode: '',
      description: '',
      quantity: 1,
      unit: 'each',
      unitPrice: 0,
      taxRate: 0
    })
    setError(null)
    onClose()
  }

  const filteredMaterials = materials.filter(material =>
    materialSearch === '' ||
    material.name.toLowerCase().includes(materialSearch.toLowerCase()) ||
    material.code.toLowerCase().includes(materialSearch.toLowerCase()) ||
    (material.description && material.description.toLowerCase().includes(materialSearch.toLowerCase()))
  )

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { height: '90vh' } }}
    >
      <DialogTitle>
        <Typography variant="h6">Create Purchase Order</Typography>
      </DialogTitle>
      
      <DialogContent dividers sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Header Information */}
          <Grid xs={12}>
            <Typography variant="h6" gutterBottom>
              Order Information
            </Typography>
          </Grid>

          <Grid xs={12} md={6}>
            <FormControl fullWidth required>
              <InputLabel>Vendor</InputLabel>
              <Select
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                label="Vendor"
              >
                {vendors.map(vendor => (
                  <MenuItem key={vendor.id} value={vendor.id}>
                    <Box>
                      <Typography variant="body2">{vendor.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {vendor.code}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Job (Optional)</InputLabel>
              <Select
                value={selectedJob}
                onChange={(e) => setSelectedJob(e.target.value)}
                label="Job (Optional)"
              >
                <MenuItem value="">No Job</MenuItem>
                {jobs.map(job => (
                  <MenuItem key={job.id} value={job.id}>
                    <Box>
                      <Typography variant="body2">{job.jobNumber}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {job.title}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                label="Priority"
              >
                <MenuItem value="LOW">Low</MenuItem>
                <MenuItem value="NORMAL">Normal</MenuItem>
                <MenuItem value="HIGH">High</MenuItem>
                <MenuItem value="URGENT">Urgent</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid xs={12} md={6}>
            <TextField
              fullWidth
              label="Required Date"
              type="date"
              value={requiredDate}
              onChange={(e) => setRequiredDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* Line Items Section */}
          <Grid xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              Line Items
            </Typography>
          </Grid>

          {/* Add New Item */}
          <Grid xs={12}>
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" gutterBottom>
                Add New Item
              </Typography>
              
              <Grid container spacing={2} alignItems="center">
                <Grid xs={12} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search materials..."
                    value={materialSearch}
                    onChange={(e) => setMaterialSearch(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                  {materialSearch && (
                    <Paper sx={{ maxHeight: 200, overflow: 'auto', mt: 1 }}>
                      {filteredMaterials.slice(0, 5).map(material => (
                        <Box
                          key={material.id}
                          sx={{ 
                            p: 1, 
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.hover' }
                          }}
                          onClick={() => {
                            handleMaterialSelect(material.id)
                            setMaterialSearch('')
                          }}
                        >
                          <Typography variant="body2">{material.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {material.code} • ${material.cost.toFixed(2)}/{material.unit}
                          </Typography>
                        </Box>
                      ))}
                    </Paper>
                  )}
                </Grid>

                <Grid xs={6} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Item Code"
                    value={newItem.itemCode}
                    onChange={(e) => setNewItem({ ...newItem, itemCode: e.target.value })}
                  />
                </Grid>

                <Grid xs={12} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Description *"
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    required
                  />
                </Grid>

                <Grid xs={4} md={1}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Qty *"
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </Grid>

                <Grid xs={4} md={1}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Unit"
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                  />
                </Grid>

                <Grid xs={4} md={1}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Price *"
                    type="number"
                    step="0.01"
                    value={newItem.unitPrice}
                    onChange={(e) => setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </Grid>

                <Grid xs={12} md={1}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={addLineItem}
                    startIcon={<AddIcon />}
                    sx={{ height: 40 }}
                  >
                    Add
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Line Items Table */}
          {lineItems.length > 0 && (
            <Grid xs={12}>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Code</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell>Unit</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Tax %</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="center">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lineItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {item.itemCode && (
                            <Chip size="small" label={item.itemCode} />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{item.description}</Typography>
                          {item.material && (
                            <Typography variant="caption" color="text.secondary">
                              {item.material.name}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell align="right">${item.unitPrice.toFixed(2)}</TableCell>
                        <TableCell align="right">{item.taxRate}%</TableCell>
                        <TableCell align="right">${item.lineTotal.toFixed(2)}</TableCell>
                        <TableCell align="center">
                          <IconButton 
                            size="small" 
                            onClick={() => removeLineItem(item.id)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Totals */}
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Grid container spacing={2} justifyContent="flex-end">
                  <Grid size={6}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>Subtotal:</Typography>
                      <Typography fontWeight="medium">${calculateSubtotal().toFixed(2)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>Tax:</Typography>
                      <Typography fontWeight="medium">${calculateTax().toFixed(2)}</Typography>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="h6">Total:</Typography>
                      <Typography variant="h6" color="primary">${calculateTotal().toFixed(2)}</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          )}

          {/* Additional Information */}
          <Grid xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              Additional Information
            </Typography>
          </Grid>

          <Grid xs={12} md={6}>
            <TextField
              fullWidth
              label="Payment Terms"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="e.g., Net 30, COD, etc."
            />
          </Grid>

          <Grid xs={12} md={6}>
            <TextField
              fullWidth
              label="Ship To Address"
              value={shipToAddress}
              onChange={(e) => setShipToAddress(e.target.value)}
            />
          </Grid>

          <Grid xs={12} md={4}>
            <TextField
              fullWidth
              label="City"
              value={shipToCity}
              onChange={(e) => setShipToCity(e.target.value)}
            />
          </Grid>

          <Grid xs={12} md={4}>
            <TextField
              fullWidth
              label="State"
              value={shipToState}
              onChange={(e) => setShipToState(e.target.value)}
            />
          </Grid>

          <Grid xs={12} md={4}>
            <TextField
              fullWidth
              label="ZIP Code"
              value={shipToZip}
              onChange={(e) => setShipToZip(e.target.value)}
            />
          </Grid>

          <Grid xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Public notes that will appear on the PO..."
            />
          </Grid>

          <Grid xs={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Internal Notes"
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Internal notes (not visible to vendor)..."
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button 
          onClick={handleClose}
          startIcon={<CancelIcon />}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
          disabled={loading || !selectedVendor || lineItems.length === 0}
          sx={{
            backgroundColor: '#e14eca',
            '&:hover': {
              backgroundColor: '#d236b8',
            },
          }}
        >
          {loading ? 'Creating...' : 'Create Purchase Order'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CreatePurchaseOrderDialog