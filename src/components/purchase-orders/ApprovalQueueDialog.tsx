import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material'

interface ApprovalQueueDialogProps {
  open: boolean
  onClose: () => void
}

export default function ApprovalQueueDialog({
  open,
  onClose,
}: ApprovalQueueDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Approval Queue</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          Approval queue management coming soon. This will show all pending purchase orders 
          requiring approval with bulk actions.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}