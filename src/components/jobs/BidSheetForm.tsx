'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material'

interface LineItem {
  id: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  totalPrice: number
}

interface BidSheetData {
  // Job Information
  jobNumber: string
  jobDescription: string
  customerName: string
  customerAddress: string
  contactPerson: string
  contactPhone: string
  contactEmail: string
  
  // Bid Information
  bidDate: string
  validUntil: string
  projectType: string
  priority: string
  
  // Scope of Work
  scopeOfWork: string
  laborDescription: string
  materialDescription: string
  
  // Line Items
  lineItems: LineItem[]
  
  // Costs
  subtotal: number
  taxRate: number
  taxAmount: number
  totalAmount: number
  
  // Terms
  paymentTerms: string
  warrantyTerms: string
  notes: string
  
  // Internal
  createdBy: string
  createdAt: string
}

interface BidSheetFormProps {
  open: boolean
  onClose: () => void
  jobId: string
  jobNumber?: string
  customerName?: string
  onBidSheetCreated?: (bidSheet: BidSheetData) => void
}

const defaultLineItem: Omit<LineItem, 'id'> = {
  description: '',
  quantity: 1,
  unit: 'each',
  unitPrice: 0,
  totalPrice: 0
}

const UNITS = [
  'each', 'hour', 'foot', 'yard', 'meter', 'sq ft', 'sq yard', 'sq meter',
  'cubic ft', 'cubic yard', 'pound', 'ton', 'gallon', 'liter', 'linear ft'
]

const PROJECT_TYPES = [
  'Electrical Installation',
  'Electrical Repair',
  'Panel Upgrade',
  'Wiring Installation',
  'Lighting Installation',
  'Outlet Installation',
  'Service Call',
  'Emergency Repair',
  'Maintenance',
  'Inspection',
  'Other'
]

const PRIORITY_LEVELS = [
  'Standard',
  'High',
  'Urgent',
  'Emergency'
]

export default function BidSheetForm({
  open,
  onClose,
  jobId,
  jobNumber = '',
  customerName = '',
  onBidSheetCreated
}: BidSheetFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bidData, setBidData] = useState<BidSheetData>({
    jobNumber,
    jobDescription: '',
    customerName,
    customerAddress: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    bidDate: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    projectType: 'Electrical Installation',
    priority: 'Standard',
    scopeOfWork: '',
    laborDescription: '',
    materialDescription: '',
    lineItems: [{ ...defaultLineItem, id: '1' }],
    subtotal: 0,
    taxRate: 8.5, // Default tax rate
    taxAmount: 0,
    totalAmount: 0,
    paymentTerms: 'Net 30 days',
    warrantyTerms: '1 year on labor, manufacturer warranty on materials',
    notes: '',
    createdBy: '',
    createdAt: new Date().toISOString()
  })

  useEffect(() => {
    if (open && jobId) {
      fetchJobDetails()
    }
  }, [open, jobId])

  useEffect(() => {
    calculateTotals()
  }, [bidData.lineItems, bidData.taxRate])

  const fetchJobDetails = async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`)
      if (response.ok) {
        const job = await response.json()
        setBidData(prev => ({
          ...prev,
          jobNumber: job.jobNumber || prev.jobNumber,
          jobDescription: job.description || '',
          customerName: job.customer?.name || prev.customerName,
          customerAddress: job.customer?.address || '',
          contactPhone: job.customer?.phone || '',
          contactEmail: job.customer?.email || ''
        }))
      }
    } catch (error) {
      console.error('Error fetching job details:', error)
    }
  }

  const calculateTotals = () => {
    const subtotal = bidData.lineItems.reduce((sum, item) => sum + item.totalPrice, 0)
    const taxAmount = subtotal * (bidData.taxRate / 100)
    const totalAmount = subtotal + taxAmount
    
    setBidData(prev => ({
      ...prev,
      subtotal,
      taxAmount,
      totalAmount
    }))
  }

  const addLineItem = () => {
    const newId = (bidData.lineItems.length + 1).toString()
    setBidData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { ...defaultLineItem, id: newId }]
    }))
  }

  const removeLineItem = (id: string) => {
    setBidData(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter(item => item.id !== id)
    }))
  }

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setBidData(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value }
          // Recalculate total price when quantity or unit price changes
          if (field === 'quantity' || field === 'unitPrice') {
            updatedItem.totalPrice = updatedItem.quantity * updatedItem.unitPrice
          }
          return updatedItem
        }
        return item
      })
    }))
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/jobs/${jobId}/bid-sheet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bidData)
      })

      if (!response.ok) {
        throw new Error('Failed to save bid sheet')
      }

      const result = await response.json()
      onBidSheetCreated?.(result.bidSheet)
      onClose()
    } catch (error) {
      console.error('Error saving bid sheet:', error)
      setError(error instanceof Error ? error.message : 'Failed to save bid sheet')
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePDF = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/jobs/${jobId}/bid-sheet/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bidData)
      })

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bid-sheet-${bidData.jobNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error generating PDF:', error)
      setError(error instanceof Error ? error.message : 'Failed to generate PDF')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Create Bid Sheet</Typography>
          <Typography variant="body2" color="text.secondary">
            Job #{bidData.jobNumber}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>Job & Customer Information</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Job Number"
                value={bidData.jobNumber}
                onChange={(e) => setBidData(prev => ({ ...prev, jobNumber: e.target.value }))}
                fullWidth
                disabled
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Customer Name"
                value={bidData.customerName}
                onChange={(e) => setBidData(prev => ({ ...prev, customerName: e.target.value }))}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Job Description"
                value={bidData.jobDescription}
                onChange={(e) => setBidData(prev => ({ ...prev, jobDescription: e.target.value }))}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Customer Address"
                value={bidData.customerAddress}
                onChange={(e) => setBidData(prev => ({ ...prev, customerAddress: e.target.value }))}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Contact Person"
                value={bidData.contactPerson}
                onChange={(e) => setBidData(prev => ({ ...prev, contactPerson: e.target.value }))}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Contact Phone"
                value={bidData.contactPhone}
                onChange={(e) => setBidData(prev => ({ ...prev, contactPhone: e.target.value }))}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Contact Email"
                value={bidData.contactEmail}
                onChange={(e) => setBidData(prev => ({ ...prev, contactEmail: e.target.value }))}
                fullWidth
                type="email"
              />
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>Bid Information</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                label="Bid Date"
                type="date"
                value={bidData.bidDate}
                onChange={(e) => setBidData(prev => ({ ...prev, bidDate: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                label="Valid Until"
                type="date"
                value={bidData.validUntil}
                onChange={(e) => setBidData(prev => ({ ...prev, validUntil: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Project Type</InputLabel>
                <Select
                  value={bidData.projectType}
                  onChange={(e) => setBidData(prev => ({ ...prev, projectType: e.target.value }))}
                >
                  {PROJECT_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={bidData.priority}
                  onChange={(e) => setBidData(prev => ({ ...prev, priority: e.target.value }))}
                >
                  {PRIORITY_LEVELS.map((priority) => (
                    <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>Scope of Work</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Scope of Work"
                value={bidData.scopeOfWork}
                onChange={(e) => setBidData(prev => ({ ...prev, scopeOfWork: e.target.value }))}
                fullWidth
                multiline
                rows={4}
                placeholder="Describe the work to be performed..."
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Labor Description"
                value={bidData.laborDescription}
                onChange={(e) => setBidData(prev => ({ ...prev, laborDescription: e.target.value }))}
                fullWidth
                multiline
                rows={3}
                placeholder="Describe labor requirements..."
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Material Description"
                value={bidData.materialDescription}
                onChange={(e) => setBidData(prev => ({ ...prev, materialDescription: e.target.value }))}
                fullWidth
                multiline
                rows={3}
                placeholder="Describe materials needed..."
              />
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Line Items</Typography>
            <Button
              startIcon={<AddIcon />}
              onClick={addLineItem}
              variant="outlined"
              size="small"
            >
              Add Item
            </Button>
          </Box>
          
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell width="80px">Qty</TableCell>
                  <TableCell width="80px">Unit</TableCell>
                  <TableCell width="100px">Unit Price</TableCell>
                  <TableCell width="100px">Total</TableCell>
                  <TableCell width="50px"></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bidData.lineItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <TextField
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                        fullWidth
                        size="small"
                        placeholder="Description of work/materials"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        size="small"
                        inputProps={{ min: 0, step: 0.1 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.unit}
                        onChange={(e) => updateLineItem(item.id, 'unit', e.target.value)}
                        size="small"
                        fullWidth
                      >
                        {UNITS.map((unit) => (
                          <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        size="small"
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        ${item.totalPrice.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {bidData.lineItems.length > 1 && (
                        <IconButton
                          size="small"
                          onClick={() => removeLineItem(item.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Typography variant="h6" gutterBottom>Terms & Conditions</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Payment Terms"
                    value={bidData.paymentTerms}
                    onChange={(e) => setBidData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Warranty Terms"
                    value={bidData.warrantyTerms}
                    onChange={(e) => setBidData(prev => ({ ...prev, warrantyTerms: e.target.value }))}
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Additional Notes"
                    value={bidData.notes}
                    onChange={(e) => setBidData(prev => ({ ...prev, notes: e.target.value }))}
                    fullWidth
                    multiline
                    rows={3}
                  />
                </Grid>
              </Grid>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="h6" gutterBottom>Totals</Typography>
              <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Subtotal:</Typography>
                  <Typography>${bidData.subtotal.toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                  <TextField
                    label="Tax Rate (%)"
                    type="number"
                    value={bidData.taxRate}
                    onChange={(e) => setBidData(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
                    size="small"
                    sx={{ width: '80px' }}
                    inputProps={{ min: 0, max: 100, step: 0.1 }}
                  />
                  <Typography>${bidData.taxAmount.toFixed(2)}</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Total:</Typography>
                  <Typography variant="h6">${bidData.totalAmount.toFixed(2)}</Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleGeneratePDF}
          startIcon={<PdfIcon />}
          disabled={loading}
        >
          Generate PDF
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
          disabled={loading}
        >
          Save Bid Sheet
        </Button>
      </DialogActions>
    </Dialog>
  )
}