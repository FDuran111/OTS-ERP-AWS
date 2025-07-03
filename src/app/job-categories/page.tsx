'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Stack,
  Tooltip,
  Avatar,
  LinearProgress,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Category as CategoryIcon,
  Business as BusinessIcon,
  Home as HomeIcon,
  Factory as FactoryIcon,
  Build as ServiceIcon,
  ElectricalServices as InstallIcon,
  Warning as EmergencyIcon,
  Schedule as MaintenanceIcon,
  Router as LowVoltageIcon,
  Power as UtilityIcon,
  Work as GeneralIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  Assessment as StatsIcon,
} from '@mui/icons-material'
import ResponsiveLayout from '@/components/layout/ResponsiveLayout'
import ResponsiveContainer from '@/components/layout/ResponsiveContainer'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`category-tabpanel-${index}`}
      aria-labelledby={`category-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

interface JobCategory {
  id: string
  categoryCode: string
  categoryName: string
  description?: string
  color: string
  icon: string
  active: boolean
  sortOrder: number
  stats?: {
    totalJobs: number
    completedJobs: number
    activeJobs: number
    totalRevenue: number
    avgJobValue: number
    totalProfit: number
    avgMargin: number
    completionRate: number
    profitMargin: number
  }
}

interface JobSubCategory {
  id: string
  categoryId: string
  categoryCode: string
  categoryName: string
  categoryColor: string
  subCategoryCode: string
  subCategoryName: string
  description?: string
  defaultLaborRate?: number
  estimatedHours?: number
  requiresCertification: boolean
  requiredSkillLevel?: string
}

interface JobTag {
  id: string
  tagName: string
  tagType: string
  description?: string
  color: string
  active: boolean
  usageCount: number
}

export default function JobCategoriesPage() {
  const [tabValue, setTabValue] = useState(0)
  const [categories, setCategories] = useState<JobCategory[]>([])
  const [subCategories, setSubCategories] = useState<JobSubCategory[]>([])
  const [tags, setTags] = useState<JobTag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Dialog states
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [subCategoryDialogOpen, setSubCategoryDialogOpen] = useState(false)
  const [tagDialogOpen, setTagDialogOpen] = useState(false)
  
  // Form states
  const [newCategory, setNewCategory] = useState({
    categoryCode: '',
    categoryName: '',
    description: '',
    color: '#1976d2',
    icon: 'work',
    sortOrder: ''
  })
  
  const [newSubCategory, setNewSubCategory] = useState({
    categoryId: '',
    subCategoryCode: '',
    subCategoryName: '',
    description: '',
    defaultLaborRate: '',
    estimatedHours: '',
    requiresCertification: false,
    requiredSkillLevel: '',
    sortOrder: ''
  })
  
  const [newTag, setNewTag] = useState({
    tagName: '',
    tagType: 'GENERAL',
    description: '',
    color: '#757575'
  })

  useEffect(() => {
    fetchCategories()
    fetchSubCategories()
    fetchTags()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/job-categories?includeStats=true', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      
      if (!response.ok) throw new Error('Failed to fetch categories')
      
      const data = await response.json()
      setCategories(data)
    } catch (error) {
      console.error('Error fetching categories:', error)
      setError('Failed to load job categories')
    } finally {
      setLoading(false)
    }
  }

  const fetchSubCategories = async () => {
    try {
      const response = await fetch('/api/job-subcategories', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      
      if (!response.ok) throw new Error('Failed to fetch sub-categories')
      
      const data = await response.json()
      setSubCategories(data)
    } catch (error) {
      console.error('Error fetching sub-categories:', error)
    }
  }

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/job-tags', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      
      if (!response.ok) throw new Error('Failed to fetch tags')
      
      const data = await response.json()
      setTags(data)
    } catch (error) {
      console.error('Error fetching tags:', error)
    }
  }

  const handleAddCategory = async () => {
    try {
      const response = await fetch('/api/job-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCategory,
          sortOrder: newCategory.sortOrder ? parseInt(newCategory.sortOrder) : 0
        })
      })

      if (!response.ok) throw new Error('Failed to add category')

      await fetchCategories()
      setCategoryDialogOpen(false)
      resetCategoryForm()
    } catch (error) {
      console.error('Error adding category:', error)
      setError('Failed to add category')
    }
  }

  const handleAddSubCategory = async () => {
    try {
      const response = await fetch('/api/job-subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newSubCategory,
          defaultLaborRate: newSubCategory.defaultLaborRate ? parseFloat(newSubCategory.defaultLaborRate) : undefined,
          estimatedHours: newSubCategory.estimatedHours ? parseFloat(newSubCategory.estimatedHours) : undefined,
          sortOrder: newSubCategory.sortOrder ? parseInt(newSubCategory.sortOrder) : 0
        })
      })

      if (!response.ok) throw new Error('Failed to add sub-category')

      await fetchSubCategories()
      setSubCategoryDialogOpen(false)
      resetSubCategoryForm()
    } catch (error) {
      console.error('Error adding sub-category:', error)
      setError('Failed to add sub-category')
    }
  }

  const handleAddTag = async () => {
    try {
      const response = await fetch('/api/job-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTag)
      })

      if (!response.ok) throw new Error('Failed to add tag')

      await fetchTags()
      setTagDialogOpen(false)
      resetTagForm()
    } catch (error) {
      console.error('Error adding tag:', error)
      setError('Failed to add tag')
    }
  }

  const resetCategoryForm = () => {
    setNewCategory({
      categoryCode: '',
      categoryName: '',
      description: '',
      color: '#1976d2',
      icon: 'work',
      sortOrder: ''
    })
  }

  const resetSubCategoryForm = () => {
    setNewSubCategory({
      categoryId: '',
      subCategoryCode: '',
      subCategoryName: '',
      description: '',
      defaultLaborRate: '',
      estimatedHours: '',
      requiresCertification: false,
      requiredSkillLevel: '',
      sortOrder: ''
    })
  }

  const resetTagForm = () => {
    setNewTag({
      tagName: '',
      tagType: 'GENERAL',
      description: '',
      color: '#757575'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'home': return <HomeIcon />
      case 'business': return <BusinessIcon />
      case 'factory': return <FactoryIcon />
      case 'build': return <ServiceIcon />
      case 'electrical_services': return <InstallIcon />
      case 'warning': return <EmergencyIcon />
      case 'schedule': return <MaintenanceIcon />
      case 'router': return <LowVoltageIcon />
      case 'power': return <UtilityIcon />
      default: return <GeneralIcon />
    }
  }

  const getTagTypeColor = (tagType: string) => {
    switch (tagType) {
      case 'PRIORITY': return 'error'
      case 'COMPLEXITY': return 'warning'
      case 'CERTIFICATION': return 'info'
      default: return 'default'
    }
  }

  // Calculate summary statistics
  const totalJobs = categories.reduce((sum, cat) => sum + (cat.stats?.totalJobs || 0), 0)
  const totalRevenue = categories.reduce((sum, cat) => sum + (cat.stats?.totalRevenue || 0), 0)
  const avgCompletionRate = categories.length > 0 ? 
    categories.reduce((sum, cat) => sum + (cat.stats?.completionRate || 0), 0) / categories.length : 0

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <ResponsiveLayout>
      <ResponsiveContainer
        title="🗂️ Job Categorization"
        breadcrumbs={[
          { label: 'Home', path: '/dashboard' },
          { label: 'Job Categories' }
        ]}
      >

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="caption">
                    Total Categories
                  </Typography>
                  <Typography variant="h5" color="primary.main">
                    {categories.length}
                  </Typography>
                </Box>
                <CategoryIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="caption">
                    Total Jobs
                  </Typography>
                  <Typography variant="h5" color="success.main">
                    {totalJobs}
                  </Typography>
                </Box>
                <StatsIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="caption">
                    Total Revenue
                  </Typography>
                  <Typography variant="h5" color="info.main">
                    {formatCurrency(totalRevenue)}
                  </Typography>
                </Box>
                <MoneyIcon sx={{ fontSize: 40, color: 'info.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="caption">
                    Avg Completion Rate
                  </Typography>
                  <Typography variant="h5" color="warning.main">
                    {avgCompletionRate.toFixed(1)}%
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Categories" />
          <Tab label="Sub-Categories" />
          <Tab label="Tags" />
        </Tabs>
      </Box>

      {/* Categories Tab */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Job Categories</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCategoryDialogOpen(true)}
          >
            Add Category
          </Button>
        </Box>

        <Grid container spacing={3}>
          {categories.map((category) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={category.id}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: category.color, mr: 2 }}>
                      {getCategoryIcon(category.icon)}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" sx={{ color: category.color }}>
                        {category.categoryName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {category.categoryCode}
                      </Typography>
                    </Box>
                    <IconButton size="small">
                      <EditIcon />
                    </IconButton>
                  </Box>

                  {category.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {category.description}
                    </Typography>
                  )}

                  {category.stats && (
                    <Stack spacing={1}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Total Jobs</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {category.stats.totalJobs}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Revenue</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(category.stats.totalRevenue)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Completion Rate</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {category.stats.completionRate.toFixed(1)}%
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={category.stats.completionRate} 
                        sx={{ mt: 1 }}
                      />
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Sub-Categories Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Job Sub-Categories</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setSubCategoryDialogOpen(true)}
          >
            Add Sub-Category
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Category</TableCell>
                <TableCell>Sub-Category</TableCell>
                <TableCell>Default Rate</TableCell>
                <TableCell>Est. Hours</TableCell>
                <TableCell>Skill Level</TableCell>
                <TableCell>Certification</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {subCategories.map((subCategory) => (
                <TableRow key={subCategory.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ bgcolor: subCategory.categoryColor, width: 24, height: 24 }}>
                        <Typography variant="caption">
                          {subCategory.categoryCode.charAt(0)}
                        </Typography>
                      </Avatar>
                      {subCategory.categoryName}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {subCategory.subCategoryName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {subCategory.subCategoryCode}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {subCategory.defaultLaborRate ? formatCurrency(subCategory.defaultLaborRate) : '-'}
                  </TableCell>
                  <TableCell>
                    {subCategory.estimatedHours ? `${subCategory.estimatedHours}h` : '-'}
                  </TableCell>
                  <TableCell>
                    {subCategory.requiredSkillLevel ? (
                      <Chip label={subCategory.requiredSkillLevel} size="small" />
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={subCategory.requiresCertification ? 'Required' : 'Not Required'}
                      size="small"
                      color={subCategory.requiresCertification ? 'warning' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small">
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Tags Tab */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Job Tags</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setTagDialogOpen(true)}
          >
            Add Tag
          </Button>
        </Box>

        <Grid container spacing={2}>
          {tags.map((tag) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={tag.id}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Chip
                      label={tag.tagName}
                      sx={{ bgcolor: tag.color, color: 'white' }}
                    />
                    <IconButton size="small">
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Stack spacing={1}>
                    <Chip
                      label={tag.tagType}
                      size="small"
                      color={getTagTypeColor(tag.tagType) as any}
                      variant="outlined"
                    />
                    <Typography variant="body2" color="text.secondary">
                      Used {tag.usageCount} times
                    </Typography>
                    {tag.description && (
                      <Typography variant="caption" color="text.secondary">
                        {tag.description}
                      </Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Add Category Dialog */}
      <Dialog open={categoryDialogOpen} onClose={() => setCategoryDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Job Category</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Category Code"
              value={newCategory.categoryCode}
              onChange={(e) => setNewCategory({ ...newCategory, categoryCode: e.target.value.toUpperCase() })}
              fullWidth
              required
              helperText="Unique code for the category (e.g., RESIDENTIAL)"
            />
            <TextField
              label="Category Name"
              value={newCategory.categoryName}
              onChange={(e) => setNewCategory({ ...newCategory, categoryName: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={newCategory.description}
              onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Color"
              type="color"
              value={newCategory.color}
              onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Icon</InputLabel>
              <Select
                value={newCategory.icon}
                onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
              >
                <MenuItem value="home">Home</MenuItem>
                <MenuItem value="business">Business</MenuItem>
                <MenuItem value="factory">Factory</MenuItem>
                <MenuItem value="build">Service</MenuItem>
                <MenuItem value="electrical_services">Installation</MenuItem>
                <MenuItem value="warning">Emergency</MenuItem>
                <MenuItem value="schedule">Maintenance</MenuItem>
                <MenuItem value="router">Low Voltage</MenuItem>
                <MenuItem value="power">Utility</MenuItem>
                <MenuItem value="work">General</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Sort Order"
              type="number"
              value={newCategory.sortOrder}
              onChange={(e) => setNewCategory({ ...newCategory, sortOrder: e.target.value })}
              fullWidth
              inputProps={{ min: 0 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddCategory} variant="contained">
            Add Category
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Sub-Category Dialog */}
      <Dialog open={subCategoryDialogOpen} onClose={() => setSubCategoryDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Job Sub-Category</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Category</InputLabel>
              <Select
                value={newSubCategory.categoryId}
                onChange={(e) => setNewSubCategory({ ...newSubCategory, categoryId: e.target.value })}
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.categoryName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Sub-Category Code"
              value={newSubCategory.subCategoryCode}
              onChange={(e) => setNewSubCategory({ ...newSubCategory, subCategoryCode: e.target.value.toUpperCase() })}
              fullWidth
              required
            />
            <TextField
              label="Sub-Category Name"
              value={newSubCategory.subCategoryName}
              onChange={(e) => setNewSubCategory({ ...newSubCategory, subCategoryName: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={newSubCategory.description}
              onChange={(e) => setNewSubCategory({ ...newSubCategory, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Default Labor Rate"
              type="number"
              value={newSubCategory.defaultLaborRate}
              onChange={(e) => setNewSubCategory({ ...newSubCategory, defaultLaborRate: e.target.value })}
              inputProps={{ min: 0, step: 0.01 }}
              fullWidth
            />
            <TextField
              label="Estimated Hours"
              type="number"
              value={newSubCategory.estimatedHours}
              onChange={(e) => setNewSubCategory({ ...newSubCategory, estimatedHours: e.target.value })}
              inputProps={{ min: 0, step: 0.1 }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubCategoryDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddSubCategory} variant="contained">
            Add Sub-Category
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Tag Dialog */}
      <Dialog open={tagDialogOpen} onClose={() => setTagDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Job Tag</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Tag Name"
              value={newTag.tagName}
              onChange={(e) => setNewTag({ ...newTag, tagName: e.target.value })}
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel>Tag Type</InputLabel>
              <Select
                value={newTag.tagType}
                onChange={(e) => setNewTag({ ...newTag, tagType: e.target.value })}
              >
                <MenuItem value="GENERAL">General</MenuItem>
                <MenuItem value="PRIORITY">Priority</MenuItem>
                <MenuItem value="COMPLEXITY">Complexity</MenuItem>
                <MenuItem value="CERTIFICATION">Certification</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Description"
              value={newTag.description}
              onChange={(e) => setNewTag({ ...newTag, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Color"
              type="color"
              value={newTag.color}
              onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTagDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddTag} variant="contained">
            Add Tag
          </Button>
        </DialogActions>
      </Dialog>
      </ResponsiveContainer>
    </ResponsiveLayout>
  )
}