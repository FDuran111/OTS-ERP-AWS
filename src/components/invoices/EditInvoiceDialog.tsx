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
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

interface Job {
  id: string
  jobNumber: string
  description?: string
  customer: {
    firstName: string
    lastName: string
  }
}

interface Material {
  id: string
  code: string
  name: string
  price: number
  unit: string
}

interface LaborRate {
  id: string
  name: string
  hourlyRate: number
}

interface Invoice {
  id: string
  invoiceNumber: string
  jobId?: string
  status: string
  totalAmount: number
  subtotalAmount: number
  taxAmount: number
  dueDate: string
  sentDate: string | null
  paidDate: string | null
  notes?: string
  customer: {
    firstName: string
    lastName: string
  }
  job: {
    jobNumber: string
    description?: string
  }
  lineItems?: Array<{
    id: string
    type: string
    description: string
    quantity: number
    unitPrice: number
    totalPrice: number
    materialId?: string
    laborRateId?: string
  }>
}

interface EditInvoiceDialogProps {
  open: boolean
  invoice: Invoice | null
  onClose: () => void
  onInvoiceUpdated: () => void
}

const invoiceSchema = z.object({
  dueDate: z.string().min(1, 'Due date is required'),
  notes: z.string().optional(),
  lineItems: z.array(z.object({
    id: z.string().optional(),
    type: z.enum(['LABOR', 'MATERIAL', 'OTHER']),
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().positive('Quantity must be positive'),
    unitPrice: z.number().positive('Unit price must be positive'),
    materialId: z.string().optional(),
    laborRateId: z.string().optional(),
  })).min(1, 'At least one line item is required'),
})

type InvoiceFormData = z.infer<typeof invoiceSchema>

export default function EditInvoiceDialog({ open, invoice, onClose, onInvoiceUpdated }: EditInvoiceDialogProps) {
  const [materials, setMaterials] = useState<Material[]>([])
  const [laborRates, setLaborRates] = useState<LaborRate[]>([])
  const [submitting, setSubmitting] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
  })

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'lineItems'
  })

  const watchedLineItems = watch('lineItems')

  useEffect(() => {
    if (open && invoice) {
      fetchMaterials()
      fetchLaborRates()
      
      // Reset form with invoice data
      const lineItems = invoice.lineItems && invoice.lineItems.length > 0 
        ? invoice.lineItems.map(item => ({
            id: item.id,
            type: item.type as 'LABOR' | 'MATERIAL' | 'OTHER',
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            materialId: item.materialId,
            laborRateId: item.laborRateId,
          }))
        : [{ type: 'LABOR' as const, description: '', quantity: 1, unitPrice: 0 }]

      reset({
        dueDate: invoice.dueDate.split('T')[0], // Convert to YYYY-MM-DD format
        notes: invoice.notes || '',
        lineItems: lineItems
      })
    }
  }, [open, invoice, reset])

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

  const fetchLaborRates = async () => {
    try {
      const response = await fetch('/api/labor-rates')
      if (response.ok) {
        const data = await response.json()
        setLaborRates(data)
      }
    } catch (error) {
      console.error('Error fetching labor rates:', error)
    }
  }

  const onSubmit = async (data: InvoiceFormData) => {
    if (!invoice) return

    try {
      setSubmitting(true)

      // Calculate new totals
      const subtotalAmount = data.lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
      const taxAmount = subtotalAmount * 0.08
      const totalAmount = subtotalAmount + taxAmount

      const updateData = {
        dueDate: data.dueDate,
        notes: data.notes,
        lineItems: data.lineItems,
        subtotalAmount,
        taxAmount,
        totalAmount,
      }

      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update invoice')
      }

      onInvoiceUpdated()
      onClose()
    } catch (error) {
      console.error('Error updating invoice:', error)
      alert(error instanceof Error ? error.message : 'Failed to update invoice')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const addLineItem = () => {
    append({ type: 'LABOR', description: '', quantity: 1, unitPrice: 0 })
  }

  const handleMaterialSelect = (index: number, materialId: string) => {
    const material = materials.find(m => m.id === materialId)
    if (material) {
      setValue(`lineItems.${index}.materialId`, materialId)
      setValue(`lineItems.${index}.description`, material.name)
      setValue(`lineItems.${index}.unitPrice`, material.price)
      setValue(`lineItems.${index}.type`, 'MATERIAL')
    }
  }

  const handleLaborRateSelect = (index: number, laborRateId: string) => {
    const laborRate = laborRates.find(lr => lr.id === laborRateId)
    if (laborRate) {
      setValue(`lineItems.${index}.laborRateId`, laborRateId)
      setValue(`lineItems.${index}.description`, laborRate.name)
      setValue(`lineItems.${index}.unitPrice`, laborRate.hourlyRate)
      setValue(`lineItems.${index}.type`, 'LABOR')
    }
  }

  const calculateSubtotal = () => {
    return watchedLineItems?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) || 0
  }

  const calculateTax = () => {
    return calculateSubtotal() * 0.08 // 8% tax
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax()
  }

  if (!invoice) return null

  const canEdit = invoice.status === 'DRAFT' || invoice.status === 'SENT'

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>
          Edit Invoice - {invoice.invoiceNumber}
          {!canEdit && (
            <Typography variant="caption" color="error" sx={{ display: 'block' }}>
              Only draft and sent invoices can be edited
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Invoice Info */}
            <Grid size={12}>
              <Typography variant="h6" gutterBottom>
                Job: {invoice.job.jobNumber} - {invoice.job.description}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Customer: {invoice.customer.firstName} {invoice.customer.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Status: {invoice.status}
              </Typography>
            </Grid>

            {/* Due Date */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="dueDate"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Due Date *"
                    type="date"
                    fullWidth
                    disabled={!canEdit}
                    error={!!errors.dueDate}
                    helperText={errors.dueDate?.message}
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />
            </Grid>

            {/* Line Items */}
            <Grid size={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Line Items</Typography>
                {canEdit && (
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={addLineItem}
                    size="small"
                  >
                    Add Line Item
                  </Button>
                )}
              </Box>

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Qty</TableCell>
                      <TableCell>Unit Price</TableCell>
                      <TableCell>Total</TableCell>
                      {canEdit && <TableCell>Actions</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell>
                          <Controller
                            name={`lineItems.${index}.type`}
                            control={control}
                            render={({ field: typeField }) => (
                              <Select
                                {...typeField}
                                size="small"
                                disabled={!canEdit}
                                sx={{ minWidth: 100 }}
                              >
                                <MenuItem value="LABOR">Labor</MenuItem>
                                <MenuItem value="MATERIAL">Material</MenuItem>
                                <MenuItem value="OTHER">Other</MenuItem>
                              </Select>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`lineItems.${index}.description`}
                            control={control}
                            render={({ field: descField }) => (
                              <TextField
                                {...descField}
                                size="small"
                                fullWidth
                                disabled={!canEdit}
                                error={!!errors.lineItems?.[index]?.description}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`lineItems.${index}.quantity`}
                            control={control}
                            render={({ field: { value, onChange, ...qtyField } }) => (
                              <TextField
                                {...qtyField}
                                value={value || ''}
                                onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                                type="number"
                                size="small"
                                disabled={!canEdit}
                                sx={{ width: 80 }}
                                inputProps={{ min: 0, step: 0.01 }}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`lineItems.${index}.unitPrice`}
                            control={control}
                            render={({ field: { value, onChange, ...priceField } }) => (
                              <TextField
                                {...priceField}
                                value={value || ''}
                                onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                                type="number"
                                size="small"
                                disabled={!canEdit}
                                sx={{ width: 100 }}
                                InputProps={{
                                  startAdornment: <InputAdornment position="start">$</InputAdornment>
                                }}
                                inputProps={{ min: 0, step: 0.01 }}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          ${((watchedLineItems?.[index]?.quantity || 0) * (watchedLineItems?.[index]?.unitPrice || 0)).toFixed(2)}
                        </TableCell>
                        {canEdit && (
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => remove(index)}
                              disabled={fields.length === 1}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Totals */}
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Box sx={{ minWidth: 200 }}>
                  <Typography variant="body2">
                    Subtotal: ${calculateSubtotal().toFixed(2)}
                  </Typography>
                  <Typography variant="body2">
                    Tax (8%): ${calculateTax().toFixed(2)}
                  </Typography>
                  <Typography variant="h6">
                    Total: ${calculateTotal().toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* Notes */}
            <Grid size={12}>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Notes"
                    fullWidth
                    disabled={!canEdit}
                    multiline
                    rows={3}
                    placeholder="Additional notes for the invoice..."
                  />
                )}
              />
            </Grid>

            {/* Original amounts for comparison */}
            {invoice.totalAmount !== calculateTotal() && (
              <Grid size={12}>
                <Box sx={{ p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Original Total: ${invoice.totalAmount.toFixed(2)} → New Total: ${calculateTotal().toFixed(2)}
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          {canEdit && (
            <Button 
              type="submit" 
              variant="contained" 
              disabled={submitting}
            >
              {submitting ? 'Updating...' : 'Update Invoice'}
            </Button>
          )}
        </DialogActions>
      </form>
    </Dialog>
  )
}