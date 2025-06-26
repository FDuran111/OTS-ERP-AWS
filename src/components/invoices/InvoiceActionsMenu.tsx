'use client'

import { useState } from 'react'
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Typography,
  Box,
} from '@mui/material'
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Payment as PaymentIcon,
  Print as PrintIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material'

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

interface InvoiceActionsMenuProps {
  invoice: Invoice
  onEdit: (invoice: Invoice) => void
  onDelete: (invoice: Invoice) => Promise<void>
  onStatusUpdated: () => void
}

export default function InvoiceActionsMenu({ 
  invoice, 
  onEdit, 
  onDelete, 
  onStatusUpdated 
}: InvoiceActionsMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState(invoice.status)
  const [submitting, setSubmitting] = useState(false)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation()
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleEdit = () => {
    onEdit(invoice)
    handleClose()
  }

  const handleDelete = async () => {
    if (invoice.status !== 'DRAFT') {
      alert('Only draft invoices can be deleted')
      handleClose()
      return
    }

    const confirmMessage = `Are you sure you want to delete invoice "${invoice.invoiceNumber}"?\n\nThis action cannot be undone.`
    
    if (window.confirm(confirmMessage)) {
      await onDelete(invoice)
    }
    handleClose()
  }

  const handleViewPrint = () => {
    console.log('Opening print view for invoice:', invoice.id)
    window.open(`/invoicing/${invoice.id}/print`, '_blank')
    handleClose()
  }

  const handleMarkSent = () => {
    setSelectedStatus('SENT')
    setStatusDialogOpen(true)
    handleClose()
  }

  const handleMarkPaid = () => {
    setSelectedStatus('PAID')
    setStatusDialogOpen(true)
    handleClose()
  }

  const handleStatusUpdate = async () => {
    try {
      setSubmitting(true)
      
      const updateData: any = { status: selectedStatus }
      
      if (selectedStatus === 'SENT') {
        updateData.sentDate = new Date().toISOString()
      } else if (selectedStatus === 'PAID') {
        updateData.paidDate = new Date().toISOString()
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

      onStatusUpdated()
      setStatusDialogOpen(false)
    } catch (error) {
      console.error('Error updating invoice:', error)
      alert(error instanceof Error ? error.message : 'Failed to update invoice')
    } finally {
      setSubmitting(false)
    }
  }

  const canEdit = invoice.status === 'DRAFT' || invoice.status === 'SENT'
  const canDelete = invoice.status === 'DRAFT'
  const canMarkSent = invoice.status === 'DRAFT'
  const canMarkPaid = invoice.status === 'SENT' || invoice.status === 'OVERDUE'

  return (
    <>
      <IconButton
        size="small"
        onClick={handleClick}
        aria-label="invoice actions"
      >
        <MoreVertIcon />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleViewPrint}>
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View/Print</ListItemText>
        </MenuItem>
        
        {canEdit && (
          <MenuItem onClick={handleEdit}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit Invoice</ListItemText>
          </MenuItem>
        )}
        
        {canMarkSent && (
          <MenuItem onClick={handleMarkSent}>
            <ListItemIcon>
              <SendIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Mark as Sent</ListItemText>
          </MenuItem>
        )}
        
        {canMarkPaid && (
          <MenuItem onClick={handleMarkPaid}>
            <ListItemIcon>
              <PaymentIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Record Payment</ListItemText>
          </MenuItem>
        )}
        
        {canDelete && (
          <MenuItem 
            onClick={handleDelete} 
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete Invoice</ListItemText>
          </MenuItem>
        )}
      </Menu>

      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Invoice Status</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              <strong>Invoice:</strong> {invoice.invoiceNumber}
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Customer:</strong> {invoice.customer.firstName} {invoice.customer.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Amount:</strong> ${invoice.totalAmount.toFixed(2)}
            </Typography>
          </Box>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>New Status</InputLabel>
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              label="New Status"
            >
              <MenuItem value="DRAFT">Draft</MenuItem>
              <MenuItem value="SENT">Sent</MenuItem>
              <MenuItem value="PAID">Paid</MenuItem>
              <MenuItem value="OVERDUE">Overdue</MenuItem>
              <MenuItem value="CANCELLED">Cancelled</MenuItem>
            </Select>
          </FormControl>

          {selectedStatus === 'SENT' && (
            <Typography variant="body2" color="text.secondary">
              This will set the sent date to today.
            </Typography>
          )}

          {selectedStatus === 'PAID' && (
            <Typography variant="body2" color="text.secondary">
              This will set the paid date to today.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleStatusUpdate}
            variant="contained"
            disabled={submitting}
          >
            {submitting ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}