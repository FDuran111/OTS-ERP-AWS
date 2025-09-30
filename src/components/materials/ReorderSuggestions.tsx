'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  IconButton,
  Tooltip,
  LinearProgress,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material'
import {
  Refresh as RefreshIcon,
  ShoppingCart as OrderIcon,
  TrendingUp,
  TrendingDown,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon,
} from '@mui/icons-material'
import { format, differenceInDays, parseISO } from 'date-fns'
import toast from 'react-hot-toast'

interface ForecastMaterial {
  id: string
  code: string
  name: string
  category: string
  unit: string
  inStock: number
  minStock: number
  cost: number
  price: number
  abcClass: string
  avgDailyUsage: number
  usageVariance: number
  leadTimeDays: number
  reorderPoint: number
  economicOrderQty: number
  stockoutDate: string | null
  stockoutProbability: number
  confidenceScore: number
  totalUsageLast30Days: number
  totalUsageLast90Days: number
  totalUsageLast365Days: number
  jobsUsedOnLast90Days: number
  lastUsedDate: string | null
  stockStatus: string
  calculatedAt: string
  onOrderQty?: number
}

interface ForecastSummary {
  totalMaterials: number
  classACount: number
  classBCount: number
  classCCount: number
  lowStockCount: number
  reorderCount: number
  highRiskCount: number
  avgConfidence: number
}

interface Vendor {
  id: string
  name: string
  code: string
}

export default function ReorderSuggestions() {
  const [materials, setMaterials] = useState<ForecastMaterial[]>([])
  const [summary, setSummary] = useState<ForecastSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [abcClass, setAbcClass] = useState('')
  const [minStockoutProb, setMinStockoutProb] = useState('0.5')
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set())
  
  const [poDialogOpen, setPoDialogOpen] = useState(false)
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [selectedVendor, setSelectedVendor] = useState('')
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('')
  const [poNotes, setPoNotes] = useState('')
  const [creatingPO, setCreatingPO] = useState(false)

  useEffect(() => {
    fetchForecast()
    fetchVendors()
  }, [abcClass, minStockoutProb])

  const fetchForecast = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (abcClass) params.append('abcClass', abcClass)
      if (minStockoutProb) params.append('minStockoutProb', minStockoutProb)
      
      const token = localStorage.getItem('auth-token')
      const response = await fetch(`/api/materials/forecast?${params}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include'
      })
      
      if (!response.ok) throw new Error('Failed to fetch forecast data')
      
      const data = await response.json()
      
      const materialsWithOnOrder = await enrichWithOnOrderQty(data.materials || [])
      
      setMaterials(materialsWithOnOrder)
      setSummary(data.summary || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load forecast')
      toast.error('Failed to load forecast data')
    } finally {
      setLoading(false)
    }
  }

  const fetchVendors = async () => {
    try {
      const token = localStorage.getItem('auth-token')
      const response = await fetch('/api/vendors', {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setVendors(data || [])
      }
    } catch (err) {
      console.error('Failed to fetch vendors:', err)
    }
  }

  const enrichWithOnOrderQty = async (materials: ForecastMaterial[]) => {
    try {
      const token = localStorage.getItem('auth-token')
      const response = await fetch('/api/materials/on-order', {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include'
      })
      
      if (!response.ok) return materials

      const onOrderMap = await response.json()
      
      return materials.map(material => ({
        ...material,
        onOrderQty: onOrderMap[material.id] || 0
      }))
    } catch (err) {
      console.error('Failed to fetch on-order quantities:', err)
      return materials
    }
  }

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedMaterials(new Set(materials.map(m => m.id)))
    } else {
      setSelectedMaterials(new Set())
    }
  }

  const handleSelectMaterial = (materialId: string) => {
    const newSelected = new Set(selectedMaterials)
    if (newSelected.has(materialId)) {
      newSelected.delete(materialId)
    } else {
      newSelected.add(materialId)
    }
    setSelectedMaterials(newSelected)
  }

  const handleOpenPODialog = () => {
    if (selectedMaterials.size === 0) {
      toast.error('Please select at least one material')
      return
    }
    setPoDialogOpen(true)
  }

  const handleClosePODialog = () => {
    setPoDialogOpen(false)
    setSelectedVendor('')
    setExpectedDeliveryDate('')
    setPoNotes('')
  }

  const handleCreatePO = async () => {
    if (!selectedVendor) {
      toast.error('Please select a vendor')
      return
    }

    try {
      setCreatingPO(true)
      
      const items = materials
        .filter(m => selectedMaterials.has(m.id))
        .map(m => {
          const quantity = m.economicOrderQty || m.reorderPoint || m.minStock || 1
          if (quantity <= 0) {
            throw new Error(`Invalid quantity for ${m.code}: ${quantity}`)
          }
          return {
            materialId: m.id,
            quantity,
            unitCost: m.cost
          }
        })

      const token = localStorage.getItem('auth-token')
      const response = await fetch('/api/purchase-orders/from-reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({
          vendorId: selectedVendor,
          items,
          expectedDeliveryDate: expectedDeliveryDate || null,
          notes: poNotes || null
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create purchase order')
      }

      const result = await response.json()
      toast.success(`Purchase Order ${result.purchaseOrder.poNumber} created successfully!`)
      
      setSelectedMaterials(new Set())
      handleClosePODialog()
      
      fetchForecast()
    } catch (err) {
      console.error('Error creating PO:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to create purchase order')
    } finally {
      setCreatingPO(false)
    }
  }

  const getAbcClassColor = (abcClass: string) => {
    switch (abcClass) {
      case 'A': return 'error'
      case 'B': return 'warning'
      case 'C': return 'success'
      default: return 'default'
    }
  }

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'CRITICAL': return 'error'
      case 'LOW': return 'warning'
      case 'REORDER': return 'info'
      case 'OK': return 'success'
      default: return 'default'
    }
  }

  const getStockStatusIcon = (status: string) => {
    switch (status) {
      case 'CRITICAL': return <WarningIcon sx={{ color: 'error.main' }} />
      case 'LOW': return <WarningIcon sx={{ color: 'warning.main' }} />
      case 'REORDER': return <InfoIcon sx={{ color: 'info.main' }} />
      case 'OK': return <CheckIcon sx={{ color: 'success.main' }} />
      default: return <InfoIcon />
    }
  }

  const getTrendIcon = (avgDailyUsage: number, totalUsageLast30Days: number) => {
    if (!avgDailyUsage || !totalUsageLast30Days) return null
    const recent30DayAvg = totalUsageLast30Days / 30
    const trendFactor = avgDailyUsage > 0 ? recent30DayAvg / avgDailyUsage : 1
    
    if (trendFactor > 1.1) return <TrendingUp sx={{ color: 'error.main' }} />
    if (trendFactor < 0.9) return <TrendingDown sx={{ color: 'success.main' }} />
    return null
  }

  const formatStockoutDate = (stockoutDate: string | null) => {
    if (!stockoutDate) return 'N/A'
    
    try {
      const date = parseISO(stockoutDate)
      const daysUntil = differenceInDays(date, new Date())
      
      if (daysUntil < 0) return 'Overdue'
      if (daysUntil === 0) return 'Today'
      if (daysUntil === 1) return 'Tomorrow'
      if (daysUntil <= 7) return `${daysUntil} days`
      if (daysUntil <= 30) return `${daysUntil} days`
      
      return format(date, 'MMM d, yyyy')
    } catch (err) {
      return 'Invalid date'
    }
  }

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Analyzing material forecasts...</Typography>
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

      {/* Header Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h6">
          Material Forecast & Reorder Suggestions
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>ABC Class</InputLabel>
            <Select
              value={abcClass}
              onChange={(e) => setAbcClass(e.target.value)}
              label="ABC Class"
            >
              <MenuItem value="">All Classes</MenuItem>
              <MenuItem value="A">Class A</MenuItem>
              <MenuItem value="B">Class B</MenuItem>
              <MenuItem value="C">Class C</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Min Stockout Risk</InputLabel>
            <Select
              value={minStockoutProb}
              onChange={(e) => setMinStockoutProb(e.target.value)}
              label="Min Stockout Risk"
            >
              <MenuItem value="0">All (0%)</MenuItem>
              <MenuItem value="0.25">Low (25%)</MenuItem>
              <MenuItem value="0.5">Medium (50%)</MenuItem>
              <MenuItem value="0.75">High (75%)</MenuItem>
              <MenuItem value="0.9">Critical (90%)</MenuItem>
            </Select>
          </FormControl>
          
          <IconButton onClick={fetchForecast} disabled={loading}>
            <RefreshIcon />
          </IconButton>

          {selectedMaterials.size > 0 && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<OrderIcon />}
              onClick={handleOpenPODialog}
            >
              Create PO ({selectedMaterials.size})
            </Button>
          )}
        </Stack>
      </Box>

      {/* Summary Cards */}
      {summary && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography color="text.secondary" variant="caption">
                Total Materials
              </Typography>
              <Typography variant="h6">{summary.totalMaterials}</Typography>
            </CardContent>
          </Card>
          
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography color="text.secondary" variant="caption">
                Class A (High Value)
              </Typography>
              <Typography variant="h6" color="error">
                {summary.classACount}
              </Typography>
            </CardContent>
          </Card>
          
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography color="text.secondary" variant="caption">
                Class B (Medium Value)
              </Typography>
              <Typography variant="h6" color="warning.main">
                {summary.classBCount}
              </Typography>
            </CardContent>
          </Card>
          
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography color="text.secondary" variant="caption">
                Class C (Low Value)
              </Typography>
              <Typography variant="h6" color="success.main">
                {summary.classCCount}
              </Typography>
            </CardContent>
          </Card>
          
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography color="text.secondary" variant="caption">
                Needs Reorder
              </Typography>
              <Typography variant="h6" color="primary">
                {summary.reorderCount}
              </Typography>
            </CardContent>
          </Card>
          
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography color="text.secondary" variant="caption">
                High Risk Stockout
              </Typography>
              <Typography variant="h6" color="error">
                {summary.highRiskCount}
              </Typography>
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* Materials Table */}
      {materials.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <CheckIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" color="success.main">
              No Materials Match Criteria
            </Typography>
            <Typography color="text.secondary">
              Adjust filters to see more materials or all materials are adequately stocked.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selectedMaterials.size > 0 && selectedMaterials.size < materials.length}
                        checked={materials.length > 0 && selectedMaterials.size === materials.length}
                        onChange={handleSelectAll}
                      />
                    </TableCell>
                    <TableCell>Material</TableCell>
                    <TableCell align="center">ABC Class</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="right">In Stock</TableCell>
                    <TableCell align="right">On Order</TableCell>
                    <TableCell align="right">Reorder Point</TableCell>
                    <TableCell align="right">Order Qty</TableCell>
                    <TableCell align="right">Est. Cost</TableCell>
                    <TableCell align="right">Stockout Date</TableCell>
                    <TableCell align="center">Risk</TableCell>
                    <TableCell align="center">Confidence</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {materials.map((material) => {
                    const isSelected = selectedMaterials.has(material.id)
                    const estimatedCost = (material.economicOrderQty || material.reorderPoint) * material.cost
                    
                    return (
                      <TableRow 
                        key={material.id} 
                        hover
                        selected={isSelected}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleSelectMaterial(material.id)}
                          />
                        </TableCell>
                        
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {material.code}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {material.name}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5, gap: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                {material.category}
                              </Typography>
                              {getTrendIcon(material.avgDailyUsage, material.totalUsageLast30Days)}
                            </Box>
                          </Box>
                        </TableCell>
                        
                        <TableCell align="center">
                          <Chip
                            label={material.abcClass || 'N/A'}
                            size="small"
                            color={getAbcClassColor(material.abcClass) as any}
                            sx={{ fontWeight: 'bold', minWidth: 40 }}
                          />
                        </TableCell>
                        
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                            {getStockStatusIcon(material.stockStatus)}
                            <Chip
                              label={material.stockStatus}
                              size="small"
                              color={getStockStatusColor(material.stockStatus) as any}
                              variant="outlined"
                            />
                          </Box>
                        </TableCell>
                        
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium">
                            {material.inStock.toLocaleString()} {material.unit}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Min: {material.minStock} {material.unit}
                          </Typography>
                        </TableCell>
                        
                        <TableCell align="right">
                          <Typography 
                            variant="body2" 
                            fontWeight="medium"
                            color={material.onOrderQty && material.onOrderQty > 0 ? 'primary' : 'text.secondary'}
                          >
                            {material.onOrderQty ? `${material.onOrderQty.toLocaleString()} ${material.unit}` : '-'}
                          </Typography>
                        </TableCell>
                        
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium" color="primary">
                            {material.reorderPoint.toLocaleString()} {material.unit}
                          </Typography>
                        </TableCell>
                        
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium">
                            {(material.economicOrderQty || material.reorderPoint).toLocaleString()} {material.unit}
                          </Typography>
                        </TableCell>
                        
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium">
                            {formatCurrency(estimatedCost)}
                          </Typography>
                        </TableCell>
                        
                        <TableCell align="right">
                          <Typography 
                            variant="body2" 
                            fontWeight="medium"
                            color={
                              !material.stockoutDate ? 'text.secondary' :
                              differenceInDays(parseISO(material.stockoutDate), new Date()) <= 7 ? 'error' : 
                              differenceInDays(parseISO(material.stockoutDate), new Date()) <= 14 ? 'warning.main' : 
                              'text.primary'
                            }
                          >
                            {formatStockoutDate(material.stockoutDate)}
                          </Typography>
                        </TableCell>
                        
                        <TableCell align="center">
                          <Typography 
                            variant="body2" 
                            fontWeight="medium"
                            color={
                              material.stockoutProbability >= 0.75 ? 'error' :
                              material.stockoutProbability >= 0.5 ? 'warning.main' :
                              'success.main'
                            }
                          >
                            {Math.round(material.stockoutProbability * 100)}%
                          </Typography>
                        </TableCell>
                        
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <LinearProgress
                              variant="determinate"
                              value={material.confidenceScore * 100}
                              color={
                                material.confidenceScore >= 0.8 ? 'success' : 
                                material.confidenceScore >= 0.6 ? 'warning' : 
                                'error'
                              }
                              sx={{ width: 60, mb: 0.5 }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {Math.round(material.confidenceScore * 100)}%
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Create PO Dialog */}
      <Dialog open={poDialogOpen} onClose={handleClosePODialog} maxWidth="sm" fullWidth>
        <DialogTitle>Create Purchase Order</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Creating PO for {selectedMaterials.size} selected material(s)
          </Typography>
          
          <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
            <InputLabel>Vendor *</InputLabel>
            <Select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              label="Vendor *"
              required
            >
              {vendors.map((vendor) => (
                <MenuItem key={vendor.id} value={vendor.id}>
                  {vendor.name} ({vendor.code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            type="date"
            label="Expected Delivery Date"
            value={expectedDeliveryDate}
            onChange={(e) => setExpectedDeliveryDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Notes"
            value={poNotes}
            onChange={(e) => setPoNotes(e.target.value)}
            placeholder="Add any notes or special instructions..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePODialog} disabled={creatingPO}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreatePO} 
            variant="contained" 
            disabled={creatingPO || !selectedVendor}
            startIcon={creatingPO ? <CircularProgress size={20} /> : <OrderIcon />}
          >
            {creatingPO ? 'Creating...' : 'Create PO'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}