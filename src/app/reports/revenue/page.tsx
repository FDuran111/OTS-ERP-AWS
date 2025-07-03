'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ResponsiveLayout from '@/components/layout/ResponsiveLayout'
import ResponsiveContainer from '@/components/layout/ResponsiveContainer'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Paper,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Stack,
  MenuItem,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import {
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  People as PeopleIcon,
  Work as WorkIcon,
  Download as DownloadIcon,
  CalendarMonth as CalendarIcon,
  ShowChart as ChartIcon,
} from '@mui/icons-material'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer as RechartsContainer,
} from 'recharts'

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface RevenueData {
  period: {
    start: string
    end: string
    label: string
  }
  summary: {
    totalJobs: number
    totalCustomers: number
    totalRevenue: number
    totalCost: number
    netProfit: number
    profitMargin: string
    avgJobValue: number
  }
  revenueByStatus: Array<{
    status: string
    jobCount: number
    revenue: number
  }>
  revenueByType: Array<{
    type: string
    jobCount: number
    revenue: number
  }>
  monthlyTrend: Array<{
    month: string
    jobCount: number
    revenue: number
  }>
  topCustomers: Array<{
    id: string
    name: string
    jobCount: number
    revenue: number
  }>
  invoiceStats: Record<string, { count: number; amount: number }>
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const formatMonth = (monthStr: string) => {
  const [year, month] = monthStr.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

export default function RevenueReportPage() {
  const router = useRouter()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [user, setUser] = useState<User | null>(null)
  const [period, setPeriod] = useState('month')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<RevenueData | null>(null)

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
      fetchRevenueData()
    }
  }, [user, period])

  const fetchRevenueData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/reports/revenue?period=${period}`)
      if (!response.ok) {
        throw new Error('Failed to fetch revenue data')
      }
      
      const data = await response.json()
      setData(data)
    } catch (error) {
      console.error('Error fetching revenue data:', error)
      setError('Failed to load revenue report')
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    if (!data) return

    // Create CSV content
    let csv = 'Revenue Report\\n'
    csv += `Period: ${new Date(data.period.start).toLocaleDateString()} - ${new Date(data.period.end).toLocaleDateString()}\\n\\n`
    
    // Summary
    csv += 'Summary\\n'
    csv += `Total Jobs,${data.summary.totalJobs}\\n`
    csv += `Total Customers,${data.summary.totalCustomers}\\n`
    csv += `Total Revenue,${formatCurrency(data.summary.totalRevenue)}\\n`
    csv += `Total Cost,${formatCurrency(data.summary.totalCost)}\\n`
    csv += `Net Profit,${formatCurrency(data.summary.netProfit)}\\n`
    csv += `Profit Margin,${data.summary.profitMargin}%\\n`
    csv += `Average Job Value,${formatCurrency(data.summary.avgJobValue)}\\n\\n`
    
    // Top Customers
    csv += 'Top Customers\\n'
    csv += 'Customer,Jobs,Revenue\\n'
    data.topCustomers.forEach(customer => {
      csv += `"${customer.name}",${customer.jobCount},${formatCurrency(customer.revenue)}\\n`
    })
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `revenue-report-${period}-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (!user) return null


  return (
    <ResponsiveLayout>
      <ResponsiveContainer
        title="Revenue Report"
        actions={
          <Stack direction="row" spacing={2}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Period</InputLabel>
              <Select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                label="Period"
              >
                <MenuItem value="month">This Month</MenuItem>
                <MenuItem value="quarter">This Quarter</MenuItem>
                <MenuItem value="year">This Year</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={exportToCSV}
              disabled={!data}
            >
              Export CSV
            </Button>
          </Stack>
        }
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : data ? (
          <Stack spacing={3}>
            {/* Summary Cards */}
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <MoneyIcon sx={{ color: 'success.main', mr: 1 }} />
                      <Typography variant="h6">Total Revenue</Typography>
                    </Box>
                    <Typography variant="h4" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                      {formatCurrency(data.summary.totalRevenue)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {data.summary.totalJobs} jobs completed
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <TrendingUpIcon sx={{ color: 'primary.main', mr: 1 }} />
                      <Typography variant="h6">Net Profit</Typography>
                    </Box>
                    <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                      {formatCurrency(data.summary.netProfit)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {data.summary.profitMargin}% margin
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <PeopleIcon sx={{ color: 'info.main', mr: 1 }} />
                      <Typography variant="h6">Customers</Typography>
                    </Box>
                    <Typography variant="h4" sx={{ color: 'info.main', fontWeight: 'bold' }}>
                      {data.summary.totalCustomers}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Active this period
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <WorkIcon sx={{ color: 'warning.main', mr: 1 }} />
                      <Typography variant="h6">Avg Job Value</Typography>
                    </Box>
                    <Typography variant="h4" sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                      {formatCurrency(data.summary.avgJobValue)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Per job average
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Revenue Trend Chart */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Revenue Trend
                </Typography>
                <Box sx={{ width: '100%', height: 300 }}>
                  <RechartsContainer>
                    <LineChart data={data.monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="month" 
                        tickFormatter={formatMonth}
                        angle={isMobile ? -45 : 0}
                        textAnchor={isMobile ? "end" : "middle"}
                      />
                      <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(label) => formatMonth(label)}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        name="Revenue"
                      />
                    </LineChart>
                  </RechartsContainer>
                </Box>
              </CardContent>
            </Card>

            <Grid container spacing={3}>
              {/* Revenue by Status */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Revenue by Job Status
                    </Typography>
                    <Box sx={{ width: '100%', height: 300 }}>
                      <RechartsContainer>
                        <PieChart>
                          <Pie
                            data={data.revenueByStatus}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry) => `${entry.status}: ${formatCurrency(entry.revenue)}`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="revenue"
                          >
                            {data.revenueByStatus.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        </PieChart>
                      </RechartsContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Revenue by Type */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Revenue by Job Type
                    </Typography>
                    <Box sx={{ width: '100%', height: 300 }}>
                      <RechartsContainer>
                        <BarChart data={data.revenueByType}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="type" />
                          <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Bar dataKey="revenue" fill="#82ca9d" />
                        </BarChart>
                      </RechartsContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Top Customers */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top Customers
                </Typography>
                <Box sx={{ overflowX: 'auto' }}>
                  <Box sx={{ minWidth: 500 }}>
                    {data.topCustomers.map((customer, index) => (
                      <Box key={customer.id}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            py: 2,
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Chip 
                              label={`#${index + 1}`} 
                              size="small" 
                              color={index < 3 ? 'primary' : 'default'}
                            />
                            <Box>
                              <Typography variant="subtitle1">
                                {customer.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {customer.jobCount} jobs
                              </Typography>
                            </Box>
                          </Box>
                          <Typography variant="h6" sx={{ color: 'success.main' }}>
                            {formatCurrency(customer.revenue)}
                          </Typography>
                        </Box>
                        {index < data.topCustomers.length - 1 && <Divider />}
                      </Box>
                    ))}
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Invoice Statistics */}
            {data.invoiceStats && Object.keys(data.invoiceStats).length > 0 && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Invoice Status
                  </Typography>
                  <Grid container spacing={2}>
                    {Object.entries(data.invoiceStats).map(([status, stats]) => (
                      <Grid key={status} size={{ xs: 12, sm: 6, md: 3 }}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                            {status}
                          </Typography>
                          <Typography variant="h4" sx={{ my: 1 }}>
                            {stats.count}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {formatCurrency(stats.amount)}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            )}
          </Stack>
        ) : null}
      </ResponsiveContainer>
    </ResponsiveLayout>
  )
}