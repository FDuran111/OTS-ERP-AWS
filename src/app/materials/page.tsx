'use client'

import { useState, useEffect } from 'react'
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
  Error,
  TrendingUp,
} from '@mui/icons-material'
import AddMaterialDialog from '@/components/materials/AddMaterialDialog'
import EditMaterialDialog from '@/components/materials/EditMaterialDialog'
import MaterialActionsMenu from '@/components/materials/MaterialActionsMenu'

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

const getStatusColor = (status: string) => {
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
  const [materials, setMaterials] = useState<Material[]>([])
  const [stats, setStats] = useState<Stats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/login')
      return
    }
    setUser(JSON.parse(storedUser))
    fetchMaterials()
    fetchStats()
  }, [router])

  const fetchMaterials = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/materials')
      if (!response.ok) {
        throw new Error('Failed to fetch materials')
      }
      const data = await response.json()
      setMaterials(data)
      setError(null)
    } catch (error) {
      console.error('Error fetching materials:', error)
      setError('Failed to load materials')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/materials/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
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
      case 'error': return Error
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
                          <IconComponent sx={{ color: stat.color }} />
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
              <TextField
                fullWidth
                placeholder="Search materials by name, ID, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </CardContent>
          </Card>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

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
                    .filter(material => 
                      material.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      material.category.toLowerCase().includes(searchTerm.toLowerCase())
                    )
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
                        <TableCell>{material.category}</TableCell>
                        <TableCell>
                          {material.inStock} {material.unit}
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
                            color={getStatusColor(material.status) as any}
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
                      <TableCell colSpan={10} align="center">
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
        </Container>
      </Box>
    </Box>
  )
}