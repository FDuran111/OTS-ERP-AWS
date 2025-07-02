'use client'

// Force dynamic rendering to prevent caching issues
export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ResponsiveLayout from '@/components/layout/ResponsiveLayout'
import ResponsiveContainer from '@/components/layout/ResponsiveContainer'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  useTheme,
  Stack,
  MenuItem,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  Work as WorkIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  Inventory as InventoryIcon,
  Receipt as ReceiptIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  AccessTime as TimeIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Warning,
  CheckCircle,
  Error as ErrorIcon,
  TrendingUp,
  Clear as ClearIcon,
  History as HistoryIcon,
} from '@mui/icons-material'
import AddMaterialDialog from '@/components/materials/AddMaterialDialog'
import EditMaterialDialog from '@/components/materials/EditMaterialDialog'
import MaterialActionsMenu from '@/components/materials/MaterialActionsMenu'
import MaterialReservationDialog from '@/components/materials/MaterialReservationDialog'
import StorageLocationDialog from '@/components/materials/StorageLocationDialog'
import StockMovementHistory from '@/components/materials/StockMovementHistory'
import StockAnalyticsDashboard from '@/components/analytics/StockAnalyticsDashboard'
import ReorderSuggestions from '@/components/materials/ReorderSuggestions'

const drawerWidth = 240

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface Material {
  id: string
  code: string
  name: string
  description?: string
  manufacturer?: string
  category: string
  unit: string
  inStock: number
  minStock: number
  totalReserved: number
  availableStock: number
  cost: number
  price: number
  location?: string
  status: string
  vendor?: {
    id: string
    name: string
    code: string
  }
  stockLocations?: {
    id: string
    quantity: number
    location: {
      id: string
      name: string
      code: string
      type: string
    }
  }[]
}

interface Stats {
  title: string
  value: string
  icon: string
  color: string
}


const menuItems = [
  { text: 'Dashboard', icon: DashboardIcon, path: '/dashboard' },
  { text: 'Jobs', icon: WorkIcon, path: '/jobs' },
  { text: 'Schedule', icon: ScheduleIcon, path: '/schedule' },
  { text: 'Time Tracking', icon: TimeIcon, path: '/time' },
  { text: 'Customers', icon: PeopleIcon, path: '/customers' },
  { text: 'Leads', icon: TrendingUp, path: '/leads' },
  { text: 'Materials', icon: InventoryIcon, path: '/materials' },
  { text: 'Invoicing', icon: ReceiptIcon, path: '/invoicing' },
  { text: 'Reports', icon: AssessmentIcon, path: '/reports' },
  { text: 'Settings', icon: SettingsIcon, path: '/settings' },
]

const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  switch (status) {
    case 'In Stock':
      return 'success'
    case 'Low Stock':
      return 'warning'
    case 'Out of Stock':
      return 'error'
    default:
      return 'default'
  }
}

export default function MaterialsPage() {
  const router = useRouter()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [user, setUser] = useState<User | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [manufacturerFilter, setManufacturerFilter] = useState('')
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [availableManufacturers, setAvailableManufacturers] = useState<string[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [stats, setStats] = useState<Stats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [showOnlyLowStock, setShowOnlyLowStock] = useState(false)
  const [storageLocationDialogOpen, setStorageLocationDialogOpen] = useState(false)
  const [stockHistoryDialogOpen, setStockHistoryDialogOpen] = useState(false)
  const [analyticsDialogOpen, setAnalyticsDialogOpen] = useState(false)
  const [reorderDialogOpen, setReorderDialogOpen] = useState(false)
  const [reservationDialogOpen, setReservationDialogOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/login')
      return
    }
    setUser(JSON.parse(storedUser))
  }, [router])

  useEffect(() => {
    if (user) {
      fetchCombinedData()
    }
  }, [user])

  // Check URL params for filters on component mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('filter') === 'lowStock') {
      setShowOnlyLowStock(true)
    }
  }, [])

  const fetchCombinedData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/materials/combined', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch materials: ${response.status}`)
      }
      
      const data = await response.json()
      setMaterials(data.materials || [])
      setStats(data.stats || [])
      
      // Extract unique categories and manufacturers for filters
      const categories = [...new Set(data.materials.map((m: Material) => m.category).filter(Boolean))] as string[]
      const manufacturers = [...new Set(data.materials.map((m: Material) => m.manufacturer).filter(Boolean))] as string[]
      
      setAvailableCategories(categories.sort())
      setAvailableManufacturers(manufacturers.sort())
    } catch (error) {
      console.error('Error fetching materials:', error)
      setError('Failed to load materials')
    } finally {
      setLoading(false)
    }
  }

  const fetchMaterials = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Create AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2000) // 2s timeout
      
      const response = await fetch('/api/materials', {
        cache: 'no-store', // Disable caching
        headers: {
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch materials: ${response.status}`)
      }
      
      const data = await response.json()
      setMaterials(data)
      
      // Extract unique categories and manufacturers for filters
      const categories = [...new Set(data.map((m: Material) => m.category).filter(Boolean))] as string[]
      const manufacturers = [...new Set(data.map((m: Material) => m.manufacturer).filter(Boolean))] as string[]
      
      setAvailableCategories(categories.sort())
      setAvailableManufacturers(manufacturers.sort())
    } catch (error) {
      console.error('Error fetching materials:', error)
      
      if (error instanceof Error && error.name === 'AbortError') {
        setError('Request timed out after 2 seconds - click Retry')
      } else {
        setError('Failed to load materials')
      }
      
      // No auto-retry - user can click Retry or Refresh manually
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      // Create AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2000) // 2s timeout
      
      const response = await fetch('/api/materials/stats', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      } else {
        console.warn('Failed to fetch stats:', response.status)
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Stats request timed out after 2 seconds')
      } else {
        console.error('Error fetching stats:', error)
      }
    }
  }

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    localStorage.removeItem('user')
    router.push('/login')
  }

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleAddMaterial = () => {
    setAddDialogOpen(true)
  }

  const handleEditMaterial = (material: Material) => {
    setSelectedMaterial(material)
    setEditDialogOpen(true)
  }

  const handleDeleteMaterial = async (material: Material) => {
    try {
      const response = await fetch(`/api/materials/${material.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete material')
      }

      await fetchMaterials()
      await fetchStats()
    } catch (error) {
      console.error('Error deleting material:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete material')
    }
  }

  const handleMaterialCreated = () => {
    fetchCombinedData()
    setRefreshTrigger(prev => prev + 1)
  }

  const handleMaterialUpdated = () => {
    fetchCombinedData()
    setRefreshTrigger(prev => prev + 1)
  }

  const handleStockUpdated = () => {
    fetchCombinedData()
    setRefreshTrigger(prev => prev + 1)
  }

  const getStatsIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'inventory': return InventoryIcon
      case 'warning': return Warning
      case 'error': return ErrorIcon
      case 'check_circle': return CheckCircle
      default: return InventoryIcon
    }
  }

  if (!user) return null

  // Action buttons for the page header
  const actionButtons = (
    <Stack 
      direction={{ xs: 'column', sm: 'row' }} 
      spacing={1} 
      sx={{ 
        width: { xs: '100%', sm: 'auto' },
        alignItems: { xs: 'stretch', sm: 'center' }
      }}
    >
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setAddDialogOpen(true)}
        sx={{
          backgroundColor: '#e14eca',
          '&:hover': {
            backgroundColor: '#d236b8',
          },
          flex: { xs: 1, sm: 'none' },
          minWidth: 0
        }}
        size="medium"
      >
        Add Material
      </Button>
    </Stack>
  )

  // Breadcrumbs for navigation
  const breadcrumbs = [
    {
      label: 'Home',
      path: '/dashboard',
      icon: <DashboardIcon fontSize="small" />
    },
    {
      label: 'Materials',
      path: '/materials',
      icon: <InventoryIcon fontSize="small" />
    }
  ]

  return (
    <ResponsiveLayout>
      <ResponsiveContainer
        title="Materials & Inventory"
        subtitle="Manage electrical materials, track inventory, and monitor stock levels"
        breadcrumbs={breadcrumbs}
        actions={actionButtons}
      >
            <Box sx={{ 
              display: 'flex', 
              flexWrap: 'wrap',
              gap: { xs: 1, sm: 1.5, md: 2 },
              justifyContent: { xs: 'center', lg: 'flex-end' },
              maxWidth: { xs: '100%', lg: 'none' }
            }}>
              <Button
                variant="outlined"
                onClick={() => fetchCombinedData()}
                disabled={loading}
                size={isMobile ? 'small' : 'medium'}
                sx={{ 
                  minWidth: 0,
                  flex: { xs: '1 0 calc(50% - 4px)', sm: '0 0 auto' },
                  maxWidth: { xs: 'none', sm: '160px' }
                }}
              >
                {loading ? 'Loading...' : isMobile ? 'Refresh' : 'Refresh'}
              </Button>
              <Button
                variant="outlined"
                startIcon={!isMobile ? <InventoryIcon /> : undefined}
                onClick={() => setStorageLocationDialogOpen(true)}
                size={isMobile ? 'small' : 'medium'}
                sx={{ 
                  minWidth: 0,
                  flex: { xs: '1 0 calc(50% - 4px)', sm: '0 0 auto' },
                  maxWidth: { xs: 'none', sm: '160px' }
                }}
              >
                {isMobile ? 'Locations' : 'Manage Locations'}
              </Button>
              <Button
                variant="outlined"
                startIcon={!isMobile ? <HistoryIcon /> : undefined}
                onClick={() => setStockHistoryDialogOpen(true)}
                size={isMobile ? 'small' : 'medium'}
                sx={{ 
                  minWidth: 0,
                  flex: { xs: '1 0 calc(50% - 4px)', sm: '0 0 auto' },
                  maxWidth: { xs: 'none', sm: '160px' }
                }}
              >
                {isMobile ? 'History' : 'Stock History'}
              </Button>
              <Button
                variant="outlined"
                startIcon={!isMobile ? <AssessmentIcon /> : undefined}
                onClick={() => setAnalyticsDialogOpen(true)}
                size={isMobile ? 'small' : 'medium'}
                sx={{ 
                  minWidth: 0,
                  flex: { xs: '1 0 calc(50% - 4px)', sm: '0 0 auto' },
                  maxWidth: { xs: 'none', sm: '160px' }
                }}
              >
                Analytics
              </Button>
              <Button
                variant="outlined"
                startIcon={!isMobile ? <TrendingUp /> : undefined}
                onClick={() => setReorderDialogOpen(true)}
                size={isMobile ? 'small' : 'medium'}
                sx={{ 
                  minWidth: 0,
                  flex: { xs: '1 0 calc(50% - 4px)', sm: '0 0 auto' },
                  maxWidth: { xs: 'none', sm: '160px' }
                }}
              >
                {isMobile ? 'Reorder' : 'Reorder Suggestions'}
              </Button>
              <Button
                variant="outlined"
                startIcon={!isMobile ? <ScheduleIcon /> : undefined}
                onClick={() => setReservationDialogOpen(true)}
                size={isMobile ? 'small' : 'medium'}
                sx={{ 
                  minWidth: 0,
                  flex: { xs: '1 0 calc(50% - 4px)', sm: '0 0 auto' },
                  maxWidth: { xs: 'none', sm: '160px' }
                }}
              >
                {isMobile ? 'Reserve' : 'Reserve Materials'}
              </Button>
            </Box>

          {/* Stats Cards - More Compact */}
          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)'
            },
            gap: 2,
            mb: 3
          }}>
            {stats.map((stat) => {
              const IconComponent = getStatsIconComponent(stat.icon)
              return (
                <Card key={stat.title} sx={{ position: 'relative', overflow: 'visible' }}>
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 40,
                          height: 40,
                          borderRadius: '10px',
                          backgroundColor: `${stat.color}15`,
                          flexShrink: 0,
                        }}
                      >
                        {React.createElement(IconComponent, { 
                          sx: { color: stat.color, fontSize: 20 } 
                        })}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography 
                          color="text.secondary" 
                          variant="caption"
                          sx={{ display: 'block', lineHeight: 1.2 }}
                        >
                          {stat.title}
                        </Typography>
                        <Typography 
                          variant="h6" 
                          sx={{ fontWeight: 600, lineHeight: 1.2 }}
                        >
                          {stat.value}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              )
            })}
          </Box>


          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🔍 Advanced Search & Filters
              </Typography>
              
              {/* Main Search Row */}
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                <TextField
                  fullWidth
                  placeholder="Search by keyword, brand, part number, description... (e.g., 'Square D', '60 amp disconnect')"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ flex: 2 }}
                />
                <Button
                  variant={showOnlyLowStock ? "contained" : "outlined"}
                  color={showOnlyLowStock ? "warning" : "primary"}
                  onClick={() => setShowOnlyLowStock(!showOnlyLowStock)}
                  startIcon={<Warning />}
                  sx={{ whiteSpace: 'nowrap', minWidth: 160 }}
                >
                  {showOnlyLowStock ? "Show All" : "Low Stock Only"}
                </Button>
              </Box>

              {/* Filter Row */}
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Filter by Brand</InputLabel>
                  <Select
                    value={manufacturerFilter}
                    onChange={(e) => setManufacturerFilter(e.target.value)}
                    label="Filter by Brand"
                    size="small"
                  >
                    <MenuItem value="">All Brands</MenuItem>
                    {availableManufacturers.map((manufacturer) => (
                      <MenuItem key={manufacturer} value={manufacturer}>
                        {manufacturer}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Filter by Category</InputLabel>
                  <Select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    label="Filter by Category"
                    size="small"
                  >
                    <MenuItem value="">All Categories</MenuItem>
                    {availableCategories.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {(searchTerm || categoryFilter || manufacturerFilter || showOnlyLowStock) && (
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setSearchTerm('')
                      setCategoryFilter('')
                      setManufacturerFilter('')
                      setShowOnlyLowStock(false)
                    }}
                    startIcon={<ClearIcon />}
                    size="small"
                  >
                    Clear All
                  </Button>
                )}
              </Box>

              {/* Search Results Summary */}
              {(searchTerm || categoryFilter || manufacturerFilter || showOnlyLowStock) && (
                <Box sx={{ mt: 2, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Active filters: {[
                      searchTerm && `Search: "${searchTerm}"`,
                      manufacturerFilter && `Brand: ${manufacturerFilter}`,
                      categoryFilter && `Category: ${categoryFilter}`,
                      showOnlyLowStock && `Low Stock Only`
                    ].filter(Boolean).join(' • ') || 'None'}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 3 }}
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={() => {
                    fetchMaterials()
                    fetchStats()
                  }}
                >
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          )}



          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'background.default' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Brand/Category</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Stock</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Reserved</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Available</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Cost</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {materials
                    .filter(material => {
                      // Enhanced keyword search across multiple fields
                      const searchLower = searchTerm.toLowerCase()
                      const matchesSearch = !searchTerm || 
                        material.code.toLowerCase().includes(searchLower) ||
                        material.name.toLowerCase().includes(searchLower) ||
                        material.category.toLowerCase().includes(searchLower) ||
                        (material.description && material.description.toLowerCase().includes(searchLower)) ||
                        (material.manufacturer && material.manufacturer.toLowerCase().includes(searchLower)) ||
                        (material.location && material.location.toLowerCase().includes(searchLower))
                      
                      // Filter by category
                      const matchesCategory = !categoryFilter || material.category === categoryFilter
                      
                      // Filter by manufacturer/brand
                      const matchesManufacturer = !manufacturerFilter || material.manufacturer === manufacturerFilter
                      
                      // Filter by stock level
                      const isLowStock = material.inStock <= material.minStock
                      const matchesStockFilter = !showOnlyLowStock || isLowStock
                      
                      return matchesSearch && matchesCategory && matchesManufacturer && matchesStockFilter
                    })
                    .map((material) => {
                      const stockPercentage = material.minStock > 0 ? (material.availableStock / material.minStock) * 100 : 0
                      const stockIcon = 
                        material.inStock === 0 || stockPercentage < 5 ? '🚨' :
                        material.availableStock <= material.minStock ? '⚠️' :
                        stockPercentage >= 150 ? '✅' : '📦'
                      
                      return (
                        <TableRow key={material.id} hover>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {material.code} - {material.name}
                              </Typography>
                              {material.description && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  {material.description}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {material.manufacturer || 'No Brand'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {material.category}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                              <span style={{ fontSize: '1rem' }}>{stockIcon}</span>
                              <Typography variant="body2">
                                {material.inStock}/{material.minStock}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Typography 
                              variant="body2" 
                              color={material.totalReserved > 0 ? 'primary.main' : 'text.secondary'}
                            >
                              {material.totalReserved || 0}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography 
                              variant="body2" 
                              color={material.availableStock <= 0 ? 'error.main' : 'text.primary'}
                              sx={{ fontWeight: material.availableStock <= 0 ? 600 : 400 }}
                            >
                              {material.availableStock || 0}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>
                              {material.location || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              ${material.cost.toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={material.status}
                              color={getStatusColor(material.status)}
                              size="small"
                              sx={{ fontSize: '0.75rem' }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <MaterialActionsMenu
                              material={material}
                              onEdit={handleEditMaterial}
                              onDelete={handleDeleteMaterial}
                              onStockUpdated={handleStockUpdated}
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  {materials.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        <Typography color="text.secondary" sx={{ py: 4 }}>
                          No materials found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <AddMaterialDialog
            open={addDialogOpen}
            onClose={() => setAddDialogOpen(false)}
            onMaterialCreated={handleMaterialCreated}
          />

          <EditMaterialDialog
            open={editDialogOpen}
            material={selectedMaterial}
            onClose={() => {
              setEditDialogOpen(false)
              setSelectedMaterial(null)
            }}
            onMaterialUpdated={handleMaterialUpdated}
          />

          <StorageLocationDialog
            open={storageLocationDialogOpen}
            onClose={() => setStorageLocationDialogOpen(false)}
            onLocationsUpdated={() => {
              fetchMaterials()
              fetchStats()
            }}
          />

          {/* Stock Movement History Dialog */}
          <Dialog 
            open={stockHistoryDialogOpen} 
            onClose={() => setStockHistoryDialogOpen(false)}
            maxWidth="xl"
            fullWidth
          >
            <DialogTitle>
              Stock Movement History
            </DialogTitle>
            <DialogContent sx={{ p: 3 }}>
              <StockMovementHistory showMaterialInfo={true} />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setStockHistoryDialogOpen(false)}>
                Close
              </Button>
            </DialogActions>
          </Dialog>

          {/* Stock Analytics Dialog */}
          <Dialog 
            open={analyticsDialogOpen} 
            onClose={() => setAnalyticsDialogOpen(false)}
            maxWidth="xl"
            fullWidth
            PaperProps={{ sx: { height: '90vh' } }}
          >
            <DialogTitle>
              Stock Analytics Dashboard
            </DialogTitle>
            <DialogContent sx={{ p: 3, overflow: 'auto' }}>
              <StockAnalyticsDashboard />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setAnalyticsDialogOpen(false)}>
                Close
              </Button>
            </DialogActions>
          </Dialog>

          {/* Reorder Suggestions Dialog */}
          <Dialog 
            open={reorderDialogOpen} 
            onClose={() => setReorderDialogOpen(false)}
            maxWidth="xl"
            fullWidth
            PaperProps={{ sx: { height: '90vh' } }}
          >
            <DialogTitle>
              Automated Reorder Suggestions
            </DialogTitle>
            <DialogContent sx={{ p: 3, overflow: 'auto' }}>
              <ReorderSuggestions />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setReorderDialogOpen(false)}>
                Close
              </Button>
            </DialogActions>
          </Dialog>

          {/* Material Reservation Dialog */}
          <MaterialReservationDialog
            open={reservationDialogOpen}
            onClose={() => setReservationDialogOpen(false)}
            onReservationCreated={() => {
              fetchCombinedData()
              setRefreshTrigger(prev => prev + 1)
            }}
          />
      </ResponsiveContainer>
    </ResponsiveLayout>
  )
}