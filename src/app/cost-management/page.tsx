'use client'

import { useState, useEffect } from 'react'
import ResponsiveLayout from '@/components/layout/ResponsiveLayout'
import ResponsiveContainer from '@/components/layout/ResponsiveContainer'
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Calculate as CalculateIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  DirectionsCar as VehicleIcon,
  Build as ToolIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material'

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
      id={`cost-tabpanel-${index}`}
      aria-labelledby={`cost-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

interface EmployeeCost {
  userId: string
  name: string
  email: string
  role: string
  baseHourlyRate: number
  baseAnnualSalary: number
  totalOverheadCost: number
  totalOverheadHourly: number
  totalAssetCost: number
  totalAssetHourly: number
  totalHourlyCost: number
  totalAnnualCost: number
  overheadBreakdown?: OverheadCost[]
  assetBreakdown?: AssetAssignment[]
}

interface OverheadCost {
  id?: string
  userId: string
  overheadType: string
  overheadCategory: string
  annualCost: number
  hourlyCost: number
  description?: string
}

interface CompanyAsset {
  id: string
  assetNumber: string
  assetType: string
  category: string
  name: string
  description?: string
  make?: string
  model?: string
  year?: number
  purchasePrice?: number
  currentValue?: number
  totalAnnualCost: number
  status: string
  assignedUserId?: string
  assignedUserName?: string
  assignedDate?: string
}

interface AssetAssignment {
  assetNumber: string
  assetName: string
  assetType: string
  annualCost: number
  hourlyCost: number
  assignedDate: string
  purpose?: string
}

export default function CostManagementPage() {
  const [tabValue, setTabValue] = useState(0)
  const [employeeCosts, setEmployeeCosts] = useState<EmployeeCost[]>([])
  const [companyAssets, setCompanyAssets] = useState<CompanyAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Dialog states
  const [overheadDialogOpen, setOverheadDialogOpen] = useState(false)
  const [assetDialogOpen, setAssetDialogOpen] = useState(false)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  
  // Form states
  const [newOverhead, setNewOverhead] = useState({
    userId: '',
    overheadType: '',
    overheadCategory: '',
    annualCost: '',
    description: ''
  })
  
  const [newAsset, setNewAsset] = useState({
    assetNumber: '',
    assetType: '',
    category: '',
    name: '',
    description: '',
    make: '',
    model: '',
    year: '',
    purchasePrice: '',
    currentValue: '',
    usefulLife: '5',
    maintenanceCost: '',
    insuranceCost: ''
  })

  useEffect(() => {
    fetchEmployeeCosts()
    fetchCompanyAssets()
  }, [])

  const fetchEmployeeCosts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/employee-costs', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      
      if (!response.ok) throw new Error('Failed to fetch employee costs')
      
      const data = await response.json()
      setEmployeeCosts(data)
    } catch (error) {
      console.error('Error fetching employee costs:', error)
      setError('Failed to load employee cost data')
    } finally {
      setLoading(false)
    }
  }

  const fetchCompanyAssets = async () => {
    try {
      const response = await fetch('/api/company-assets', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      
      if (!response.ok) throw new Error('Failed to fetch company assets')
      
      const data = await response.json()
      setCompanyAssets(data)
    } catch (error) {
      console.error('Error fetching company assets:', error)
    }
  }

  const handleAddOverhead = async () => {
    try {
      const response = await fetch('/api/employee-overhead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newOverhead,
          annualCost: parseFloat(newOverhead.annualCost) || 0
        })
      })

      if (!response.ok) throw new Error('Failed to add overhead cost')

      await fetchEmployeeCosts()
      setOverheadDialogOpen(false)
      setNewOverhead({
        userId: '',
        overheadType: '',
        overheadCategory: '',
        annualCost: '',
        description: ''
      })
    } catch (error) {
      console.error('Error adding overhead cost:', error)
      setError('Failed to add overhead cost')
    }
  }

  const handleAddAsset = async () => {
    try {
      const response = await fetch('/api/company-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newAsset,
          year: newAsset.year ? parseInt(newAsset.year) : undefined,
          purchasePrice: newAsset.purchasePrice ? parseFloat(newAsset.purchasePrice) : undefined,
          currentValue: newAsset.currentValue ? parseFloat(newAsset.currentValue) : undefined,
          usefulLife: parseInt(newAsset.usefulLife) || 5,
          maintenanceCost: parseFloat(newAsset.maintenanceCost) || 0,
          insuranceCost: parseFloat(newAsset.insuranceCost) || 0
        })
      })

      if (!response.ok) throw new Error('Failed to add company asset')

      await fetchCompanyAssets()
      setAssetDialogOpen(false)
      setNewAsset({
        assetNumber: '',
        assetType: '',
        category: '',
        name: '',
        description: '',
        make: '',
        model: '',
        year: '',
        purchasePrice: '',
        currentValue: '',
        usefulLife: '5',
        maintenanceCost: '',
        insuranceCost: ''
      })
    } catch (error) {
      console.error('Error adding company asset:', error)
      setError('Failed to add company asset')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getAssetIcon = (assetType: string) => {
    switch (assetType) {
      case 'VEHICLE':
      case 'TRUCK':
      case 'BUCKET_TRUCK':
        return <VehicleIcon />
      case 'TOOLS':
        return <ToolIcon />
      case 'PHONE':
      case 'LAPTOP':
        return <PhoneIcon />
      default:
        return <BusinessIcon />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'OWNER_ADMIN': return 'error'
      case 'EMPLOYEE': return 'primary'
      case 'FOREMAN': return 'secondary'
      default: return 'default'
    }
  }

  if (loading) {
    return (
      <ResponsiveLayout>
        <ResponsiveContainer>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        </ResponsiveContainer>
      </ResponsiveLayout>
    )
  }

  return (
    <ResponsiveLayout>
      <ResponsiveContainer>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          💰 Cost Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage employee overhead costs, company assets, and calculate true cost per employee
        </Typography>
      </Box>

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
                    Total Employees
                  </Typography>
                  <Typography variant="h5" color="primary.main">
                    {employeeCosts.length}
                  </Typography>
                </Box>
                <PersonIcon sx={{ fontSize: 40, color: 'primary.main' }} />
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
                    Avg. True Cost/Hour
                  </Typography>
                  <Typography variant="h5" color="warning.main">
                    {formatCurrency(
                      employeeCosts.reduce((sum, emp) => sum + emp.totalHourlyCost, 0) / 
                      (employeeCosts.length || 1)
                    )}
                  </Typography>
                </Box>
                <CalculateIcon sx={{ fontSize: 40, color: 'warning.main' }} />
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
                    Total Annual Labor Cost
                  </Typography>
                  <Typography variant="h5" color="error.main">
                    {formatCurrency(
                      employeeCosts.reduce((sum, emp) => sum + emp.totalAnnualCost, 0)
                    )}
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 40, color: 'error.main' }} />
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
                    Company Assets
                  </Typography>
                  <Typography variant="h5" color="success.main">
                    {companyAssets.length}
                  </Typography>
                </Box>
                <BusinessIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Employee Costs" />
          <Tab label="Company Assets" />
          <Tab label="Overhead Management" />
        </Tabs>
      </Box>

      {/* Employee Costs Tab */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Employee Cost Analysis</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOverheadDialogOpen(true)}
          >
            Add Overhead Cost
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Role</TableCell>
                <TableCell align="right">Base Rate</TableCell>
                <TableCell align="right">Overhead/Hr</TableCell>
                <TableCell align="right">Assets/Hr</TableCell>
                <TableCell align="right">True Cost/Hr</TableCell>
                <TableCell align="right">Annual Cost</TableCell>
                <TableCell align="center">Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employeeCosts.map((employee) => (
                <TableRow key={employee.userId}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {employee.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {employee.email}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={employee.role}
                      size="small"
                      color={getRoleColor(employee.role) as any}
                    />
                  </TableCell>
                  <TableCell align="right">{formatCurrency(employee.baseHourlyRate)}</TableCell>
                  <TableCell align="right">{formatCurrency(employee.totalOverheadHourly)}</TableCell>
                  <TableCell align="right">{formatCurrency(employee.totalAssetHourly)}</TableCell>
                  <TableCell align="right">
                    <Typography fontWeight="bold" color="primary">
                      {formatCurrency(employee.totalHourlyCost)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontWeight="bold">
                      {formatCurrency(employee.totalAnnualCost)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => setSelectedEmployeeId(
                          selectedEmployeeId === employee.userId ? '' : employee.userId
                        )}
                      >
                        <ExpandMoreIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Company Assets Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Company Assets</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAssetDialogOpen(true)}
          >
            Add Asset
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Asset #</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Make/Model</TableCell>
                <TableCell align="right">Annual Cost</TableCell>
                <TableCell>Assigned To</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {companyAssets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getAssetIcon(asset.assetType)}
                      {asset.assetNumber}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {asset.name}
                      </Typography>
                      {asset.description && (
                        <Typography variant="caption" color="text.secondary">
                          {asset.description}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={asset.assetType} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    {asset.make && asset.model ? `${asset.make} ${asset.model}` : '-'}
                    {asset.year && ` (${asset.year})`}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(asset.totalAnnualCost)}
                  </TableCell>
                  <TableCell>
                    {asset.assignedUserName ? (
                      <Chip
                        label={asset.assignedUserName}
                        size="small"
                        color="primary"
                      />
                    ) : (
                      <Typography color="text.secondary">Unassigned</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={asset.status}
                      size="small"
                      color={asset.status === 'ACTIVE' ? 'success' : 'default'}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Overhead Management Tab */}
      <TabPanel value={tabValue} index={2}>
        <Typography variant="h6" gutterBottom>
          Overhead Cost Categories
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Manage overhead costs by employee including benefits, taxes, training, and other operational costs.
        </Typography>
        {/* Overhead management content would go here */}
      </TabPanel>

      {/* Add Overhead Dialog */}
      <Dialog open={overheadDialogOpen} onClose={() => setOverheadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Employee Overhead Cost</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Employee</InputLabel>
              <Select
                value={newOverhead.userId}
                onChange={(e) => setNewOverhead({ ...newOverhead, userId: e.target.value })}
              >
                {employeeCosts.map((emp) => (
                  <MenuItem key={emp.userId} value={emp.userId}>
                    {emp.name} ({emp.role})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Overhead Type</InputLabel>
              <Select
                value={newOverhead.overheadType}
                onChange={(e) => setNewOverhead({ ...newOverhead, overheadType: e.target.value })}
              >
                <MenuItem value="BENEFITS">Benefits</MenuItem>
                <MenuItem value="PAYROLL_TAXES">Payroll Taxes</MenuItem>
                <MenuItem value="WORKERS_COMP">Workers Compensation</MenuItem>
                <MenuItem value="TRAINING">Training</MenuItem>
                <MenuItem value="UNIFORM">Uniform</MenuItem>
                <MenuItem value="TOOLS">Tools</MenuItem>
                <MenuItem value="OTHER">Other</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={newOverhead.overheadCategory}
                onChange={(e) => setNewOverhead({ ...newOverhead, overheadCategory: e.target.value })}
              >
                <MenuItem value="HEALTHCARE">Healthcare</MenuItem>
                <MenuItem value="TAXES">Taxes</MenuItem>
                <MenuItem value="INSURANCE">Insurance</MenuItem>
                <MenuItem value="EDUCATION">Education</MenuItem>
                <MenuItem value="EQUIPMENT">Equipment</MenuItem>
                <MenuItem value="SERVICES">Services</MenuItem>
                <MenuItem value="OTHER">Other</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Annual Cost"
              type="number"
              value={newOverhead.annualCost}
              onChange={(e) => setNewOverhead({ ...newOverhead, annualCost: e.target.value })}
              inputProps={{ min: 0, step: 0.01 }}
              fullWidth
            />

            <TextField
              label="Description"
              value={newOverhead.description}
              onChange={(e) => setNewOverhead({ ...newOverhead, description: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOverheadDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddOverhead} variant="contained">
            Add Overhead Cost
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Asset Dialog */}
      <Dialog open={assetDialogOpen} onClose={() => setAssetDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add Company Asset</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Asset Number"
                value={newAsset.assetNumber}
                onChange={(e) => setNewAsset({ ...newAsset, assetNumber: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Asset Type</InputLabel>
                <Select
                  value={newAsset.assetType}
                  onChange={(e) => setNewAsset({ ...newAsset, assetType: e.target.value })}
                >
                  <MenuItem value="VEHICLE">Vehicle</MenuItem>
                  <MenuItem value="TRUCK">Truck</MenuItem>
                  <MenuItem value="BUCKET_TRUCK">Bucket Truck</MenuItem>
                  <MenuItem value="CRANE">Crane</MenuItem>
                  <MenuItem value="GENERATOR">Generator</MenuItem>
                  <MenuItem value="TOOLS">Tools</MenuItem>
                  <MenuItem value="PHONE">Phone</MenuItem>
                  <MenuItem value="LAPTOP">Laptop</MenuItem>
                  <MenuItem value="OTHER">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  value={newAsset.category}
                  onChange={(e) => setNewAsset({ ...newAsset, category: e.target.value })}
                >
                  <MenuItem value="FIELD_EQUIPMENT">Field Equipment</MenuItem>
                  <MenuItem value="OFFICE_EQUIPMENT">Office Equipment</MenuItem>
                  <MenuItem value="VEHICLE">Vehicle</MenuItem>
                  <MenuItem value="TOOLS">Tools</MenuItem>
                  <MenuItem value="TECHNOLOGY">Technology</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Asset Name"
                value={newAsset.name}
                onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Description"
                value={newAsset.description}
                onChange={(e) => setNewAsset({ ...newAsset, description: e.target.value })}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Make"
                value={newAsset.make}
                onChange={(e) => setNewAsset({ ...newAsset, make: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Model"
                value={newAsset.model}
                onChange={(e) => setNewAsset({ ...newAsset, model: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Year"
                type="number"
                value={newAsset.year}
                onChange={(e) => setNewAsset({ ...newAsset, year: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Purchase Price"
                type="number"
                value={newAsset.purchasePrice}
                onChange={(e) => setNewAsset({ ...newAsset, purchasePrice: e.target.value })}
                inputProps={{ min: 0, step: 0.01 }}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Current Value"
                type="number"
                value={newAsset.currentValue}
                onChange={(e) => setNewAsset({ ...newAsset, currentValue: e.target.value })}
                inputProps={{ min: 0, step: 0.01 }}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Useful Life (years)"
                type="number"
                value={newAsset.usefulLife}
                onChange={(e) => setNewAsset({ ...newAsset, usefulLife: e.target.value })}
                inputProps={{ min: 1, max: 30 }}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Annual Maintenance Cost"
                type="number"
                value={newAsset.maintenanceCost}
                onChange={(e) => setNewAsset({ ...newAsset, maintenanceCost: e.target.value })}
                inputProps={{ min: 0, step: 0.01 }}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Annual Insurance Cost"
                type="number"
                value={newAsset.insuranceCost}
                onChange={(e) => setNewAsset({ ...newAsset, insuranceCost: e.target.value })}
                inputProps={{ min: 0, step: 0.01 }}
                fullWidth
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssetDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddAsset} variant="contained">
            Add Asset
          </Button>
        </DialogActions>
      </Dialog>
      </ResponsiveContainer>
    </ResponsiveLayout>
  )
}