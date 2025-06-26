import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
} from '@mui/material'

interface PurchaseOrderDetailsDialogProps {
  open: boolean
  onClose: () => void
  purchaseOrder?: any
}

export default function PurchaseOrderDetailsDialog({
  open,
  onClose,
  purchaseOrder,
}: PurchaseOrderDetailsDialogProps) {
  if (!purchaseOrder) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Purchase Order Details</Typography>
          <Typography variant="h6" color="primary">
            {purchaseOrder.poNumber}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Status
          </Typography>
          <Chip label={purchaseOrder.status} color="primary" size="small" />
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }} gutterBottom>
            Total Amount
          </Typography>
          <Typography variant="h5" color="primary">
            ${purchaseOrder.totalAmount?.toLocaleString() || '0'}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Purchase order details view coming soon. This will include line items, 
            approval history, and more.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}