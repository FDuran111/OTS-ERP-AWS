'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Button,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import {
  Map as MapIcon,
  TrendingUp as TrendingUpIcon,
  LocationOn as LocationIcon,
  Work as WorkIcon,
  AttachMoney as MoneyIcon,
  DateRange as DateRangeIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import ResponsiveLayout from '@/components/layout/ResponsiveLayout'
import ResponsiveContainer from '@/components/layout/ResponsiveContainer'
import dynamic from 'next/dynamic'

// Dynamically import map component to avoid SSR issues
const ServiceAreaMap = dynamic(
  () => import('@/components/analytics/ServiceAreaMap'),
  { 
    ssr: false,
    loading: () => <Box sx={{ height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>
  }
)

interface ServiceAreaData {
  customers: any[]
  cities: any[]
  jobTypes: any[]
  bounds: any
  dayPatterns: any[]
  summary: {
    totalCustomers: number
    totalJobs: number
    totalRevenue: number
    dateRange: {
      start: string
      end: string
    }
  }
}

export default function ServiceAreaPage() {
  const { user } = useAuth()
  const router = useRouter()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ServiceAreaData | null>(null)
  
  // Filters
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [jobType, setJobType] = useState('all')
  const [viewMode, setViewMode] = useState<'density' | 'revenue'>('density')

  useEffect(() => {
    // Check if user is admin@admin.com
    if (user?.email !== 'admin@admin.com') {
      router.push('/dashboard')
      return
    }
    
    fetchServiceAreaData()
  }, [user, router])

  const fetchServiceAreaData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        startDate: dateRange.start,
        endDate: dateRange.end,
        jobType: jobType
      })
      
      const response = await fetch(`/api/analytics/service-area?${params}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch service area data')
      }
      
      const result = await response.json()
      setData(result.data)
    } catch (err) {
      console.error('Error fetching service area data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = () => {
    fetchServiceAreaData()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <ResponsiveLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <CircularProgress />
        </Box>
      </ResponsiveLayout>
    )
  }

  if (error) {
    return (
      <ResponsiveLayout>
        <ResponsiveContainer>
          <Alert severity="error">{error}</Alert>
        </ResponsiveContainer>
      </ResponsiveLayout>
    )
  }

  return (
    <ResponsiveLayout>
      <ResponsiveContainer
        title="Service Area Analytics"
        subtitle="Visualize job density and revenue distribution across service areas"
        actions={
          <Button
            startIcon={<RefreshIcon />}
            onClick={fetchServiceAreaData}
            variant="outlined"
          >
            Refresh
          </Button>
        }
      >
        {/* Beta Notice */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Beta Feature:</strong> This service area heat map is currently in testing and only available to admin@admin.com
          </Typography>
        </Alert>

        {/* Summary Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <LocationIcon color="primary" sx={{ mr: 1 }} />
                <Typography color="text.secondary" variant="body2">
                  Service Areas
                </Typography>
              </Box>
              <Typography variant="h5">{data?.cities.length || 0}</Typography>
              <Typography variant="caption" color="text.secondary">
                Active locations
              </Typography>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <WorkIcon color="primary" sx={{ mr: 1 }} />
                <Typography color="text.secondary" variant="body2">
                  Total Jobs
                </Typography>
              </Box>
              <Typography variant="h5">{data?.summary.totalJobs || 0}</Typography>
              <Typography variant="caption" color="text.secondary">
                In date range
              </Typography>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MoneyIcon color="primary" sx={{ mr: 1 }} />
                <Typography color="text.secondary" variant="body2">
                  Total Revenue
                </Typography>
              </Box>
              <Typography variant="h5">
                {formatCurrency(data?.summary.totalRevenue || 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Generated revenue
              </Typography>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                <Typography color="text.secondary" variant="body2">
                  Avg Job Value
                </Typography>
              </Box>
              <Typography variant="h5">
                {formatCurrency((data?.summary.totalRevenue || 0) / (data?.summary.totalJobs || 1))}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Per job average
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, gap: 2 }}>
            <TextField
              label="Start Date"
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
              size="small"
            />
            
            <TextField
              label="End Date"
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
              size="small"
            />
            
            <FormControl fullWidth size="small">
              <InputLabel>Job Type</InputLabel>
              <Select
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                label="Job Type"
              >
                <MenuItem value="all">All Types</MenuItem>
                {data?.jobTypes.map((type) => (
                  <MenuItem key={type.job_type} value={type.job_type}>
                    {type.job_type} ({type.count})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth size="small">
              <InputLabel>View Mode</InputLabel>
              <Select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as 'density' | 'revenue')}
                label="View Mode"
              >
                <MenuItem value="density">Job Density</MenuItem>
                <MenuItem value="revenue">Revenue Heat</MenuItem>
              </Select>
            </FormControl>
            
            <Button
              variant="contained"
              onClick={handleFilterChange}
              fullWidth
              startIcon={<MapIcon />}
            >
              Update Map
            </Button>
          </Box>
        </Paper>

        {/* Map Container */}
        <Paper sx={{ p: 2, mb: 3, height: isMobile ? '400px' : '600px' }}>
          <ServiceAreaMap 
            data={data}
            viewMode={viewMode}
          />
        </Paper>

        {/* Additional Insights */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
          {/* Top Service Areas */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Service Areas
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {data?.cities.slice(0, 5).map((city, index) => (
                  <Box 
                    key={index}
                    sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 1,
                      bgcolor: 'background.default',
                      borderRadius: 1
                    }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {city.city}, {city.state}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {city.job_count} jobs • {city.customer_count} customers
                      </Typography>
                    </Box>
                    <Chip 
                      label={formatCurrency(city.total_revenue)}
                      color="primary"
                      size="small"
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Day Pattern Analysis */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Service Patterns by Day
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {data?.dayPatterns.map((pattern) => (
                  <Box 
                    key={pattern.day}
                    sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 1,
                      bgcolor: 'background.default',
                      borderRadius: 1
                    }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {pattern.day}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {pattern.job_count} jobs scheduled
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="primary">
                      {formatCurrency(pattern.avg_revenue)} avg
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </ResponsiveContainer>
    </ResponsiveLayout>
  )
}