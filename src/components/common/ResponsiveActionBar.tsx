'use client'

import React from 'react'
import {
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  Fab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  ButtonProps,
} from '@mui/material'
import {
  MoreVert as MoreVertIcon,
  Add as AddIcon,
} from '@mui/icons-material'

export interface ActionItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  variant?: 'contained' | 'outlined' | 'text'
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'
  disabled?: boolean
  primary?: boolean
}

interface ResponsiveActionBarProps {
  actions: ActionItem[]
  title?: string
  maxMobileActions?: number
  className?: string
}

export default function ResponsiveActionBar({
  actions,
  title,
  maxMobileActions = 2,
  className
}: ResponsiveActionBarProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null)
  const [speedDialOpen, setSpeedDialOpen] = React.useState(false)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleActionClick = (action: ActionItem) => {
    action.onClick()
    handleMenuClose()
  }

  if (isMobile) {
    const primaryActions = actions.filter(action => action.primary).slice(0, maxMobileActions)
    const secondaryActions = actions.filter(action => !action.primary)
    const overflowActions = actions.filter(action => action.primary).slice(maxMobileActions)
    const allOverflowActions = [...overflowActions, ...secondaryActions]

    return (
      <Box className={className}>
        {/* Primary actions - always visible */}
        <Box sx={{ 
          display: 'flex', 
          gap: 1, 
          mb: allOverflowActions.length > 0 ? 1 : 0,
          flexWrap: 'wrap'
        }}>
          {primaryActions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'contained'}
              color={action.color || 'primary'}
              startIcon={action.icon}
              onClick={action.onClick}
              disabled={action.disabled}
              size="small"
              sx={{ 
                flex: 1,
                minWidth: 0,
                fontSize: '0.75rem',
                px: 1
              }}
            >
              {action.label}
            </Button>
          ))}
        </Box>

        {/* Secondary actions in grid layout */}
        {allOverflowActions.length > 0 && (
          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 1
          }}>
            {allOverflowActions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || 'outlined'}
                color={action.color || 'primary'}
                startIcon={action.icon}
                onClick={action.onClick}
                disabled={action.disabled}
                size="small"
                sx={{ 
                  fontSize: '0.7rem',
                  px: 1,
                  py: 0.5
                }}
              >
                {action.label}
              </Button>
            ))}
          </Box>
        )}
      </Box>
    )
  }

  // Desktop: Show all actions in a row with overflow menu if needed
  const visibleActions = actions.slice(0, 6) // Show max 6 actions on desktop
  const overflowActions = actions.slice(6)

  return (
    <Box className={className} sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      {visibleActions.map((action, index) => (
        <Button
          key={index}
          variant={action.variant || 'outlined'}
          color={action.color || 'primary'}
          startIcon={action.icon}
          onClick={action.onClick}
          disabled={action.disabled}
        >
          {action.label}
        </Button>
      ))}
      
      {overflowActions.length > 0 && (
        <>
          <IconButton onClick={handleMenuOpen}>
            <MoreVertIcon />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            {overflowActions.map((action, index) => (
              <MenuItem
                key={index}
                onClick={() => handleActionClick(action)}
                disabled={action.disabled}
              >
                {action.icon && (
                  <ListItemIcon>
                    {action.icon}
                  </ListItemIcon>
                )}
                <ListItemText primary={action.label} />
              </MenuItem>
            ))}
          </Menu>
        </>
      )}
    </Box>
  )
}

// Floating Action Button version for bottom-right placement
export function ResponsiveSpeedDial({
  actions,
  className
}: {
  actions: ActionItem[]
  className?: string
}) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [open, setOpen] = React.useState(false)

  if (!isMobile || actions.length === 0) {
    return null
  }

  const handleOpen = () => setOpen(true)
  const handleClose = () => setOpen(false)

  return (
    <SpeedDial
      ariaLabel="Actions"
      sx={{ 
        position: 'fixed', 
        bottom: 16, 
        right: 16,
        zIndex: 1000
      }}
      icon={<SpeedDialIcon />}
      onClose={handleClose}
      onOpen={handleOpen}
      open={open}
      className={className}
    >
      {actions.map((action, index) => (
        <SpeedDialAction
          key={index}
          icon={action.icon}
          tooltipTitle={action.label}
          onClick={() => {
            action.onClick()
            handleClose()
          }}
        />
      ))}
    </SpeedDial>
  )
}