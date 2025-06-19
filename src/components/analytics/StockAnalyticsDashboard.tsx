'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  Refresh as RefreshIcon,
  TrendingUp,
  TrendingDown,
  Warning as WarningIcon,
  Inventory as InventoryIcon,
  Assessment as AssessmentIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line } from 'recharts'

interface StockAnalytics {
  stockLevels: Array<{
    level: string
    count: number
    totalValue: number
  }>
  movementTrends: Array<{
    date: string
    type: string
    transactionCount: number
    totalQuantity: number
    totalValue: number
  }>
  topMaterialsByValue: Array<{
    id: string
    code: string
    name: string
    category: string
    inStock: number
    cost: number
    totalValue: number
    stockPercentage: number
  }>
  mostUsedMaterials: Array<{
    id: string
    code: string
    name: string
    category: string
    unit: string
    totalUsed: number
    jobsUsedOn: number
    totalCost: number
    avgUsagePerJob: number
  }>
  turnoverAnalysis: Array<{
    id: string
    code: string
    name: string
    category: string
    inStock: number
    totalUsedPeriod: number
    daysOfStock: number
    turnoverRatio: number
  }>
  categoryBreakdown: Array<{
    category: string
    materialCount: number
    totalStock: number
    totalValue: number
    avgStockPercentage: number
  }>
  recentAlerts: Array<{
    materialId: string
    code: string
    name: string
    category: string
    currentStock: number
    minStock: number
    alertTriggeredAt: string
  }>
  summary: {
    period: number
    categoryFilter: string | null
    totalMaterials: number
    totalValue: number
  }
}

const COLORS = ['#e14eca', '#f1c40f', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6']

export default function StockAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<StockAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('30')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [availableCategories, setAvailableCategories] = useState<string[]>([])

  useEffect(() => {
    fetchAnalytics()
    fetchCategories()
  }, [period, categoryFilter])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ period })
      if (categoryFilter) params.append('category', categoryFilter)
      
      const response = await fetch(`/api/analytics/stock?${params}`)
      if (!response.ok) throw new Error('Failed to fetch analytics')
      
      const data = await response.json()
      setAnalytics(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/materials')
      if (response.ok) {
        const materials = await response.json()
        const categories = [...new Set(materials.map((m: any) => m.category).filter(Boolean))]
        setAvailableCategories(categories.sort())
      }
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
  }

  const getStockLevelColor = (level: string) => {
    switch (level) {
      case 'Out of Stock': return '#e74c3c'
      case 'Critical': return '#e67e22'
      case 'Low': return '#f1c40f'
      case 'Adequate': return '#3498db'
      case 'High': return '#2ecc71'
      default: return '#95a5a6'
    }
  }

  const getTurnoverColor = (ratio: number) => {
    if (ratio >= 1) return 'success'
    if (ratio >= 0.5) return 'warning'
    return 'error'
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading stock analytics...</Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
        {error}
      </Alert>
    )
  }

  if (!analytics) return null

  return (
    <Box>
      {/* Header Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Stock Analytics Dashboard</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Period</InputLabel>
            <Select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              label="Period"
            >
              <MenuItem value="7">Last 7 days</MenuItem>
              <MenuItem value="30">Last 30 days</MenuItem>
              <MenuItem value="90">Last 90 days</MenuItem>
              <MenuItem value="365">Last year</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              label="Category"
            >
              <MenuItem value="">All Categories</MenuItem>
              {availableCategories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <IconButton onClick={fetchAnalytics} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
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
                    backgroundColor: '#e14eca20',
                    mr: 2,
                  }}
                >
                  <InventoryIcon sx={{ color: '#e14eca' }} />
                </Box>
                <Box>
                  <Typography color="text.secondary" variant="caption">
                    Total Inventory Value
                  </Typography>
                  <Typography variant="h6">
                    {formatCurrency(analytics.summary.totalValue)}
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
                    backgroundColor: '#3498db20',
                    mr: 2,
                  }}
                >
                  <AssessmentIcon sx={{ color: '#3498db' }} />
                </Box>
                <Box>
                  <Typography color="text.secondary" variant="caption">
                    Active Materials
                  </Typography>
                  <Typography variant="h6">
                    {analytics.summary.totalMaterials}
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
                  <WarningIcon sx={{ color: '#f1c40f' }} />
                </Box>
                <Box>
                  <Typography color="text.secondary" variant="caption">
                    Low Stock Items
                  </Typography>
                  <Typography variant="h6">
                    {analytics.stockLevels.find(l => l.level === 'Low')?.count || 0}
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
                    backgroundColor: '#e74c3c20',
                    mr: 2,
                  }}
                >
                  <ScheduleIcon sx={{ color: '#e74c3c' }} />
                </Box>
                <Box>
                  <Typography color="text.secondary" variant="caption">
                    Recent Alerts
                  </Typography>
                  <Typography variant="h6">
                    {analytics.recentAlerts.length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Stock Level Distribution */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Stock Level Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.stockLevels}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ level, count }) => `${level}: ${count}`}
                  >
                    {analytics.stockLevels.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getStockLevelColor(entry.level)} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Category Breakdown */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Category Value Breakdown
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.categoryBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Bar dataKey="totalValue" fill="#e14eca" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Materials by Value */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Materials by Value
              </Typography>
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Material</TableCell>
                      <TableCell align="right">Stock</TableCell>
                      <TableCell align="right">Value</TableCell>
                      <TableCell align="right">Level</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics.topMaterialsByValue.slice(0, 10).map((material) => (
                      <TableRow key={material.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {material.code}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {material.name}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {material.inStock.toLocaleString()}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(material.totalValue)}
                        </TableCell>
                        <TableCell align="right">
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(material.stockPercentage, 100)}
                            color={material.stockPercentage <= 50 ? 'error' : 
                                   material.stockPercentage <= 100 ? 'warning' : 'success'}
                            sx={{ width: 60 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Most Used Materials */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Most Used Materials ({analytics.summary.period} days)
              </Typography>
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Material</TableCell>
                      <TableCell align="right">Used</TableCell>
                      <TableCell align="right">Jobs</TableCell>
                      <TableCell align="right">Cost</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics.mostUsedMaterials.slice(0, 10).map((material) => (
                      <TableRow key={material.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {material.code}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {material.name}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {material.totalUsed.toLocaleString()} {material.unit}
                        </TableCell>
                        <TableCell align="right">
                          {material.jobsUsedOn}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(material.totalCost)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Stock Turnover Analysis */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Stock Turnover Analysis
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Material</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Current Stock</TableCell>
                      <TableCell align="right">Used ({analytics.summary.period}d)</TableCell>
                      <TableCell align="right">Days Remaining</TableCell>
                      <TableCell align="right">Turnover</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics.turnoverAnalysis.slice(0, 15).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {item.code}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.name}
                          </Typography>
                        </TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell align="right">
                          {item.inStock.toLocaleString()}
                        </TableCell>
                        <TableCell align="right">
                          {item.totalUsedPeriod.toLocaleString()}
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={item.daysOfStock >= 999 ? '∞' : Math.round(item.daysOfStock)}
                            size="small"
                            color={item.daysOfStock < 30 ? 'error' : 
                                   item.daysOfStock < 60 ? 'warning' : 'success'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${(item.turnoverRatio * 100).toFixed(1)}%`}
                            size="small"
                            color={getTurnoverColor(item.turnoverRatio)}
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Stock Alerts */}
        {analytics.recentAlerts.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Stock Alerts (Last 7 days)
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Material</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell align="right">Current Stock</TableCell>
                        <TableCell align="right">Minimum Stock</TableCell>
                        <TableCell>Alert Time</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analytics.recentAlerts.map((alert) => (
                        <TableRow key={alert.materialId}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {alert.code}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {alert.name}
                            </Typography>
                          </TableCell>
                          <TableCell>{alert.category}</TableCell>
                          <TableCell align="right">
                            <Typography 
                              color={alert.currentStock === 0 ? 'error' : 'warning'}
                              fontWeight="medium"
                            >
                              {alert.currentStock}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            {alert.minStock}
                          </TableCell>
                          <TableCell>
                            {new Date(alert.alertTriggeredAt).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  )
}