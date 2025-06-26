'use client'

import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  Tooltip,
  Stack,
} from '@mui/material'
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Category as CategoryIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material'
import { useState } from 'react'
import { format } from 'date-fns'

interface LaborRate {
  id: string
  name: string
  description?: string
  hourlyRate: number
  skillLevel: string
  category: string
  effectiveDate: string
  expiryDate?: string
  active: boolean
  createdAt: string
  updatedAt: string
}

interface LaborRateCardProps {
  rate: LaborRate
  onEdit: (rate: LaborRate) => void
  onDelete: (rate: LaborRate) => void
  skillLevelColor?: string
}

export default function LaborRateCard({
  rate,
  onEdit,
  onDelete,
  skillLevelColor = 'default'
}: LaborRateCardProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const menuOpen = Boolean(anchorEl)

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleEdit = () => {
    onEdit(rate)
    handleMenuClose()
  }

  const handleDelete = () => {
    onDelete(rate)
    handleMenuClose()
  }

  const isExpired = rate.expiryDate && new Date(rate.expiryDate) < new Date()
  const isEffective = new Date(rate.effectiveDate) <= new Date()

  return (
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        opacity: rate.active ? 1 : 0.6,
        border: isExpired ? '1px solid' : undefined,
        borderColor: isExpired ? 'error.main' : undefined,
      }}
    >
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        {/* Header with title and menu */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h6" component="h3" noWrap title={rate.name}>
              {rate.name}
            </Typography>
            {rate.description && (
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  mt: 0.5,
                  minHeight: '2.5em'
                }}
                title={rate.description}
              >
                {rate.description}
              </Typography>
            )}
          </Box>
          <IconButton
            size="small"
            onClick={handleMenuClick}
            sx={{ ml: 1 }}
          >
            <MoreVertIcon />
          </IconButton>
        </Box>

        {/* Rate Display */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <MoneyIcon sx={{ color: 'success.main', mr: 1 }} />
          <Typography variant="h4" color="success.main" fontWeight="bold">
            ${rate.hourlyRate.toFixed(2)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
            /hour
          </Typography>
        </Box>

        {/* Tags */}
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}>
          <Chip
            label={rate.skillLevel.replace('_', ' ')}
            size="small"
            color={skillLevelColor as any}
            icon={<PersonIcon />}
          />
          <Chip
            label={rate.category}
            size="small"
            variant="outlined"
            icon={<CategoryIcon />}
          />
        </Stack>

        {/* Status Indicators */}
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
            {!rate.active && (
              <Chip
                label="Inactive"
                size="small"
                color="error"
                icon={<VisibilityOffIcon />}
              />
            )}
            {isExpired && (
              <Chip
                label="Expired"
                size="small"
                color="error"
                icon={<ScheduleIcon />}
              />
            )}
            {!isEffective && (
              <Chip
                label="Future"
                size="small"
                color="warning"
                icon={<ScheduleIcon />}
              />
            )}
            {rate.active && isEffective && !isExpired && (
              <Chip
                label="Active"
                size="small"
                color="success"
                icon={<VisibilityIcon />}
              />
            )}
          </Stack>
        </Box>

        {/* Rate Calculations */}
        <Box sx={{ backgroundColor: 'background.default', p: 1.5, borderRadius: 1, mb: 2 }}>
          <Typography variant="caption" color="text.secondary" gutterBottom display="block">
            Quick Calculations
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption">4 hours:</Typography>
            <Typography variant="caption" fontWeight="medium">
              ${(rate.hourlyRate * 4).toFixed(2)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption">8 hours:</Typography>
            <Typography variant="caption" fontWeight="medium">
              ${(rate.hourlyRate * 8).toFixed(2)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption">40 hours:</Typography>
            <Typography variant="caption" fontWeight="medium">
              ${(rate.hourlyRate * 40).toFixed(2)}
            </Typography>
          </Box>
        </Box>

        {/* Effective Period */}
        <Box>
          <Typography variant="caption" color="text.secondary" gutterBottom display="block">
            Effective Period
          </Typography>
          <Typography variant="caption" display="block">
            From: {format(new Date(rate.effectiveDate), 'MMM d, yyyy')}
          </Typography>
          {rate.expiryDate && (
            <Typography variant="caption" display="block">
              Until: {format(new Date(rate.expiryDate), 'MMM d, yyyy')}
            </Typography>
          )}
          {!rate.expiryDate && (
            <Typography variant="caption" color="text.secondary">
              No expiry date
            </Typography>
          )}
        </Box>
      </CardContent>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          Edit Rate
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          Delete Rate
        </MenuItem>
      </Menu>
    </Card>
  )
}