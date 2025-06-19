'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  Stack,
  IconButton,
} from '@mui/material'
import {
  Inventory as InventoryIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material'

interface MaterialAvailability {
  id: string
  code: string
  name: string
  unit: string
  inStock: number
  totalReserved: number
  availableStock: number
  minStock: number
  category: string
  utilizationPercent: number
  status: 'CRITICAL' | 'LOW' | 'ADEQUATE' | 'WELL_STOCKED'
  trend: 'INCREASING' | 'STABLE' | 'DECREASING'
}

interface MaterialAvailabilityWidgetProps {
  refreshTrigger?: number
  materialId?: string
  showOnlyCritical?: boolean
}

export default function MaterialAvailabilityWidget({ 
  refreshTrigger = 0, 
  materialId,
  showOnlyCritical = false 
}: MaterialAvailabilityWidgetProps) {
  const [materials, setMaterials] = useState<MaterialAvailability[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    fetchAvailabilityData()
  }, [refreshTrigger, materialId])

  const fetchAvailabilityData = async () => {
    try {
      setLoading(true)
      setError(null)

      let url = '/api/materials/availability'
      const params = new URLSearchParams()
      
      if (materialId) {
        params.append('materialId', materialId)
      }
      if (showOnlyCritical) {
        params.append('criticalOnly', 'true')
      }

      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await fetch(url, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch availability data: ${response.status}`)
      }

      const data = await response.json()
      
      // Transform data to include calculated fields
      const processedMaterials = data.map((material: any) => {
        const utilizationPercent = material.inStock > 0 
          ? (material.totalReserved / material.inStock) * 100 
          : 0

        let status: 'CRITICAL' | 'LOW' | 'ADEQUATE' | 'WELL_STOCKED'
        if (material.availableStock <= 0 || material.inStock <= material.minStock * 0.5) {
          status = 'CRITICAL'
        } else if (material.inStock <= material.minStock) {
          status = 'LOW'
        } else if (material.inStock >= material.minStock * 1.5) {
          status = 'WELL_STOCKED'
        } else {
          status = 'ADEQUATE'
        }

        // Mock trend calculation (in real app, this would be based on historical data)
        const trend = utilizationPercent > 75 ? 'DECREASING' : utilizationPercent < 25 ? 'INCREASING' : 'STABLE'

        return {
          ...material,
          utilizationPercent: Math.min(utilizationPercent, 100),
          status,
          trend
        }
      })

      setMaterials(processedMaterials)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error fetching availability data:', error)
      setError('Failed to load material availability')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CRITICAL': return 'error'
      case 'LOW': return 'warning'
      case 'ADEQUATE': return 'info'
      case 'WELL_STOCKED': return 'success'
      default: return 'default'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CRITICAL': return WarningIcon
      case 'LOW': return WarningIcon
      case 'ADEQUATE': return CheckIcon
      case 'WELL_STOCKED': return CheckIcon
      default: return InventoryIcon
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'INCREASING': return TrendingUpIcon
      case 'DECREASING': return TrendingDownIcon
      default: return null
    }
  }

  const criticalMaterials = materials.filter(m => m.status === 'CRITICAL')
  const lowStockMaterials = materials.filter(m => m.status === 'LOW')

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <InventoryIcon color="primary" />
            <Typography variant="h6">Material Availability</Typography>
          </Box>
          <Typography>Loading availability data...</Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InventoryIcon color="primary" />
            <Typography variant="h6">Material Availability</Typography>
            {lastUpdated && (
              <Chip 
                label={`Updated ${lastUpdated.toLocaleTimeString()}`} 
                size="small" 
                variant="outlined"
              />
            )}
          </Box>
          <IconButton onClick={fetchAvailabilityData} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Summary Stats */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error.main">
                {criticalMaterials.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Critical
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {lowStockMaterials.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Low Stock
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main">
                {materials.reduce((sum, m) => sum + m.totalReserved, 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Reserved
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="text.primary">
                {materials.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total Items
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Critical Items Alert */}
        {criticalMaterials.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold">
              ⚠️ {criticalMaterials.length} critical items need immediate attention
            </Typography>
            <Typography variant="caption">
              These items are out of stock or critically low
            </Typography>
          </Alert>
        )}

        {/* Material List */}
        {materials.length > 0 ? (
          <List>
            {materials.slice(0, materialId ? materials.length : 10).map((material) => {
              const StatusIcon = getStatusIcon(material.status)
              const TrendIcon = getTrendIcon(material.trend)
              
              return (
                <ListItem key={material.id} divider>
                  <ListItemIcon>
                    <StatusIcon color={getStatusColor(material.status) as any} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" fontWeight="medium">
                          {material.code} - {material.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {TrendIcon && (
                            <Tooltip title={`Stock ${material.trend.toLowerCase()}`}>
                              <TrendIcon fontSize="small" color="action" />
                            </Tooltip>
                          )}
                          <Chip
                            label={material.status.replace('_', ' ')}
                            size="small"
                            color={getStatusColor(material.status) as any}
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Available: {material.availableStock} {material.unit} | 
                            Reserved: {material.totalReserved} {material.unit} | 
                            Total: {material.inStock} {material.unit}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Min: {material.minStock} {material.unit}
                          </Typography>
                        </Box>
                        
                        {/* Utilization Bar */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={material.utilizationPercent}
                            color={material.utilizationPercent > 80 ? 'warning' : 'primary'}
                            sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 35 }}>
                            {material.utilizationPercent.toFixed(0)}%
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
              )
            })}
          </List>
        ) : (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <InventoryIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {materialId ? 'Material not found' : 'No materials to display'}
            </Typography>
          </Box>
        )}

        {!materialId && materials.length > 10 && (
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Showing first 10 of {materials.length} materials
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}