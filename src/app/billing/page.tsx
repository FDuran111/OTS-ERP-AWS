'use client'

// Force dynamic rendering to prevent caching issues
export const dynamic = 'force-dynamic'

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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
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
  Edit as EditIcon,
  Delete as DeleteIcon,
  AttachMoney as MoneyIcon,
  TrendingUp,
  Clear as ClearIcon,
} from '@mui/icons-material'
import LaborRateDialog from '@/components/billing/LaborRateDialog'
import LaborRateCard from '@/components/billing/LaborRateCard'

const drawerWidth = 240

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface LaborRate {
  id: string
  name: string
  description?: string
  hourlyRate: number
  skillLevel: string
  category: string
  effectiveDate: string
  expiryDate?: string
  active: boolean
  createdAt: string
  updatedAt: string
}

const menuItems = [
  { text: 'Dashboard', icon: DashboardIcon, path: '/dashboard' },
  { text: 'Jobs', icon: WorkIcon, path: '/jobs' },
  { text: 'Schedule', icon: ScheduleIcon, path: '/schedule' },
  { text: 'Time Tracking', icon: TimeIcon, path: '/time' },
  { text: 'Customers', icon: PeopleIcon, path: '/customers' },
  { text: 'Leads', icon: TrendingUp, path: '/leads' },
  { text: 'Materials', icon: InventoryIcon, path: '/materials' },
  { text: 'Billing & Rates', icon: MoneyIcon, path: '/billing' },
  { text: 'Invoicing', icon: ReceiptIcon, path: '/invoicing' },
  { text: 'Reports', icon: AssessmentIcon, path: '/reports' },
  { text: 'Settings', icon: SettingsIcon, path: '/settings' },
]

const skillLevelOrder = ['APPRENTICE', 'HELPER', 'TECH_L1', 'TECH_L2', 'JOURNEYMAN', 'FOREMAN', 'LOW_VOLTAGE', 'CABLING', 'INSTALL']

const getSkillLevelColor = (skillLevel: string) => {
  switch (skillLevel) {
    case 'APPRENTICE': return 'info'
    case 'HELPER': return 'info'
    case 'TECH_L1': return 'primary'
    case 'TECH_L2': return 'primary'
    case 'JOURNEYMAN': return 'success'
    case 'FOREMAN': return 'warning'
    case 'LOW_VOLTAGE': return 'secondary'
    case 'CABLING': return 'secondary'
    case 'INSTALL': return 'error'
    default: return 'default'
  }
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'ELECTRICAL': return 'primary'
    case 'LOW_VOLTAGE': return 'secondary'
    case 'SERVICE': return 'warning'
    case 'INSTALL': return 'error'
    case 'SPECIALTY': return 'info'
    default: return 'default'
  }
}

export default function BillingPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [skillLevelFilter, setSkillLevelFilter] = useState('')
  const [laborRates, setLaborRates] = useState<LaborRate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedRate, setSelectedRate] = useState<LaborRate | null>(null)
  const [tabValue, setTabValue] = useState(0)
  const [showInactive, setShowInactive] = useState(false)

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
      fetchLaborRates()
    }
  }, [user, showInactive])

  const fetchLaborRates = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/labor-rates?active=${!showInactive}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch labor rates: ${response.status}`)
      }
      
      const data = await response.json()
      setLaborRates(data)
    } catch (error) {
      console.error('Error fetching labor rates:', error)
      setError('Failed to load labor rates')
    } finally {
      setLoading(false)
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

  const handleAddRate = () => {
    setSelectedRate(null)
    setDialogOpen(true)
  }

  const handleEditRate = (rate: LaborRate) => {
    setSelectedRate(rate)
    setDialogOpen(true)
  }

  const handleDeleteRate = async (rate: LaborRate) => {
    if (!window.confirm(`Are you sure you want to delete "${rate.name}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/labor-rates/${rate.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete labor rate')
      }

      await fetchLaborRates()
    } catch (error) {
      console.error('Error deleting labor rate:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete labor rate')
    }
  }

  const handleRateCreated = () => {
    fetchLaborRates()
  }

  const handleRateUpdated = () => {
    fetchLaborRates()
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
            selected={item.path === '/billing'}
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

  const filteredRates = laborRates.filter(rate => {
    const matchesSearch = !searchTerm || 
      rate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rate.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rate.skillLevel.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = !categoryFilter || rate.category === categoryFilter
    const matchesSkillLevel = !skillLevelFilter || rate.skillLevel === skillLevelFilter
    
    return matchesSearch && matchesCategory && matchesSkillLevel
  })

  const groupedRates = filteredRates.reduce((acc, rate) => {
    const key = rate.category
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(rate)
    return acc
  }, {} as Record<string, LaborRate[]>)

  // Sort rates within each category by skill level order
  Object.keys(groupedRates).forEach(category => {
    groupedRates[category].sort((a, b) => {
      const aIndex = skillLevelOrder.indexOf(a.skillLevel)
      const bIndex = skillLevelOrder.indexOf(b.skillLevel)
      if (aIndex !== bIndex) {
        return aIndex - bIndex
      }
      return b.hourlyRate - a.hourlyRate
    })
  })

  const availableCategories = [...new Set(laborRates.map(rate => rate.category))]
  const availableSkillLevels = [...new Set(laborRates.map(rate => rate.skillLevel))]

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
            Billing & Rate Management
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
              💰 Billing & Rate Management
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => fetchLaborRates()}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddRate}
                sx={{
                  backgroundColor: '#e14eca',
                  '&:hover': {
                    backgroundColor: '#d236b8',
                  },
                }}
              >
                Add Labor Rate
              </Button>
            </Box>
          </Box>

          {/* Summary Stats */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
                        backgroundColor: '#3498db20',
                        mr: 2,
                      }}
                    >
                      <MoneyIcon sx={{ color: '#3498db' }} />
                    </Box>
                    <Box>
                      <Typography color="text.secondary" variant="caption">
                        Total Rates
                      </Typography>
                      <Typography variant="h5">{laborRates.filter(r => r.active).length}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
                        backgroundColor: '#2ecc7120',
                        mr: 2,
                      }}
                    >
                      <TrendingUp sx={{ color: '#2ecc71' }} />
                    </Box>
                    <Box>
                      <Typography color="text.secondary" variant="caption">
                        Avg Rate
                      </Typography>
                      <Typography variant="h5">
                        ${laborRates.filter(r => r.active).length > 0 
                          ? (laborRates.filter(r => r.active).reduce((sum, r) => sum + r.hourlyRate, 0) / laborRates.filter(r => r.active).length).toFixed(0)
                          : '0'
                        }
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
                        backgroundColor: '#f1c40f20',
                        mr: 2,
                      }}
                    >
                      <WorkIcon sx={{ color: '#f1c40f' }} />
                    </Box>
                    <Box>
                      <Typography color="text.secondary" variant="caption">
                        Categories
                      </Typography>
                      <Typography variant="h5">{availableCategories.length}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
                        backgroundColor: '#9b59b620',
                        mr: 2,
                      }}
                    >
                      <PeopleIcon sx={{ color: '#9b59b6' }} />
                    </Box>
                    <Box>
                      <Typography color="text.secondary" variant="caption">
                        Skill Levels
                      </Typography>
                      <Typography variant="h5">{availableSkillLevels.length}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Search & Filters */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🔍 Search & Filters
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
                <TextField
                  placeholder="Search rates by name, description, or skill level..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ flexGrow: 1, minWidth: 300 }}
                />
                
                <FormControl sx={{ minWidth: 150 }}>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    label="Category"
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

                <FormControl sx={{ minWidth: 150 }}>
                  <InputLabel>Skill Level</InputLabel>
                  <Select
                    value={skillLevelFilter}
                    onChange={(e) => setSkillLevelFilter(e.target.value)}
                    label="Skill Level"
                    size="small"
                  >
                    <MenuItem value="">All Levels</MenuItem>
                    {availableSkillLevels.map((level) => (
                      <MenuItem key={level} value={level}>
                        {level}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  variant={showInactive ? "contained" : "outlined"}
                  onClick={() => setShowInactive(!showInactive)}
                  size="small"
                >
                  {showInactive ? "Show Active" : "Show All"}
                </Button>

                {(searchTerm || categoryFilter || skillLevelFilter) && (
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setSearchTerm('')
                      setCategoryFilter('')
                      setSkillLevelFilter('')
                    }}
                    startIcon={<ClearIcon />}
                    size="small"
                  >
                    Clear
                  </Button>
                )}
              </Box>
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
            <Box>
              {Object.keys(groupedRates).length === 0 ? (
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 6 }}>
                    <MoneyIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No labor rates found
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={3}>
                      {laborRates.length === 0 
                        ? "Get started by adding your first labor rate"
                        : "Try adjusting your search criteria"
                      }
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={handleAddRate}
                      sx={{
                        backgroundColor: '#e14eca',
                        '&:hover': {
                          backgroundColor: '#d236b8',
                        },
                      }}
                    >
                      Add Labor Rate
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                Object.keys(groupedRates).map((category) => (
                  <Box key={category} sx={{ mb: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Chip
                        label={category}
                        color={getCategoryColor(category) as any}
                        sx={{ mr: 2, fontWeight: 'bold' }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {groupedRates[category].length} rate{groupedRates[category].length !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                    
                    <Grid container spacing={3}>
                      {groupedRates[category].map((rate) => (
                        <Grid key={rate.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                          <LaborRateCard
                            rate={rate}
                            onEdit={handleEditRate}
                            onDelete={handleDeleteRate}
                            skillLevelColor={getSkillLevelColor(rate.skillLevel)}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                ))
              )}
            </Box>
          )}

          <LaborRateDialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            rate={selectedRate}
            onRateCreated={handleRateCreated}
            onRateUpdated={handleRateUpdated}
          />
        </Container>
      </Box>
    </Box>
  )
}