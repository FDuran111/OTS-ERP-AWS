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
  Stack,
  Divider,
  ButtonProps,
} from '@mui/material'
import {
  MoreVert as MoreVertIcon,
} from '@mui/icons-material'

export interface ButtonAction {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  variant?: 'contained' | 'outlined' | 'text'
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'
  disabled?: boolean
  primary?: boolean
  mobileLabel?: string
  hideOnMobile?: boolean
  hideOnDesktop?: boolean
}

interface ResponsiveButtonGroupProps {
  actions: ButtonAction[]
  maxMobileButtons?: number
  maxDesktopButtons?: number
  direction?: 'row' | 'column'
  spacing?: number
  className?: string
  fullWidth?: boolean
}

export default function ResponsiveButtonGroup({
  actions,
  maxMobileButtons = 2,
  maxDesktopButtons = 5,
  direction = 'row',
  spacing = 1,
  className,
  fullWidth = false
}: ResponsiveButtonGroupProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleActionClick = (action: ButtonAction) => {
    action.onClick()
    handleMenuClose()
  }

  // Filter actions based on device
  const filteredActions = actions.filter(action => {
    if (isMobile && action.hideOnMobile) return false
    if (!isMobile && action.hideOnDesktop) return false
    return true
  })

  if (isMobile) {
    // Mobile: Show primary actions + overflow menu
    const primaryActions = filteredActions
      .filter(action => action.primary)
      .slice(0, maxMobileButtons)
    
    const secondaryActions = filteredActions.filter(action => !action.primary)
    const overflowActions = filteredActions
      .filter(action => action.primary)
      .slice(maxMobileButtons)
    
    const allOverflowActions = [...overflowActions, ...secondaryActions]

    return (
      <Box className={className}>
        {/* Primary Actions */}
        <Stack 
          direction={direction}
          spacing={spacing}
          sx={{ 
            width: fullWidth ? '100%' : 'auto',
            mb: allOverflowActions.length > 0 ? 1 : 0
          }}
        >
          {primaryActions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'contained'}
              color={action.color || 'primary'}
              startIcon={action.icon}
              onClick={action.onClick}
              disabled={action.disabled}
              size="medium"
              sx={{ 
                flex: fullWidth && direction === 'row' ? 1 : 'none',
                minHeight: 44, // Touch-friendly
                fontSize: '0.875rem',
                px: 2,
                py: 1.5
              }}
            >
              {action.mobileLabel || action.label}
            </Button>
          ))}
          
          {/* Overflow Menu Button */}
          {allOverflowActions.length > 0 && (
            <IconButton
              onClick={handleMenuOpen}
              sx={{ 
                minHeight: 44,
                minWidth: 44,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1
              }}
            >
              <MoreVertIcon />
            </IconButton>
          )}
        </Stack>

        {/* Secondary Actions Grid (if no overflow) */}
        {allOverflowActions.length === 0 && secondaryActions.length > 0 && (
          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 1,
            mt: 1
          }}>
            {secondaryActions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || 'outlined'}
                color={action.color || 'primary'}
                startIcon={action.icon}
                onClick={action.onClick}
                disabled={action.disabled}
                size="small"
                sx={{ 
                  fontSize: '0.75rem',
                  minHeight: 40
                }}
              >
                {action.mobileLabel || action.label}
              </Button>
            ))}
          </Box>
        )}

        {/* Overflow Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          {allOverflowActions.map((action, index) => (
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
              <ListItemText 
                primary={action.mobileLabel || action.label}
                primaryTypographyProps={{
                  fontSize: '0.875rem'
                }}
              />
            </MenuItem>
          ))}
        </Menu>
      </Box>
    )
  }

  // Desktop: Show all actions with overflow menu if needed
  const visibleActions = filteredActions.slice(0, maxDesktopButtons)
  const overflowActions = filteredActions.slice(maxDesktopButtons)

  return (
    <Box className={className}>
      <Stack 
        direction={direction} 
        spacing={spacing}
        sx={{ 
          flexWrap: 'wrap',
          width: fullWidth ? '100%' : 'auto'
        }}
      >
        {visibleActions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant || 'outlined'}
            color={action.color || 'primary'}
            startIcon={action.icon}
            onClick={action.onClick}
            disabled={action.disabled}
            sx={{
              whiteSpace: 'nowrap'
            }}
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
      </Stack>
    </Box>
  )
}

// Responsive Stack component for better layout control
export const ResponsiveStack = ({
  children,
  direction = 'row',
  spacing = 2,
  mobileDirection = 'column',
  mobileSpacing,
  className,
  ...props
}: {
  children: React.ReactNode
  direction?: 'row' | 'column'
  spacing?: number
  mobileDirection?: 'row' | 'column'
  mobileSpacing?: number
  className?: string
  [key: string]: any
}) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  return (
    <Stack
      direction={isMobile ? mobileDirection : direction}
      spacing={isMobile ? (mobileSpacing ?? spacing) : spacing}
      className={className}
      sx={{
        width: { xs: '100%', md: 'auto' },
        ...props.sx
      }}
      {...props}
    >
      {children}
    </Stack>
  )
}