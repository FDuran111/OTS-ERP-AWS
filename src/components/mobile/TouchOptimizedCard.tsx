'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardActions,
  Box,
  Typography,
  IconButton,
  Chip,
  Avatar,
  useTheme,
  alpha,
  Collapse,
  Divider,
  Stack,
  Button,
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  MoreVert as MoreVertIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
} from '@mui/icons-material'

interface TouchOptimizedCardProps {
  title: string
  subtitle?: string
  description?: string
  status?: {
    label: string
    color: 'success' | 'warning' | 'error' | 'info' | 'default'
  }
  avatar?: {
    src?: string
    text?: string
    color?: string
  }
  metadata?: Array<{
    icon: React.ReactElement
    label: string
    value: string
    action?: () => void
  }>
  actions?: Array<{
    icon: React.ReactElement
    label: string
    color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'
    onClick: () => void
  }>
  expandable?: boolean
  expandedContent?: React.ReactNode
  onClick?: () => void
  onLongPress?: () => void
}

export default function TouchOptimizedCard({
  title,
  subtitle,
  description,
  status,
  avatar,
  metadata,
  actions,
  expandable = false,
  expandedContent,
  onClick,
  onLongPress
}: TouchOptimizedCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [pressed, setPressed] = useState(false)
  const theme = useTheme()

  const handleExpandClick = () => {
    setExpanded(!expanded)
  }

  const handleTouchStart = () => {
    setPressed(true)
    if (onLongPress) {
      // Long press detection
      const timer = setTimeout(() => {
        onLongPress()
      }, 500)
      
      const handleTouchEnd = () => {
        setPressed(false)
        clearTimeout(timer)
        document.removeEventListener('touchend', handleTouchEnd)
        document.removeEventListener('touchcancel', handleTouchEnd)
      }
      
      document.addEventListener('touchend', handleTouchEnd)
      document.addEventListener('touchcancel', handleTouchEnd)
    }
  }

  const handleTouchEnd = () => {
    setPressed(false)
  }

  const handleClick = () => {
    if (onClick) {
      onClick()
    }
  }

  return (
    <Card
      sx={{
        mb: 2,
        borderRadius: 3,
        boxShadow: pressed ? 4 : 1,
        transform: pressed ? 'scale(0.98)' : 'scale(1)',
        transition: 'all 0.15s ease-in-out',
        cursor: onClick ? 'pointer' : 'default',
        backgroundColor: pressed ? alpha(theme.palette.primary.main, 0.04) : 'background.paper',
        // Touch-friendly minimum height
        minHeight: 80,
        '&:hover': {
          boxShadow: 2,
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
    >
      <CardContent sx={{ pb: actions ? 1 : 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          {/* Avatar */}
          {avatar && (
            <Avatar
              src={avatar.src}
              sx={{
                bgcolor: avatar.color || 'primary.main',
                width: 48,
                height: 48,
                fontSize: '1.2rem',
                fontWeight: 'bold'
              }}
            >
              {avatar.text}
            </Avatar>
          )}

          {/* Main Content */}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flexGrow: 1
                }}
              >
                {title}
              </Typography>
              {status && (
                <Chip
                  label={status.label}
                  color={status.color}
                  size="small"
                  sx={{ 
                    height: 24,
                    fontSize: '0.75rem',
                    fontWeight: 500
                  }}
                />
              )}
            </Box>

            {subtitle && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mb: description ? 0.5 : 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {subtitle}
              </Typography>
            )}

            {description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  lineHeight: 1.4,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {description}
              </Typography>
            )}

            {/* Metadata */}
            {metadata && metadata.length > 0 && (
              <Stack direction="row" spacing={2} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                {metadata.slice(0, 3).map((item, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      cursor: item.action ? 'pointer' : 'default',
                      '&:hover': item.action ? {
                        color: 'primary.main'
                      } : {}
                    }}
                    onClick={(e) => {
                      if (item.action) {
                        e.stopPropagation()
                        item.action()
                      }
                    }}
                  >
                    {item.icon}
                    <Typography variant="caption" color="text.secondary">
                      {item.value}
                    </Typography>
                  </Box>
                ))}
                {metadata.length > 3 && (
                  <Typography variant="caption" color="text.secondary">
                    +{metadata.length - 3} more
                  </Typography>
                )}
              </Stack>
            )}
          </Box>

          {/* Expand Button */}
          {expandable && (
            <IconButton
              onClick={(e) => {
                e.stopPropagation()
                handleExpandClick()
              }}
              sx={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease-in-out',
                width: 44,
                height: 44
              }}
            >
              <ExpandMoreIcon />
            </IconButton>
          )}
        </Box>
      </CardContent>

      {/* Expanded Content */}
      {expandable && (
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Divider />
          <CardContent sx={{ pt: 2 }}>
            {expandedContent}
          </CardContent>
        </Collapse>
      )}

      {/* Actions */}
      {actions && actions.length > 0 && (
        <>
          <Divider />
          <CardActions
            sx={{
              p: 2,
              pt: 1,
              gap: 1,
              flexWrap: 'wrap',
              '& .MuiButton-root': {
                minHeight: 44, // Touch-friendly button height
                borderRadius: 2
              }
            }}
          >
            {actions.map((action, index) => (
              <Button
                key={index}
                size="small"
                color={action.color || 'primary'}
                variant={index === 0 ? 'contained' : 'outlined'}
                startIcon={action.icon}
                onClick={(e) => {
                  e.stopPropagation()
                  action.onClick()
                }}
                sx={{
                  flexGrow: actions.length <= 2 ? 1 : 0,
                  minWidth: actions.length > 2 ? 'auto' : undefined
                }}
              >
                {action.label}
              </Button>
            ))}
          </CardActions>
        </>
      )}
    </Card>
  )
}

// Specialized card components for different entity types

export function CustomerCard({
  customer,
  onEdit,
  onCall,
  onEmail,
  onViewJobs
}: {
  customer: any
  onEdit: () => void
  onCall?: () => void
  onEmail?: () => void
  onViewJobs: () => void
}) {
  const metadata = [
    ...(customer.phone ? [{
      icon: <PhoneIcon fontSize="small" />,
      label: 'Phone',
      value: customer.phone,
      action: onCall
    }] : []),
    ...(customer.email ? [{
      icon: <EmailIcon fontSize="small" />,
      label: 'Email',
      value: customer.email,
      action: onEmail
    }] : []),
    ...(customer.city && customer.state ? [{
      icon: <LocationIcon fontSize="small" />,
      label: 'Location',
      value: `${customer.city}, ${customer.state}`
    }] : [])
  ]

  return (
    <TouchOptimizedCard
      title={customer.companyName || `${customer.firstName} ${customer.lastName}`}
      subtitle={customer.companyName ? `${customer.firstName} ${customer.lastName}` : undefined}
      avatar={{
        text: (customer.companyName || customer.firstName || 'C').charAt(0).toUpperCase(),
        color: 'primary.main'
      }}
      metadata={metadata}
      actions={[
        {
          icon: <EditIcon />,
          label: 'Edit',
          onClick: onEdit
        },
        {
          icon: <LocationIcon />,
          label: 'View Jobs',
          color: 'secondary',
          onClick: onViewJobs
        }
      ]}
      onClick={onViewJobs}
    />
  )
}

export function JobCard({
  job,
  onEdit,
  onViewDetails,
  onUpdateStatus
}: {
  job: any
  onEdit: () => void
  onViewDetails: () => void
  onUpdateStatus: () => void
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'info' as const
      case 'IN_PROGRESS': return 'warning' as const
      case 'COMPLETED': return 'success' as const
      case 'CANCELLED': return 'error' as const
      default: return 'default' as const
    }
  }

  const metadata = [
    {
      icon: <LocationIcon fontSize="small" />,
      label: 'Location',
      value: `${job.city}, ${job.state}`
    },
    ...(job.scheduledDate ? [{
      icon: <LocationIcon fontSize="small" />,
      label: 'Scheduled',
      value: new Date(job.scheduledDate).toLocaleDateString()
    }] : [])
  ]

  return (
    <TouchOptimizedCard
      title={job.jobNumber}
      subtitle={job.description}
      status={{
        label: job.status,
        color: getStatusColor(job.status)
      }}
      metadata={metadata}
      actions={[
        {
          icon: <EditIcon />,
          label: 'Edit',
          onClick: onEdit
        },
        {
          icon: <ShareIcon />,
          label: 'Update Status',
          color: 'secondary',
          onClick: onUpdateStatus
        }
      ]}
      onClick={onViewDetails}
    />
  )
}