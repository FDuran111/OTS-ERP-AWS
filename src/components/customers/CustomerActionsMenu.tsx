'use client'

import { useState } from 'react'
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material'

interface Customer {
  id: string
  name: string
  companyName?: string
  firstName: string
  lastName: string
  type: string
  phone: string
  email?: string
  address: string
  totalJobs: number
  activeJobs: number
  status: string
}

interface CustomerActionsMenuProps {
  customer: Customer
  onEdit: (customer: Customer) => void
  onDelete: (customer: Customer) => void
  onView: (customer: Customer) => void
}

export default function CustomerActionsMenu({ customer, onEdit, onDelete, onView }: CustomerActionsMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation()
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleEdit = () => {
    onEdit(customer)
    handleClose()
  }

  const handleDelete = () => {
    const confirmMessage = customer.totalJobs > 0 
      ? `Customer ${customer.name} has ${customer.totalJobs} job(s). Are you sure you want to delete this customer?`
      : `Are you sure you want to delete customer ${customer.name}?`
      
    if (window.confirm(confirmMessage)) {
      onDelete(customer)
    }
    handleClose()
  }

  const handleView = () => {
    onView(customer)
    handleClose()
  }

  return (
    <>
      <IconButton
        size="small"
        onClick={handleClick}
        aria-label="customer actions"
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
        <MenuItem onClick={handleView}>
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Customer</ListItemText>
        </MenuItem>
        <MenuItem 
          onClick={handleDelete} 
          sx={{ color: 'error.main' }}
          disabled={customer.totalJobs > 0}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color={customer.totalJobs > 0 ? 'disabled' : 'error'} />
          </ListItemIcon>
          <ListItemText>
            {customer.totalJobs > 0 ? 'Has Jobs' : 'Delete Customer'}
          </ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
}