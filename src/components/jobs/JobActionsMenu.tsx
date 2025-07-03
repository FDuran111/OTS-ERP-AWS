'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
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

interface Job {
  id: string
  jobNumber: string
  title: string
  customer: string
  customerId: string
  type: 'SERVICE_CALL' | 'INSTALLATION'
  status: string
  priority: string
  dueDate: string | null
  completedDate: string | null
  crew: string[]
  estimatedHours?: number
  actualHours?: number
  estimatedCost?: number
  actualCost?: number
  billedAmount?: number
  address?: string
  city?: string
  state?: string
}

interface JobActionsMenuProps {
  job: Job
  onEdit: (job: Job) => void
  onDelete: (job: Job) => void
  onView: (job: Job) => void
}

export default function JobActionsMenu({ job, onEdit, onDelete, onView }: JobActionsMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const { hasRole } = useAuth()
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation()
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleEdit = () => {
    onEdit(job)
    handleClose()
  }

  const handleDelete = () => {
    const confirmMessage = `Are you sure you want to delete job ${job.jobNumber}?\n\n` +
      `This will permanently delete:\n` +
      `• Job details and history\n` +
      `• Time entries\n` +
      `• Material usage records\n` +
      `• Job phases and notes\n` +
      `• All related data\n\n` +
      `This action cannot be undone.`
    
    if (window.confirm(confirmMessage)) {
      onDelete(job)
    }
    handleClose()
  }

  const handleView = () => {
    onView(job)
    handleClose()
  }

  return (
    <>
      <IconButton
        size="small"
        onClick={handleClick}
        aria-label="job actions"
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
        {hasRole(['OWNER_ADMIN']) && (
          <MenuItem onClick={handleEdit}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit Job</ListItemText>
          </MenuItem>
        )}
        {hasRole(['OWNER_ADMIN']) && (
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete Job</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  )
}