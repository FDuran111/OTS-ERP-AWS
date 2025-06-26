'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  CircularProgress,
  Divider,
  Stack,
  Tooltip,
} from '@mui/material'
import {
  MoreVert as MoreVertIcon,
  ExpandMore as ExpandMoreIcon,
  TrendingUp as ProfitIcon,
  TrendingDown as LossIcon,
  AttachMoney as MoneyIcon,
  Build as EquipmentIcon,
  Inventory as MaterialIcon,
  Person as LaborIcon,
  Calculate as CalculateIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material'
import { format } from 'date-fns'

interface JobCosts {
  id: string
  jobId: string
  totalLaborHours: number
  totalLaborCost: number
  averageLaborRate: number
  totalMaterialCost: number
  materialMarkup: number
  materialMarkupAmount: number
  totalEquipmentCost: number
  equipmentHours: number
  overheadPercentage: number
  overheadAmount: number
  miscCosts: number
  miscCostDescription?: string
  totalDirectCosts: number
  totalIndirectCosts: number
  totalJobCost: number
  billedAmount: number
  grossProfit: number
  grossMargin: number
  lastCalculated: string
}

interface JobDetails {
  id: string
  jobNumber: string
  title: string
  description?: string
  status: string
  customerName: string
  billedAmount: number
  estimatedValue: number
}

interface LaborCost {
  id: string
  userId: string
  userName: string
  skillLevel: string
  rateName?: string
  hourlyRate: number
  hoursWorked: number
  totalCost: number
  workDate: string
  createdAt: string
}

interface MaterialCost {
  id: string
  materialId: string
  materialCode: string
  materialName: string
  materialUnit: string
  quantityUsed: number
  unitCost: number
  totalCost: number
  markup: number
  markupAmount: number
  billedAmount: number
  usageDate: string
  createdAt: string
}

interface EquipmentCost {
  id: string
  equipmentName: string
  equipmentType: string
  operatorName?: string
  hourlyRate: number
  hoursUsed: number
  totalCost: number
  usageDate: string
  notes?: string
  createdAt: string
}

interface JobProfitLossViewProps {
  jobId: string
}

export default function JobProfitLossView({ jobId }: JobProfitLossViewProps) {
  const [job, setJob] = useState<JobDetails | null>(null)
  const [costs, setCosts] = useState<JobCosts | null>(null)
  const [laborCosts, setLaborCosts] = useState<LaborCost[]>([])
  const [materialCosts, setMaterialCosts] = useState<MaterialCost[]>([])
  const [equipmentCosts, setEquipmentCosts] = useState<EquipmentCost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [recalculating, setRecalculating] = useState(false)

  // Settings form
  const [overheadPercentage, setOverheadPercentage] = useState('')
  const [miscCosts, setMiscCosts] = useState('')
  const [miscCostDescription, setMiscCostDescription] = useState('')
  const [materialMarkup, setMaterialMarkup] = useState('')

  useEffect(() => {
    fetchJobCosts()
  }, [jobId])

  useEffect(() => {
    if (costs) {
      setOverheadPercentage(costs.overheadPercentage.toString())
      setMiscCosts(costs.miscCosts.toString())
      setMiscCostDescription(costs.miscCostDescription || '')
      setMaterialMarkup(costs.materialMarkup.toString())
    }
  }, [costs])

  const fetchJobCosts = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/jobs/${jobId}/costs`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch job costs')
      }

      const data = await response.json()
      setJob(data.job)
      setCosts(data.costs)
      setLaborCosts(data.laborCosts)
      setMaterialCosts(data.materialCosts)
      setEquipmentCosts(data.equipmentCosts)
    } catch (error) {
      console.error('Error fetching job costs:', error)
      setError('Failed to load job cost data')
    } finally {
      setLoading(false)
    }
  }

  const handleRecalculate = async () => {
    try {
      setRecalculating(true)
      const response = await fetch(`/api/jobs/${jobId}/costs`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to recalculate costs')
      }

      await fetchJobCosts()
    } catch (error) {
      console.error('Error recalculating costs:', error)
      setError('Failed to recalculate costs')
    } finally {
      setRecalculating(false)
    }
  }

  const handleUpdateSettings = async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/costs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overheadPercentage: parseFloat(overheadPercentage) || 0,
          miscCosts: parseFloat(miscCosts) || 0,
          miscCostDescription,
          materialMarkup: parseFloat(materialMarkup) || 0
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update settings')
      }

      await fetchJobCosts()
      setSettingsOpen(false)
    } catch (error) {
      console.error('Error updating settings:', error)
      setError('Failed to update cost settings')
    }
  }

  const getProfitColor = (margin: number) => {
    if (margin >= 20) return 'success'
    if (margin >= 10) return 'warning'
    if (margin >= 0) return 'info'
    return 'error'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    )
  }

  if (!job || !costs) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No cost data available for this job
      </Alert>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            📊 Job P&L Analysis
          </Typography>
          <Typography variant="h6" color="text.secondary">
            {job.jobNumber} - {job.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Customer: {job.customerName} | Status: {job.status}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRecalculate}
            disabled={recalculating}
          >
            {recalculating ? 'Recalculating...' : 'Recalculate'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<CalculateIcon />}
            onClick={() => setSettingsOpen(true)}
          >
            Settings
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="caption">
                    Total Revenue
                  </Typography>
                  <Typography variant="h5" color="primary.main">
                    {formatCurrency(costs.billedAmount)}
                  </Typography>
                </Box>
                <MoneyIcon sx={{ fontSize: 40, color: 'primary.main' }} />
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
                    Total Costs
                  </Typography>
                  <Typography variant="h5" color="error.main">
                    {formatCurrency(costs.totalJobCost)}
                  </Typography>
                </Box>
                <CalculateIcon sx={{ fontSize: 40, color: 'error.main' }} />
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
                    Gross Profit
                  </Typography>
                  <Typography 
                    variant="h5" 
                    color={costs.grossProfit >= 0 ? 'success.main' : 'error.main'}
                  >
                    {formatCurrency(costs.grossProfit)}
                  </Typography>
                </Box>
                {costs.grossProfit >= 0 ? 
                  <ProfitIcon sx={{ fontSize: 40, color: 'success.main' }} /> :
                  <LossIcon sx={{ fontSize: 40, color: 'error.main' }} />
                }
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
                    Gross Margin
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography 
                      variant="h5" 
                      color={costs.grossProfit >= 0 ? 'success.main' : 'error.main'}
                    >
                      {formatPercentage(costs.grossMargin)}
                    </Typography>
                    <Chip
                      label={getProfitColor(costs.grossMargin)}
                      size="small"
                      color={getProfitColor(costs.grossMargin) as any}
                    />
                  </Box>
                </Box>
                <MoneyIcon sx={{ fontSize: 40, color: getProfitColor(costs.grossMargin) === 'success' ? 'success.main' : 'error.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Cost Breakdown */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                💰 Cost Breakdown
              </Typography>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>Labor Costs</Typography>
                  <Typography fontWeight="bold">{formatCurrency(costs.totalLaborCost)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>Material Costs</Typography>
                  <Typography fontWeight="bold">{formatCurrency(costs.totalMaterialCost)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>Equipment Costs</Typography>
                  <Typography fontWeight="bold">{formatCurrency(costs.totalEquipmentCost)}</Typography>
                </Box>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography fontWeight="bold">Direct Costs</Typography>
                  <Typography fontWeight="bold">{formatCurrency(costs.totalDirectCosts)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>Overhead ({formatPercentage(costs.overheadPercentage)})</Typography>
                  <Typography>{formatCurrency(costs.overheadAmount)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>Miscellaneous</Typography>
                  <Typography>{formatCurrency(costs.miscCosts)}</Typography>
                </Box>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography fontWeight="bold" variant="h6">Total Job Cost</Typography>
                  <Typography fontWeight="bold" variant="h6" color="error.main">
                    {formatCurrency(costs.totalJobCost)}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📈 Performance Metrics
              </Typography>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>Total Labor Hours</Typography>
                  <Typography fontWeight="bold">{costs.totalLaborHours.toFixed(1)}h</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>Average Labor Rate</Typography>
                  <Typography fontWeight="bold">{formatCurrency(costs.averageLaborRate)}/hr</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>Equipment Hours</Typography>
                  <Typography fontWeight="bold">{costs.equipmentHours.toFixed(1)}h</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>Material Markup</Typography>
                  <Typography fontWeight="bold">{formatCurrency(costs.materialMarkupAmount)}</Typography>
                </Box>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>Cost per Hour</Typography>
                  <Typography fontWeight="bold">
                    {costs.totalLaborHours > 0 ? formatCurrency(costs.totalJobCost / costs.totalLaborHours) : '$0'}/hr
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>Revenue per Hour</Typography>
                  <Typography fontWeight="bold">
                    {costs.totalLaborHours > 0 ? formatCurrency(costs.billedAmount / costs.totalLaborHours) : '$0'}/hr
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detailed Breakdowns */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          📋 Detailed Cost Breakdown
        </Typography>

        {/* Labor Costs */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LaborIcon />
              <Typography variant="h6">
                Labor Costs ({formatCurrency(costs.totalLaborCost)})
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Worker</TableCell>
                    <TableCell>Skill Level</TableCell>
                    <TableCell>Hours</TableCell>
                    <TableCell>Rate</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {laborCosts.map((cost) => (
                    <TableRow key={cost.id}>
                      <TableCell>{format(new Date(cost.workDate), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{cost.userName}</TableCell>
                      <TableCell>
                        <Chip label={cost.skillLevel} size="small" />
                      </TableCell>
                      <TableCell>{cost.hoursWorked.toFixed(1)}h</TableCell>
                      <TableCell>{formatCurrency(cost.hourlyRate)}/hr</TableCell>
                      <TableCell align="right">{formatCurrency(cost.totalCost)}</TableCell>
                    </TableRow>
                  ))}
                  {laborCosts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No labor costs recorded
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>

        {/* Material Costs */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MaterialIcon />
              <Typography variant="h6">
                Material Costs ({formatCurrency(costs.totalMaterialCost)})
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Material</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Unit Cost</TableCell>
                    <TableCell>Markup</TableCell>
                    <TableCell align="right">Total Cost</TableCell>
                    <TableCell align="right">Billed</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {materialCosts.map((cost) => (
                    <TableRow key={cost.id}>
                      <TableCell>{format(new Date(cost.usageDate), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">{cost.materialCode}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {cost.materialName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{cost.quantityUsed} {cost.materialUnit}</TableCell>
                      <TableCell>{formatCurrency(cost.unitCost)}</TableCell>
                      <TableCell>{formatPercentage(cost.markup)}</TableCell>
                      <TableCell align="right">{formatCurrency(cost.totalCost)}</TableCell>
                      <TableCell align="right">{formatCurrency(cost.billedAmount)}</TableCell>
                    </TableRow>
                  ))}
                  {materialCosts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No material costs recorded
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>

        {/* Equipment Costs */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EquipmentIcon />
              <Typography variant="h6">
                Equipment Costs ({formatCurrency(costs.totalEquipmentCost)})
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Equipment</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Operator</TableCell>
                    <TableCell>Hours</TableCell>
                    <TableCell>Rate</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {equipmentCosts.map((cost) => (
                    <TableRow key={cost.id}>
                      <TableCell>{format(new Date(cost.usageDate), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{cost.equipmentName}</TableCell>
                      <TableCell>
                        <Chip label={cost.equipmentType} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{cost.operatorName || '-'}</TableCell>
                      <TableCell>{cost.hoursUsed.toFixed(1)}h</TableCell>
                      <TableCell>{formatCurrency(cost.hourlyRate)}/hr</TableCell>
                      <TableCell align="right">{formatCurrency(cost.totalCost)}</TableCell>
                    </TableRow>
                  ))}
                  {equipmentCosts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No equipment costs recorded
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cost Calculation Settings</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Overhead Percentage"
              type="number"
              value={overheadPercentage}
              onChange={(e) => setOverheadPercentage(e.target.value)}
              inputProps={{ min: 0, max: 100, step: 0.1 }}
              helperText="Percentage of direct costs to add as overhead"
            />
            <TextField
              label="Material Markup Percentage"
              type="number"
              value={materialMarkup}
              onChange={(e) => setMaterialMarkup(e.target.value)}
              inputProps={{ min: 0, max: 100, step: 0.1 }}
              helperText="Default markup percentage for materials"
            />
            <TextField
              label="Miscellaneous Costs"
              type="number"
              value={miscCosts}
              onChange={(e) => setMiscCosts(e.target.value)}
              inputProps={{ min: 0, step: 0.01 }}
              helperText="Additional miscellaneous costs for this job"
            />
            <TextField
              label="Misc Cost Description"
              value={miscCostDescription}
              onChange={(e) => setMiscCostDescription(e.target.value)}
              multiline
              rows={2}
              helperText="Description of miscellaneous costs"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateSettings} variant="contained">
            Update Settings
          </Button>
        </DialogActions>
      </Dialog>

      {/* Last Calculated */}
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Last calculated: {format(new Date(costs.lastCalculated), 'MMM d, yyyy h:mm a')}
        </Typography>
      </Box>
    </Box>
  )
}