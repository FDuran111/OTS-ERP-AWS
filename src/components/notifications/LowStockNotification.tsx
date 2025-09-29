'use client'

import { useState, useEffect } from 'react'
import {
  Alert,
  AlertTitle,
  Box,
  Chip,
  Button,
  Collapse,
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Badge,
} from '@mui/material'
import {
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  Inventory as InventoryIcon,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'

interface LowStockItem {
  id: string
  code: string
  name: string
  inStock: number
  minStock: number
  unit: string
  category: string
  stockPercentage: number
}

interface LowStockNotificationProps {
  refreshTrigger?: number
}

export default function LowStockNotification({ refreshTrigger }: LowStockNotificationProps) {
  const router = useRouter()
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  useEffect(() => {
    fetchLowStockItems()
  }, [refreshTrigger])

  const fetchLowStockItems = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth-token')
      const response = await fetch('/api/materials/low-stock', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setLowStockItems(data.items || [])
        setLastChecked(new Date())
      } else {
        // Handle non-OK responses gracefully
        console.warn('Low stock API returned:', response.status)
        setLowStockItems([])
      }
    } catch (error) {
      console.error('Error fetching low stock items:', error)
      setLowStockItems([])
    } finally {
      setLoading(false)
    }
  }

  const getCriticalityLevel = (stockPercentage: number) => {
    if (stockPercentage <= 0) return { level: 'critical', color: 'error', icon: '🚨' }
    if (stockPercentage <= 25) return { level: 'urgent', color: 'error', icon: '⚠️' }
    if (stockPercentage <= 50) return { level: 'low', color: 'warning', icon: '📉' }
    return { level: 'normal', color: 'info', icon: '📦' }
  }

  const handleViewMaterials = () => {
    router.push('/materials?filter=lowStock')
  }

  const handleViewItem = (materialId: string) => {
    router.push(`/materials?highlight=${materialId}`)
  }

  if (lowStockItems.length === 0) {
    return null // Don't show if no low stock items
  }

  const criticalItems = lowStockItems.filter(item => item.stockPercentage <= 25)
  const urgentItems = lowStockItems.filter(item => item.stockPercentage > 25 && item.stockPercentage <= 50)

  return (
    <Alert 
      severity={criticalItems.length > 0 ? "error" : "warning"}
      sx={{ mb: 2 }}
      action={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            size="small"
            onClick={fetchLowStockItems}
            disabled={loading}
          >
            <RefreshIcon />
          </IconButton>
          <Button
            size="small"
            onClick={() => setExpanded(!expanded)}
            endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          >
            {expanded ? 'Hide' : 'Details'}
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleViewMaterials}
            startIcon={<InventoryIcon />}
          >
            View Materials
          </Button>
        </Box>
      }
    >
      <AlertTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon />
          <span>Low Stock Alert</span>
          <Badge badgeContent={lowStockItems.length} color="error" />
        </Box>
      </AlertTitle>
      
      <Typography variant="body2" sx={{ mb: 1 }}>
        {criticalItems.length > 0 && (
          <span>🚨 {criticalItems.length} critical item(s) need immediate attention. </span>
        )}
        {urgentItems.length > 0 && (
          <span>⚠️ {urgentItems.length} item(s) are running low. </span>
        )}
        Total: {lowStockItems.length} item(s) below minimum stock levels.
      </Typography>

      {lastChecked && (
        <Typography variant="caption" color="text.secondary">
          Last checked: {lastChecked.toLocaleTimeString()}
        </Typography>
      )}

      <Collapse in={expanded}>
        <Box sx={{ mt: 2 }}>
          <List dense>
            {lowStockItems
              .sort((a, b) => a.stockPercentage - b.stockPercentage) // Most critical first
              .map((item) => {
                const criticality = getCriticalityLevel(item.stockPercentage)
                return (
                  <ListItem 
                    key={item.id}
                    sx={{ 
                      border: 1, 
                      borderColor: 'divider', 
                      borderRadius: 1, 
                      mb: 1,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                    onClick={() => handleViewItem(item.id)}
                  >
                    <ListItemText
                      primary={
                        <>
                          <Typography component="span" variant="body1" sx={{ fontSize: '1.1rem', mr: 1 }}>
                            {criticality.icon}
                          </Typography>
                          <Typography component="span" variant="subtitle2" fontWeight="medium" sx={{ mr: 1 }}>
                            {item.code} - {item.name}
                          </Typography>
                          <Chip 
                            label={criticality.level.toUpperCase()} 
                            size="small" 
                            color={criticality.color as any}
                            variant="outlined"
                            sx={{ ml: 1 }}
                          />
                        </>
                      }
                      secondary={
                        <>
                          <Typography component="span" variant="body2" color="text.secondary" display="block">
                            Current: {item.inStock} {item.unit} | Minimum: {item.minStock} {item.unit}
                          </Typography>
                          <Typography component="span" variant="body2" color="text.secondary" display="block">
                            Category: {item.category} | Stock Level: {item.stockPercentage.toFixed(1)}%
                          </Typography>
                        </>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Typography 
                        variant="h6" 
                        color={criticality.color}
                        fontWeight="bold"
                      >
                        {item.stockPercentage.toFixed(0)}%
                      </Typography>
                    </ListItemSecondaryAction>
                  </ListItem>
                )
              })}
          </List>
        </Box>
      </Collapse>
    </Alert>
  )
}