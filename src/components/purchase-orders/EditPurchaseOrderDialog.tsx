'use client'

import React, { useState, useEffect } from 'react'
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
  Typography,
  Box,
  Divider,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material'
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Send as SendIcon,
} from '@mui/icons-material'

// Temporary Grid component for compatibility
const Grid = ({ children, container, spacing, xs, md, size, alignItems, justifyContent, ...props }: any) => (
  <Box 
    sx={{ 
      display: container ? 'flex' : 'block',
      flexWrap: container ? 'wrap' : undefined,
      gap: container && spacing ? spacing : undefined,
      flex: xs ? '1 1 auto' : undefined,
      width: xs === 12 ? '100%' : undefined,
      alignItems,
      justifyContent,
      ...props.sx
    }}
    {...props}
  >
    {children}
  </Box>
)

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface PurchaseOrder {
  id: string
  poNumber: string
  vendorId: string
  vendorName?: string
  jobId?: string
  jobNumber?: string
  jobTitle?: string
  createdBy: string
  createdByName?: string
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SENT' | 'RECEIVED' | 'CANCELLED'
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  orderDate: Date
  requiredDate?: Date
  totalAmount: number
  notes?: string
  internalNotes?: string
  paymentTerms?: string
  shipToAddress?: string
  shipToCity?: string
  shipToState?: string
  shipToZip?: string
  approvedBy?: string
  approvedByName?: string
  approvedAt?: Date
  createdAt: Date
  updatedAt: Date
}

interface EditPurchaseOrderDialogProps {
  open: boolean
  onClose: () => void
  onPurchaseOrderUpdated: () => void
  purchaseOrder: PurchaseOrder | null
  currentUser: User
}

const EditPurchaseOrderDialog: React.FC<EditPurchaseOrderDialogProps> = ({
  open,
  onClose,
  onPurchaseOrderUpdated,
  purchaseOrder,
  currentUser
}) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  // Form state
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL')
  const [requiredDate, setRequiredDate] = useState('')
  const [notes, setNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [shipToAddress, setShipToAddress] = useState('')
  const [shipToCity, setShipToCity] = useState('')
  const [shipToState, setShipToState] = useState('')
  const [shipToZip, setShipToZip] = useState('')
  
  // Approval fields
  const [approvalComments, setApprovalComments] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    if (purchaseOrder && open) {
      setPriority(purchaseOrder.priority || 'NORMAL')
      setRequiredDate(purchaseOrder.requiredDate ? new Date(purchaseOrder.requiredDate).toISOString().split('T')[0] : '')
      setNotes(purchaseOrder.notes || '')
      setInternalNotes(purchaseOrder.internalNotes || '')
      setPaymentTerms(purchaseOrder.paymentTerms || '')
      setShipToAddress(purchaseOrder.shipToAddress || '')
      setShipToCity(purchaseOrder.shipToCity || '')
      setShipToState(purchaseOrder.shipToState || '')
      setShipToZip(purchaseOrder.shipToZip || '')
      setApprovalComments('')
      setRejectionReason('')
      setError(null)
    }
  }, [purchaseOrder, open])

  const handleUpdate = async () => {
    if (!purchaseOrder) return

    setLoading(true)
    setError(null)

    try {
      const updateData = {
        priority,
        requiredDate: requiredDate || undefined,
        notes: notes || undefined,
        internalNotes: internalNotes || undefined,
        paymentTerms: paymentTerms || undefined,
        shipToAddress: shipToAddress || undefined,
        shipToCity: shipToCity || undefined,
        shipToState: shipToState || undefined,
        shipToZip: shipToZip || undefined,
      }

      const response = await fetch(`/api/purchase-orders/${purchaseOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update purchase order')
      }

      onPurchaseOrderUpdated()
      handleClose()
    } catch (error) {
      console.error('Error updating purchase order:', error)
      setError(error instanceof Error ? error.message : 'Failed to update purchase order')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!purchaseOrder) return

    setActionLoading('approve')
    setError(null)

    try {
      const response = await fetch(`/api/purchase-orders/${purchaseOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE',
          approverId: currentUser.id,
          comments: approvalComments || undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to approve purchase order')
      }

      onPurchaseOrderUpdated()
      handleClose()
    } catch (error) {
      console.error('Error approving purchase order:', error)
      setError(error instanceof Error ? error.message : 'Failed to approve purchase order')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async () => {
    if (!purchaseOrder) return

    if (!rejectionReason.trim()) {
      setError('Please provide a reason for rejection')
      return
    }

    setActionLoading('reject')
    setError(null)

    try {
      const response = await fetch(`/api/purchase-orders/${purchaseOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REJECT',
          approverId: currentUser.id,
          reason: rejectionReason
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to reject purchase order')
      }

      onPurchaseOrderUpdated()
      handleClose()
    } catch (error) {
      console.error('Error rejecting purchase order:', error)
      setError(error instanceof Error ? error.message : 'Failed to reject purchase order')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSubmitForApproval = async () => {
    if (!purchaseOrder) return

    setActionLoading('submit')
    setError(null)

    try {
      const response = await fetch(`/api/purchase-orders/${purchaseOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'PENDING_APPROVAL'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit for approval')
      }

      onPurchaseOrderUpdated()
      handleClose()
    } catch (error) {
      console.error('Error submitting for approval:', error)
      setError(error instanceof Error ? error.message : 'Failed to submit for approval')
    } finally {
      setActionLoading(null)
    }
  }

  const handleClose = () => {
    setError(null)
    setActionLoading(null)
    onClose()
  }

  if (!purchaseOrder) return null

  const canEdit = purchaseOrder.status === 'DRAFT' || 
                 (purchaseOrder.status === 'REJECTED' && purchaseOrder.createdBy === currentUser.id)
  
  const canApprove = purchaseOrder.status === 'PENDING_APPROVAL' && 
                    purchaseOrder.createdBy !== currentUser.id &&
                    ['FOREMAN', 'OWNER_ADMIN'].includes(currentUser.role)
  
  const canSubmitForApproval = purchaseOrder.status === 'DRAFT' && 
                              purchaseOrder.createdBy === currentUser.id

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'success'
      case 'PENDING_APPROVAL': return 'warning'
      case 'REJECTED':
      case 'CANCELLED': return 'error'
      case 'SENT': return 'info'
      case 'RECEIVED': return 'primary'
      default: return 'default'
    }
  }

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { height: '80vh' } }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Edit Purchase Order</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip 
              label={purchaseOrder.status.replace('_', ' ')}
              color={getStatusColor(purchaseOrder.status) as any}
              size="small"
            />
            <Typography variant="h6" color="primary">
              {purchaseOrder.poNumber}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Purchase Order Information */}
          <Grid xs={12}>
            <Typography variant="h6" gutterBottom>
              Purchase Order Details
            </Typography>
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Grid container spacing={2}>
                <Grid xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Vendor</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {purchaseOrder.vendorName || 'Unknown Vendor'}
                  </Typography>
                </Grid>
                <Grid xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Job</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {purchaseOrder.jobNumber ? 
                      `${purchaseOrder.jobNumber} - ${purchaseOrder.jobTitle}` : 
                      'No Job Assigned'
                    }
                  </Typography>
                </Grid>
                <Grid xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Total Amount</Typography>
                  <Typography variant="h6" color="primary">
                    ${purchaseOrder.totalAmount.toLocaleString()}
                  </Typography>
                </Grid>
                <Grid xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Created By</Typography>
                  <Typography variant="body1">
                    {purchaseOrder.createdByName} on {new Date(purchaseOrder.createdAt).toLocaleDateString()}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Grid>

          {/* Editable Fields */}
          {canEdit && (
            <>
              <Grid xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Editable Information
                </Typography>
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
            </>
          )}

          {/* Approval Section */}
          {canApprove && (
            <>
              <Grid xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Approval Actions
                </Typography>
              </Grid>

              <Grid xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Approval Comments"
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  placeholder="Optional comments for approval..."
                />
              </Grid>

              <Grid xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Rejection Reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Required if rejecting..."
                />
              </Grid>
            </>
          )}

          {/* Current Status Information */}
          {purchaseOrder.approvedBy && (
            <>
              <Grid xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Approval History
                </Typography>
              </Grid>

              <Grid xs={12}>
                <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                  <Typography variant="body2">
                    Approved by {purchaseOrder.approvedByName} on {' '}
                    {purchaseOrder.approvedAt && new Date(purchaseOrder.approvedAt).toLocaleString()}
                  </Typography>
                </Box>
              </Grid>
            </>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button 
          onClick={handleClose}
          startIcon={<CancelIcon />}
          disabled={loading || actionLoading !== null}
        >
          Cancel
        </Button>

        {canSubmitForApproval && (
          <Button 
            onClick={handleSubmitForApproval}
            variant="outlined"
            color="warning"
            startIcon={actionLoading === 'submit' ? <CircularProgress size={20} /> : <SendIcon />}
            disabled={loading || actionLoading !== null}
          >
            {actionLoading === 'submit' ? 'Submitting...' : 'Submit for Approval'}
          </Button>
        )}

        {canApprove && (
          <>
            <Button 
              onClick={handleReject}
              variant="outlined"
              color="error"
              startIcon={actionLoading === 'reject' ? <CircularProgress size={20} /> : <RejectIcon />}
              disabled={loading || actionLoading !== null}
            >
              {actionLoading === 'reject' ? 'Rejecting...' : 'Reject'}
            </Button>
            
            <Button 
              onClick={handleApprove}
              variant="contained"
              color="success"
              startIcon={actionLoading === 'approve' ? <CircularProgress size={20} /> : <ApproveIcon />}
              disabled={loading || actionLoading !== null}
            >
              {actionLoading === 'approve' ? 'Approving...' : 'Approve'}
            </Button>
          </>
        )}

        {canEdit && (
          <Button 
            onClick={handleUpdate}
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
            disabled={loading || actionLoading !== null}
            sx={{
              backgroundColor: '#e14eca',
              '&:hover': {
                backgroundColor: '#d236b8',
              },
            }}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default EditPurchaseOrderDialog