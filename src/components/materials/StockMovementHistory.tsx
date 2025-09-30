'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Pagination,
} from '@mui/material'
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  SwapHoriz as SwapIcon,
  Build as BuildIcon,
  ShoppingCart as PurchaseIcon,
  Warning as WarningIcon,
} from '@mui/icons-material'
import { format } from 'date-fns'

interface StockMovement {
  id: string
  materialId: string
  materialCode: string
  materialName: string
  materialUnit: string
  storageLocationId?: string
  locationName?: string
  jobId?: string
  jobNumber?: string
  userId?: string
  userName?: string
  type: string
  quantityBefore: number
  quantityChanged: number
  quantityAfter: number
  unitCost?: number
  totalValue?: number
  reason?: string
  referenceNumber?: string
  metadata?: any
  createdAt: string
  updatedAt: string
}

interface StockMovementHistoryProps {
  materialId?: string
  showMaterialInfo?: boolean
}

export default function StockMovementHistory({ 
  materialId, 
  showMaterialInfo = true 
}: StockMovementHistoryProps) {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    type: '',
    dateFrom: '',
    dateTo: '',
  })

  const pageSize = 20

  useEffect(() => {
    fetchMovements()
  }, [materialId, currentPage, filters])

  const fetchMovements = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: ((currentPage - 1) * pageSize).toString(),
      })

      if (materialId) params.append('materialId', materialId)
      if (filters.type) params.append('type', filters.type)
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)

      const token = localStorage.getItem('auth-token')
      const response = await fetch(`/api/stock-movements?${params}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error(`Failed to fetch stock movements: ${response.status}`)
      }
      
      const data = await response.json()
      setMovements(data.movements || [])
      setTotalPages(data.pagination?.pages || 1)
    } catch (err) {
      console.error('Error fetching stock movements:', err)
      setError(err instanceof Error ? err.message : 'Failed to load stock movements')
    } finally {
      setLoading(false)
    }
  }

  const getMovementTypeIcon = (type: string) => {
    switch (type) {
      case 'ADJUSTMENT_IN':
      case 'PURCHASE':
      case 'RETURN':
        return <TrendingUpIcon sx={{ color: 'success.main' }} />
      case 'ADJUSTMENT_OUT':
      case 'JOB_USAGE':
      case 'WASTE':
        return <TrendingDownIcon sx={{ color: 'error.main' }} />
      case 'TRANSFER_IN':
      case 'TRANSFER_OUT':
        return <SwapIcon sx={{ color: 'info.main' }} />
      case 'INITIAL_STOCK':
        return <PurchaseIcon sx={{ color: 'primary.main' }} />
      case 'AUDIT_CORRECTION':
        return <WarningIcon sx={{ color: 'warning.main' }} />
      default:
        return <BuildIcon sx={{ color: 'text.secondary' }} />
    }
  }

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'ADJUSTMENT_IN':
      case 'PURCHASE':
      case 'RETURN':
        return 'success'
      case 'ADJUSTMENT_OUT':
      case 'JOB_USAGE':
      case 'WASTE':
        return 'error'
      case 'TRANSFER_IN':
      case 'TRANSFER_OUT':
        return 'info'
      case 'INITIAL_STOCK':
        return 'primary'
      case 'AUDIT_CORRECTION':
        return 'warning'
      default:
        return 'default'
    }
  }

  const formatMovementType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ')
  }

  const formatQuantity = (quantity: number, unit: string) => {
    return `${quantity.toLocaleString()} ${unit}`
  }

  const formatCurrency = (amount?: number) => {
    return amount ? `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset to first page when filtering
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading stock movements...</Typography>
      </Box>
    )
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Stock Movement History {materialId && '- Material Specific'}
        </Typography>
        <IconButton onClick={fetchMovements} size="small">
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Movement Type</InputLabel>
            <Select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              label="Movement Type"
            >
              <MenuItem value="">All Types</MenuItem>
              <MenuItem value="ADJUSTMENT_IN">Adjustment In</MenuItem>
              <MenuItem value="ADJUSTMENT_OUT">Adjustment Out</MenuItem>
              <MenuItem value="PURCHASE">Purchase</MenuItem>
              <MenuItem value="JOB_USAGE">Job Usage</MenuItem>
              <MenuItem value="TRANSFER_IN">Transfer In</MenuItem>
              <MenuItem value="TRANSFER_OUT">Transfer Out</MenuItem>
              <MenuItem value="WASTE">Waste</MenuItem>
              <MenuItem value="RETURN">Return</MenuItem>
              <MenuItem value="AUDIT_CORRECTION">Audit Correction</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            label="From Date"
            type="date"
            size="small"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          
          <TextField
            label="To Date"
            type="date"
            size="small"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
      </Paper>

      {/* Movements Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date/Time</TableCell>
              {showMaterialInfo && <TableCell>Material</TableCell>}
              <TableCell>Type</TableCell>
              <TableCell align="right">Before</TableCell>
              <TableCell align="right">Change</TableCell>
              <TableCell align="right">After</TableCell>
              <TableCell align="right">Value</TableCell>
              <TableCell>Reference</TableCell>
              <TableCell>User</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showMaterialInfo ? 9 : 8} align="center">
                  <Typography color="text.secondary">
                    No stock movements found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              movements.map((movement) => (
                <TableRow key={movement.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {format(new Date(movement.createdAt), 'MMM dd, yyyy')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(movement.createdAt), 'HH:mm:ss')}
                    </Typography>
                  </TableCell>
                  
                  {showMaterialInfo && (
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {movement.materialCode}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {movement.materialName}
                      </Typography>
                    </TableCell>
                  )}
                  
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getMovementTypeIcon(movement.type)}
                      <Chip
                        label={formatMovementType(movement.type)}
                        size="small"
                        color={getMovementTypeColor(movement.type) as any}
                        variant="outlined"
                      />
                    </Box>
                  </TableCell>
                  
                  <TableCell align="right">
                    <Typography variant="body2">
                      {formatQuantity(movement.quantityBefore, movement.materialUnit)}
                    </Typography>
                  </TableCell>
                  
                  <TableCell align="right">
                    <Typography 
                      variant="body2" 
                      color={movement.quantityChanged >= 0 ? 'success.main' : 'error.main'}
                      fontWeight="medium"
                    >
                      {movement.quantityChanged >= 0 ? '+' : ''}
                      {formatQuantity(movement.quantityChanged, movement.materialUnit)}
                    </Typography>
                  </TableCell>
                  
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="medium">
                      {formatQuantity(movement.quantityAfter, movement.materialUnit)}
                    </Typography>
                  </TableCell>
                  
                  <TableCell align="right">
                    <Typography variant="body2">
                      {formatCurrency(movement.totalValue)}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Box>
                      {movement.jobNumber && (
                        <Typography variant="caption" sx={{ display: 'block' }}>
                          Job: {movement.jobNumber}
                        </Typography>
                      )}
                      {movement.referenceNumber && (
                        <Typography variant="caption" sx={{ display: 'block' }}>
                          Ref: {movement.referenceNumber}
                        </Typography>
                      )}
                      {movement.reason && (
                        <Tooltip title={movement.reason}>
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            sx={{ 
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: 120
                            }}
                          >
                            {movement.reason}
                          </Typography>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2">
                      {movement.userName || 'System'}
                    </Typography>
                    {movement.locationName && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {movement.locationName}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(_, page) => setCurrentPage(page)}
            color="primary"
          />
        </Box>
      )}
    </Box>
  )
}