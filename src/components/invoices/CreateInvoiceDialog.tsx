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
  description: string
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

interface CreateInvoiceDialogProps {
  open: boolean
  onClose: () => void
  onInvoiceCreated: () => void
}

const invoiceSchema = z.object({
  jobId: z.string().min(1, 'Job is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  notes: z.string().optional(),
  lineItems: z.array(z.object({
    type: z.enum(['LABOR', 'MATERIAL', 'OTHER']),
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().positive('Quantity must be positive'),
    unitPrice: z.number().positive('Unit price must be positive'),
    materialId: z.string().optional(),
    laborRateId: z.string().optional(),
  })).min(1, 'At least one line item is required'),
})

type InvoiceFormData = z.infer<typeof invoiceSchema>

export default function CreateInvoiceDialog({ open, onClose, onInvoiceCreated }: CreateInvoiceDialogProps) {
  const [jobs, setJobs] = useState<Job[]>([])
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
    defaultValues: {
      jobId: '',
      dueDate: '',
      notes: '',
      lineItems: [{ type: 'LABOR', description: '', quantity: 1, unitPrice: 0 }]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lineItems'
  })

  const watchedLineItems = watch('lineItems')

  useEffect(() => {
    if (open) {
      fetchJobs()
      fetchMaterials()
      fetchLaborRates()
    }
  }, [open])

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs?status=COMPLETED')
      if (response.ok) {
        const data = await response.json()
        setJobs(data)
      } else {
        // Use mock data if API fails
        const mockJobs = [
          {
            id: '1',
            jobNumber: '25-001-A12',
            description: 'Panel upgrade and rewiring',
            customer: {
              firstName: 'John',
              lastName: 'Johnson'
            }
          },
          {
            id: '2',
            jobNumber: '25-002-B34',
            description: 'Commercial electrical installation',
            customer: {
              firstName: 'Tech',
              lastName: 'Corp'
            }
          },
          {
            id: '3',
            jobNumber: '25-003-C56',
            description: 'Outlet installation',
            customer: {
              firstName: 'Mary',
              lastName: 'Smith'
            }
          }
        ]
        setJobs(mockJobs)
      }
    } catch (error) {
      console.error('Error fetching jobs:', error)
      // Use mock data as fallback
      const mockJobs = [
        {
          id: '1',
          jobNumber: '25-001-A12',
          description: 'Panel upgrade and rewiring',
          customer: {
            firstName: 'John',
            lastName: 'Johnson'
          }
        }
      ]
      setJobs(mockJobs)
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
    try {
      setSubmitting(true)

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create invoice')
      }

      onInvoiceCreated()
      onClose()
      reset()
    } catch (error) {
      console.error('Error creating invoice:', error)
      alert(error instanceof Error ? error.message : 'Failed to create invoice')
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
    return watchedLineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  }

  const calculateTax = () => {
    return calculateSubtotal() * 0.08 // 8% tax
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax()
  }

  const selectedJob = jobs.find(j => j.id === watch('jobId'))

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Create New Invoice</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Job Selection */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="jobId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.jobId}>
                    <InputLabel>Job *</InputLabel>
                    <Select {...field} value={field.value || ''} label="Job *">
                      {jobs.map((job) => (
                        <MenuItem key={job.id} value={job.id}>
                          {job.jobNumber} - {job.description}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.jobId && (
                      <Typography variant="caption" color="error">
                        {errors.jobId.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
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
                    error={!!errors.dueDate}
                    helperText={errors.dueDate?.message}
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />
            </Grid>

            {/* Customer Info */}
            {selectedJob && (
              <Grid size={12}>
                <Typography variant="h6" gutterBottom>
                  Customer: {selectedJob.customer.firstName} {selectedJob.customer.lastName}
                </Typography>
              </Grid>
            )}

            {/* Line Items */}
            <Grid size={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Line Items</Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={addLineItem}
                  size="small"
                >
                  Add Line Item
                </Button>
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
                      <TableCell>Actions</TableCell>
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
                          ${((watchedLineItems[index]?.quantity || 0) * (watchedLineItems[index]?.unitPrice || 0)).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => remove(index)}
                            disabled={fields.length === 1}
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
                    multiline
                    rows={3}
                    placeholder="Additional notes for the invoice..."
                  />
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
            {submitting ? 'Creating...' : 'Create Invoice'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}