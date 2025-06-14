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
  Add as AddIcon,
  Remove as RemoveIcon,
  Inventory as SetIcon,
} from '@mui/icons-material'

interface Material {
  id: string
  code: string
  name: string
  category: string
  unit: string
  inStock: number
  minStock: number
  cost: number
  price: number
  status: string
}

interface MaterialActionsMenuProps {
  material: Material
  onEdit: (material: Material) => void
  onDelete: (material: Material) => void
  onStockUpdated: () => void
}

export default function MaterialActionsMenu({ 
  material, 
  onEdit, 
  onDelete, 
  onStockUpdated 
}: MaterialActionsMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [stockDialogOpen, setStockDialogOpen] = useState(false)
  const [stockAction, setStockAction] = useState<'ADD' | 'REMOVE' | 'SET'>('ADD')
  const [stockQuantity, setStockQuantity] = useState('')
  const [stockReason, setStockReason] = useState('')
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
    onEdit(material)
    handleClose()
  }

  const handleDelete = () => {
    const confirmMessage = `Are you sure you want to delete "${material.name}"?`
    
    if (window.confirm(confirmMessage)) {
      onDelete(material)
    }
    handleClose()
  }

  const handleStockAction = (action: 'ADD' | 'REMOVE' | 'SET') => {
    setStockAction(action)
    setStockDialogOpen(true)
    setStockQuantity('')
    setStockReason('')
    handleClose()
  }

  const handleStockUpdate = async () => {
    try {
      setSubmitting(true)
      
      const quantity = parseInt(stockQuantity)
      if (isNaN(quantity) || quantity < 0) {
        alert('Please enter a valid quantity')
        return
      }

      const response = await fetch(`/api/materials/${material.id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: quantity,
          type: stockAction,
          reason: stockReason || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update stock')
      }

      onStockUpdated()
      setStockDialogOpen(false)
    } catch (error) {
      console.error('Error updating stock:', error)
      alert(error instanceof Error ? error.message : 'Failed to update stock')
    } finally {
      setSubmitting(false)
    }
  }

  const getStockDialogTitle = () => {
    switch (stockAction) {
      case 'ADD': return 'Add Stock'
      case 'REMOVE': return 'Remove Stock'
      case 'SET': return 'Set Stock Level'
      default: return 'Update Stock'
    }
  }

  const getStockDialogLabel = () => {
    switch (stockAction) {
      case 'ADD': return `Quantity to Add (${material.unit})`
      case 'REMOVE': return `Quantity to Remove (${material.unit})`
      case 'SET': return `New Stock Level (${material.unit})`
      default: return 'Quantity'
    }
  }

  return (
    <>
      <IconButton
        size="small"
        onClick={handleClick}
        aria-label="material actions"
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
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Material</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => handleStockAction('ADD')}>
          <ListItemIcon>
            <AddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Add Stock</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => handleStockAction('REMOVE')}>
          <ListItemIcon>
            <RemoveIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Remove Stock</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => handleStockAction('SET')}>
          <ListItemIcon>
            <SetIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Set Stock Level</ListItemText>
        </MenuItem>
        
        <MenuItem 
          onClick={handleDelete} 
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete Material</ListItemText>
        </MenuItem>
      </Menu>

      <Dialog open={stockDialogOpen} onClose={() => setStockDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{getStockDialogTitle()}</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              <strong>{material.name}</strong>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Current Stock: {material.inStock} {material.unit}
            </Typography>
          </Box>

          <TextField
            fullWidth
            label={getStockDialogLabel()}
            type="number"
            value={stockQuantity}
            onChange={(e) => setStockQuantity(e.target.value)}
            inputProps={{ min: 0 }}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Reason (Optional)"
            value={stockReason}
            onChange={(e) => setStockReason(e.target.value)}
            placeholder="e.g., Received shipment, Used on job, Physical count..."
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStockDialogOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleStockUpdate}
            variant="contained"
            disabled={submitting || !stockQuantity}
          >
            {submitting ? 'Updating...' : 'Update Stock'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}