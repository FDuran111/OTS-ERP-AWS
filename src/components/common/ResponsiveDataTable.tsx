'use client'

import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Card,
  CardContent,
  Typography,
  Box,
  useTheme,
  useMediaQuery,
  Chip,
  IconButton,
  Stack,
  Divider,
  Button,
} from '@mui/material'
import { MoreVert as MoreVertIcon } from '@mui/icons-material'

export interface TableColumn {
  key: string
  label: string
  sortable?: boolean
  width?: string | number
  align?: 'left' | 'center' | 'right'
  render?: (value: any, row: any) => React.ReactNode
  mobileRender?: (value: any, row: any) => React.ReactNode
  hideOnMobile?: boolean
  mobileLabel?: string
}

export interface ResponsiveDataTableProps {
  data: any[]
  columns: TableColumn[]
  loading?: boolean
  onRowClick?: (row: any) => void
  onAction?: (action: string, row: any) => void
  actions?: Array<{
    label: string
    icon?: React.ReactNode
    onClick: (row: any) => void
    color?: 'primary' | 'secondary' | 'error' | 'warning'
  }>
  emptyMessage?: string
  mobileCardTitle?: (row: any) => string
  mobileCardSubtitle?: (row: any) => string
  className?: string
}

export default function ResponsiveDataTable({
  data,
  columns,
  loading = false,
  onRowClick,
  onAction,
  actions = [],
  emptyMessage = 'No data available',
  mobileCardTitle,
  mobileCardSubtitle,
  className
}: ResponsiveDataTableProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  // Mobile Card Layout
  const MobileCardLayout = () => (
    <Box className={className} sx={{ p: 1 }}>
      {data.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              {emptyMessage}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          {data.map((row, index) => (
            <Card 
              key={index}
              sx={{ 
                cursor: onRowClick ? 'pointer' : 'default',
                '&:hover': onRowClick ? {
                  boxShadow: 2,
                  borderColor: 'primary.main'
                } : {}
              }}
              onClick={() => onRowClick?.(row)}
            >
              <CardContent sx={{ p: 3 }}>
                {/* Card Header */}
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  mb: 2
                }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    {mobileCardTitle && (
                      <Typography 
                        variant="subtitle1" 
                        sx={{ 
                          fontWeight: 600,
                          mb: 0.5,
                          fontSize: '1rem',
                          lineHeight: 1.3,
                          wordBreak: 'break-word'
                        }}
                      >
                        {mobileCardTitle(row)}
                      </Typography>
                    )}
                    {mobileCardSubtitle && (
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{ 
                          display: 'block',
                          fontSize: '0.875rem',
                          mb: 1,
                          wordBreak: 'break-word'
                        }}
                      >
                        {mobileCardSubtitle(row)}
                      </Typography>
                    )}
                  </Box>
                  
                  {actions.length > 0 && (
                    <IconButton size="small" sx={{ ml: 1 }}>
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>

                {/* Card Content - Show main fields */}
                <Stack spacing={1.5}>
                  {columns
                    .filter(col => !col.hideOnMobile)
                    .slice(0, 4) // Show max 4 fields on mobile
                    .map((column, colIndex) => {
                      const value = row[column.key]
                      const displayValue = column.mobileRender 
                        ? column.mobileRender(value, row)
                        : column.render 
                        ? column.render(value, row)
                        : value

                      return (
                        <Box 
                          key={colIndex}
                          sx={{ 
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            minHeight: 24
                          }}
                        >
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            sx={{ 
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              textTransform: 'uppercase',
                              letterSpacing: 0.5,
                              flex: '0 0 auto',
                              mr: 2
                            }}
                          >
                            {column.mobileLabel || column.label}
                          </Typography>
                          <Box sx={{ 
                            flex: 1,
                            textAlign: 'right',
                            minWidth: 0
                          }}>
                            {typeof displayValue === 'string' ? (
                              <Typography 
                                variant="body2"
                                sx={{ 
                                  fontSize: '0.875rem',
                                  wordBreak: 'break-word',
                                  textAlign: 'right'
                                }}
                              >
                                {displayValue}
                              </Typography>
                            ) : (
                              displayValue
                            )}
                          </Box>
                        </Box>
                      )
                    })}
                </Stack>

                {/* Actions */}
                {actions.length > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {actions.map((action, actionIndex) => (
                        <Button
                          key={actionIndex}
                          size="small"
                          color={action.color || 'primary'}
                          startIcon={action.icon}
                          onClick={(e) => {
                            e.stopPropagation()
                            action.onClick(row)
                          }}
                          sx={{ fontSize: '0.75rem' }}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </Stack>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  )

  // Desktop Table Layout
  const DesktopTableLayout = () => (
    <TableContainer 
      component={Paper} 
      className={className}
      sx={{ 
        overflowX: 'auto',
        '& .MuiTable-root': {
          minWidth: 650
        }
      }}
    >
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((column, index) => (
              <TableCell
                key={index}
                align={column.align || 'left'}
                sx={{ 
                  fontWeight: 600,
                  backgroundColor: 'grey.50',
                  whiteSpace: 'nowrap',
                  ...(column.width && { 
                    width: column.width,
                    minWidth: column.width 
                  })
                }}
              >
                {column.label}
              </TableCell>
            ))}
            {actions.length > 0 && (
              <TableCell 
                align="center"
                sx={{ 
                  fontWeight: 600,
                  backgroundColor: 'grey.50',
                  width: 80
                }}
              >
                Actions
              </TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell 
                colSpan={columns.length + (actions.length > 0 ? 1 : 0)}
                sx={{ textAlign: 'center', py: 4 }}
              >
                <Typography variant="body1" color="text.secondary">
                  {emptyMessage}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, rowIndex) => (
              <TableRow
                key={rowIndex}
                hover={!!onRowClick}
                sx={{ 
                  cursor: onRowClick ? 'pointer' : 'default',
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column, colIndex) => {
                  const value = row[column.key]
                  const displayValue = column.render 
                    ? column.render(value, row)
                    : value

                  return (
                    <TableCell
                      key={colIndex}
                      align={column.align || 'left'}
                      sx={{ 
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {displayValue}
                    </TableCell>
                  )
                })}
                {actions.length > 0 && (
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        // Handle action menu
                      }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography>Loading...</Typography>
      </Box>
    )
  }

  return isMobile ? <MobileCardLayout /> : <DesktopTableLayout />
}

// Helper function to create responsive chip
export const ResponsiveChip = ({ 
  label, 
  color, 
  size = 'small',
  ...props 
}: any) => (
  <Chip
    label={label}
    color={color}
    size={size}
    sx={{
      fontSize: { xs: '0.7rem', sm: '0.75rem' },
      height: { xs: 24, sm: 28 },
      ...props.sx
    }}
    {...props}
  />
)

// Helper function to create responsive text with truncation
export const ResponsiveText = ({ 
  children, 
  maxLines = 1,
  variant = 'body2',
  ...props 
}: any) => (
  <Typography
    variant={variant}
    sx={{
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      display: '-webkit-box',
      WebkitLineClamp: maxLines,
      WebkitBoxOrient: 'vertical',
      wordBreak: 'break-word',
      fontSize: { xs: '0.875rem', sm: '1rem' },
      ...props.sx
    }}
    {...props}
  >
    {children}
  </Typography>
)