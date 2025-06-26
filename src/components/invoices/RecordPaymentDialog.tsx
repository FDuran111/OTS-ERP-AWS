'use client'

import { useState } from 'react'
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

interface Invoice {
  id: string
  invoiceNumber: string
  totalAmount: number
  customer: {
    firstName: string
    lastName: string
    companyName?: string
  }
}

interface RecordPaymentDialogProps {
  open: boolean
  invoice: Invoice | null
  onClose: () => void
  onPaymentRecorded: () => void
}

const paymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  paymentMethod: z.enum(['CHECK', 'CASH', 'CREDIT_CARD', 'ACH', 'OTHER']),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
})

type PaymentFormData = z.infer<typeof paymentSchema>

const paymentMethods = [
  { value: 'CHECK', label: 'Check' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'ACH', label: 'ACH Transfer' },
  { value: 'OTHER', label: 'Other' },
]

export default function RecordPaymentDialog({ open, invoice, onClose, onPaymentRecorded }: RecordPaymentDialogProps) {
  const [submitting, setSubmitting] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: invoice?.totalAmount || 0,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'CHECK',
      referenceNumber: '',
      notes: '',
    }
  })

  const onSubmit = async (data: PaymentFormData) => {
    if (!invoice) return

    try {
      setSubmitting(true)

      const response = await fetch(`/api/invoices/${invoice.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to record payment')
      }

      onPaymentRecorded()
      onClose()
      reset()
    } catch (error) {
      console.error('Error recording payment:', error)
      alert(error instanceof Error ? error.message : 'Failed to record payment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  if (!invoice) return null

  const customerName = invoice.customer.companyName || 
    `${invoice.customer.firstName} ${invoice.customer.lastName}`

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Invoice #{invoice.invoiceNumber} - {customerName}
          </Typography>
          
          <Typography variant="h6" sx={{ mb: 2 }}>
            Total Due: ${invoice.totalAmount.toFixed(2)}
          </Typography>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="amount"
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                  <TextField
                    {...field}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                    label="Payment Amount *"
                    type="number"
                    fullWidth
                    error={!!errors.amount}
                    helperText={errors.amount?.message}
                    inputProps={{ min: 0, step: 0.01 }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>
                    }}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="paymentDate"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Payment Date *"
                    type="date"
                    fullWidth
                    error={!!errors.paymentDate}
                    helperText={errors.paymentDate?.message}
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="paymentMethod"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.paymentMethod}>
                    <InputLabel>Payment Method *</InputLabel>
                    <Select {...field} label="Payment Method *">
                      {paymentMethods.map((method) => (
                        <MenuItem key={method.value} value={method.value}>
                          {method.label}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.paymentMethod && (
                      <Typography variant="caption" color="error">
                        {errors.paymentMethod.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="referenceNumber"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Check/Reference #"
                    fullWidth
                    placeholder="e.g., Check #1234"
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Notes"
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="Any additional payment notes..."
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
            color="success"
          >
            {submitting ? 'Recording...' : 'Record Payment'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}