'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Collapse,
  useTheme,
  useMediaQuery,
  Stack,
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material'
import { useState } from 'react'

interface Column {
  id: string
  label: string
  minWidth?: number
  align?: 'right' | 'left' | 'center'
  format?: (value: any) => string | React.ReactNode
  sortable?: boolean
  hideOnMobile?: boolean
}

interface ResponsiveTableProps {
  columns: Column[]
  data: any[]
  onRowClick?: (row: any) => void
  stickyHeader?: boolean
  mobileCardRenderer?: (row: any, index: number) => React.ReactNode
  emptyMessage?: string
  loading?: boolean
}

export default function ResponsiveTable({
  columns,
  data,
  onRowClick,
  stickyHeader = true,
  mobileCardRenderer,
  emptyMessage = 'No data available',
  loading = false
}: ResponsiveTableProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  const handleRowExpand = (index: number) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedRows(newExpanded)
  }

  // Default mobile card renderer
  const defaultMobileCardRenderer = (row: any, index: number) => {
    const primaryColumns = columns.filter(col => !col.hideOnMobile).slice(0, 3)
    const secondaryColumns = columns.filter(col => !col.hideOnMobile).slice(3)
    const isExpanded = expandedRows.has(index)

    return (
      <Card
        key={index}
        className="mb-3 cursor-pointer transition-all duration-200 hover:shadow-md"
        onClick={() => onRowClick?.(row)}
        sx={{
          border: 1,
          borderColor: 'divider',
          '&:hover': {
            borderColor: 'primary.main',
            boxShadow: theme.shadows[4],
          }
        }}
      >
        <CardContent className="p-4">
          {/* Primary Info - Always Visible */}
          <Box className="flex justify-between items-start mb-2">
            <Box className="flex-1 min-w-0">
              {primaryColumns.map((column) => {
                const value = row[column.id]
                const formattedValue = column.format ? column.format(value) : value
                
                return (
                  <Box key={column.id} className="mb-1">
                    <Typography
                      variant="body2"
                      className="text-gray-600 dark:text-gray-400 text-xs"
                    >
                      {column.label}
                    </Typography>
                    <Typography
                      variant="body1"
                      className="font-medium text-gray-900 dark:text-gray-100 truncate"
                    >
                      {formattedValue}
                    </Typography>
                  </Box>
                )
              })}
            </Box>
            
            {/* Expand Button */}
            {secondaryColumns.length > 0 && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRowExpand(index)
                }}
                className="ml-2"
              >
                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            )}
          </Box>

          {/* Secondary Info - Expandable */}
          {secondaryColumns.length > 0 && (
            <Collapse in={isExpanded}>
              <Box className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <Stack spacing={1}>
                  {secondaryColumns.map((column) => {
                    const value = row[column.id]
                    const formattedValue = column.format ? column.format(value) : value
                    
                    return (
                      <Box key={column.id} className="flex justify-between items-center">
                        <Typography
                          variant="caption"
                          className="text-gray-600 dark:text-gray-400"
                        >
                          {column.label}
                        </Typography>
                        <Typography
                          variant="body2"
                          className="font-medium text-gray-900 dark:text-gray-100 text-right"
                        >
                          {formattedValue}
                        </Typography>
                      </Box>
                    )
                  })}
                </Stack>
              </Box>
            </Collapse>
          )}
        </CardContent>
      </Card>
    )
  }

  // Loading state
  if (loading) {
    return (
      <Box className="w-full">
        {isMobile ? (
          <Box className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent>
                  <Box className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                  <Box className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                  <Box className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : (
          <TableContainer component={Paper} className="animate-pulse">
            <Table>
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableCell key={column.id}>
                      <Box className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((column) => (
                      <TableCell key={column.id}>
                        <Box className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    )
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <Box className="w-full">
        {isMobile ? (
          <Card>
            <CardContent className="text-center py-12">
              <Typography
                variant="body1"
                className="text-gray-500 dark:text-gray-400"
              >
                {emptyMessage}
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableCell
                      key={column.id}
                      align={column.align}
                      style={{ minWidth: column.minWidth }}
                      className="font-semibold"
                    >
                      {column.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-12">
                    <Typography
                      variant="body1"
                      className="text-gray-500 dark:text-gray-400"
                    >
                      {emptyMessage}
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    )
  }

  // Mobile view - Card layout
  if (isMobile) {
    return (
      <Box className="w-full">
        {data.map((row, index) => (
          mobileCardRenderer ? mobileCardRenderer(row, index) : defaultMobileCardRenderer(row, index)
        ))}
      </Box>
    )
  }

  // Desktop view - Table layout
  return (
    <TableContainer
      component={Paper}
      className="w-full"
      sx={{
        boxShadow: theme.shadows[2],
        border: 1,
        borderColor: 'divider',
      }}
    >
      <Table stickyHeader={stickyHeader}>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={column.id}
                align={column.align}
                style={{ minWidth: column.minWidth }}
                className="font-semibold bg-gray-50 dark:bg-gray-800"
                sx={{
                  backgroundColor: 'grey.50',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, index) => (
            <TableRow
              key={index}
              hover
              onClick={() => onRowClick?.(row)}
              className={`
                transition-colors duration-200
                ${onRowClick ? 'cursor-pointer' : ''}
              `}
              sx={{
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
                ...(onRowClick && {
                  cursor: 'pointer',
                })
              }}
            >
              {columns.map((column) => {
                const value = row[column.id]
                const formattedValue = column.format ? column.format(value) : value
                
                return (
                  <TableCell
                    key={column.id}
                    align={column.align}
                    className="py-4"
                  >
                    {formattedValue}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}