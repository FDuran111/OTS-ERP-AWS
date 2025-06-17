'use client'

// Force dynamic rendering to prevent caching issues
export const dynamic = 'force-dynamic'
export const revalidate = 0

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  AppBar,
  Toolbar,
  Drawer,
  ListItemIcon,
  ListItemButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  List,
  ListItemText,
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
  Grid,
  FormControl,
  InputLabel,
  Select,
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
} from '@mui/icons-material'
import AddMaterialDialog from '@/components/materials/AddMaterialDialog'
import EditMaterialDialog from '@/components/materials/EditMaterialDialog'
import MaterialActionsMenu from '@/components/materials/MaterialActionsMenu'
import StorageLocationDialog from '@/components/materials/StorageLocationDialog'

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
      fetchMaterials()
      fetchStats()
    }
  }, [user])

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
    fetchMaterials()
    fetchStats()
  }

  const handleMaterialUpdated = () => {
    fetchMaterials()
    fetchStats()
  }

  const handleStockUpdated = () => {
    fetchMaterials()
    fetchStats()
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

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ px: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 300 }}>
          Ortmeier Tech
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ flexGrow: 1 }}>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.text}
            onClick={() => router.push(item.path)}
            selected={item.path === '/materials'}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(225, 78, 202, 0.08)',
              },
              '&.Mui-selected': {
                backgroundColor: 'rgba(225, 78, 202, 0.12)',
              },
            }}
          >
            <ListItemIcon>
              <item.icon sx={{ color: 'text.secondary' }} />
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItemButton>
        ))}
      </List>
      <Divider />
      <List>
        <ListItemButton onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon sx={{ color: 'text.secondary' }} />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Materials & Inventory
          </Typography>
          <IconButton onClick={handleMenuClick}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {user.name.charAt(0)}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem>
              <Typography variant="body2">{user.name}</Typography>
            </MenuItem>
            <MenuItem>
              <Typography variant="caption" color="text.secondary">
                {user.role}
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
        }}
      >
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Typography variant="h4">
              Materials & Inventory
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => {
                  fetchMaterials()
                  fetchStats()
                }}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<InventoryIcon />}
                onClick={() => setStorageLocationDialogOpen(true)}
              >
                Manage Locations
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddMaterial}
                sx={{
                  backgroundColor: '#e14eca',
                  '&:hover': {
                    backgroundColor: '#d236b8',
                  },
                }}
              >
                Add Material
              </Button>
            </Box>
          </Box>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            {stats.map((stat) => {
              const IconComponent = getStatsIconComponent(stat.icon)
              return (
                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.title}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 48,
                            height: 48,
                            borderRadius: '12px',
                            backgroundColor: `${stat.color}20`,
                            mr: 2,
                          }}
                        >
                          {React.createElement(IconComponent, { sx: { color: stat.color } })}
                        </Box>
                        <Box>
                          <Typography color="text.secondary" variant="caption">
                            {stat.title}
                          </Typography>
                          <Typography variant="h5">{stat.value}</Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>

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

          {/* Low Stock Summary */}
          {materials.length > 0 && (
            <Alert 
              severity={materials.filter(m => m.inStock <= m.minStock).length > 0 ? "warning" : "success"} 
              sx={{ mb: 3 }}
              icon={<Warning />}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2">
                  {materials.filter(m => m.inStock <= m.minStock).length > 0 
                    ? `${materials.filter(m => m.inStock <= m.minStock).length} item(s) need restocking`
                    : "All items are adequately stocked"
                  }
                </Typography>
                {materials.filter(m => m.inStock <= m.minStock).length > 0 && !showOnlyLowStock && (
                  <Button 
                    size="small" 
                    variant="contained" 
                    color="warning"
                    onClick={() => setShowOnlyLowStock(true)}
                  >
                    View Low Stock Items
                  </Button>
                )}
              </Box>
            </Alert>
          )}

          {/* Stock Status Legend */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Stock Status Legend
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1" sx={{ fontSize: '1.2rem' }}>🚨</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Critical - Out of stock or &lt;5% of target
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1" sx={{ fontSize: '1.2rem' }}>⚠️</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Low Stock - At or below minimum level
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1" sx={{ fontSize: '1.2rem' }}>📦</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Adequate - Above minimum, normal stock
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1" sx={{ fontSize: '1.2rem' }}>✅</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Well Stocked - 50% or more above minimum
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Code</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Brand</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Stock</TableCell>
                    <TableCell>Min Stock</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Cost</TableCell>
                    <TableCell>Price</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
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
                    .map((material) => (
                      <TableRow key={material.id} hover>
                        <TableCell>{material.code}</TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">{material.name}</Typography>
                            {material.description && (
                              <Typography variant="caption" color="text.secondary">
                                {material.description}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={material.manufacturer ? "medium" : "normal"}>
                            {material.manufacturer || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>{material.category}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body1" sx={{ fontSize: '1.2rem' }}>
                              {(() => {
                                const stockPercentage = material.minStock > 0 ? (material.inStock / material.minStock) * 100 : 0
                                if (material.inStock === 0 || stockPercentage < 5) return '🚨'
                                if (material.inStock <= material.minStock) return '⚠️'
                                if (stockPercentage >= 150) return '✅'
                                return '📦'
                              })()}
                            </Typography>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                Total: {material.inStock} {material.unit}
                              </Typography>
                              {material.stockLocations && material.stockLocations.length > 0 && (
                                <Box sx={{ mt: 0.5 }}>
                                  {material.stockLocations
                                    .filter(stock => stock.quantity > 0)
                                    .map((stock, index) => (
                                    <Typography 
                                      key={stock.id} 
                                      variant="caption" 
                                      color="text.secondary"
                                      sx={{ display: 'block', fontSize: '0.7rem' }}
                                    >
                                      {stock.location.code}: {stock.quantity} {material.unit}
                                    </Typography>
                                  ))}
                                  {material.stockLocations.filter(stock => stock.quantity > 0).length === 0 && (
                                    <Typography variant="caption" color="error" sx={{ fontSize: '0.7rem' }}>
                                      No stock at any location
                                    </Typography>
                                  )}
                                </Box>
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {material.minStock} {material.unit}
                        </TableCell>
                        <TableCell>{material.location || '-'}</TableCell>
                        <TableCell>${material.cost.toFixed(2)}</TableCell>
                        <TableCell>${material.price.toFixed(2)}</TableCell>
                        <TableCell>
                          <Chip
                            label={material.status}
                            color={getStatusColor(material.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <MaterialActionsMenu
                            material={material}
                            onEdit={handleEditMaterial}
                            onDelete={handleDeleteMaterial}
                            onStockUpdated={handleStockUpdated}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  {materials.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={11} align="center">
                        <Typography color="text.secondary">No materials found</Typography>
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
        </Container>
      </Box>
    </Box>
  )
}