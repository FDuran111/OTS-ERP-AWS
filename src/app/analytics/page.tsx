'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ResponsiveLayout from '@/components/layout/ResponsiveLayout'
import ResponsiveContainer from '@/components/layout/ResponsiveContainer'
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import {
  TrendingUp,
  Language as WebIcon,
  Assignment as FormIcon,
  People as LeadsIcon,
  LocationOn as LocationIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Visibility as EyeIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  AccessTime as ClockIcon,
} from '@mui/icons-material'

interface AnalyticsData {
  leadMetrics?: {
    totalLeads: number
    websiteLeads: number
    conversionRate: number
    averageResponseTime: string
    leadsBySource: { source: string; count: number }[]
    recentLeads: any[]
  }
  pageMetrics?: {
    totalPageViews: number
    uniqueVisitors: number
    topPages: { page: string; views: number }[]
    pageViewsTrend: { date: string; views: number }[]
  }
  formMetrics?: {
    formsStarted: number
    formsCompleted: number
    formsAbandoned: number
    completionRate: number
    abandonmentRate: number
  }
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState('7days')

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/login')
      return
    }
    const userData = JSON.parse(storedUser)
    setUser(userData)

    // Only allow admin/owner to view analytics
    if (userData.role !== 'OWNER_ADMIN' && userData.role !== 'FOREMAN') {
      router.push('/dashboard')
    }
  }, [router])

  useEffect(() => {
    if (user) {
      fetchAnalytics()
      // Refresh every 30 seconds for real-time updates
      const interval = setInterval(fetchAnalytics, 30000)
      return () => clearInterval(interval)
    }
  }, [user, timeRange])

  const fetchAnalytics = async () => {
    try {
      setError(null)

      // Calculate days based on time range
      const days = timeRange === 'today' ? 1 :
                  timeRange === '7days' ? 7 :
                  timeRange === '30days' ? 30 : 90

      // Fetch all metrics in parallel
      const [leadsRes, pagesRes, formsRes] = await Promise.all([
        fetch(`/api/analytics/leads?days=${days}`),
        fetch(`/api/analytics/pages?days=${days}`),
        fetch(`/api/analytics/forms?days=${days}`)
      ])

      const leadData = await leadsRes.json()
      const pageData = await pagesRes.json()
      const formData = await formsRes.json()

      setData({
        leadMetrics: leadData,
        pageMetrics: pageData,
        formMetrics: formData
      })
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
      setError('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ title, value, subtitle, icon, color = 'primary.main' }: any) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography color="text.secondary" gutterBottom variant="overline">
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ color }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ color, opacity: 0.3 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )

  if (!user) return null

  if (loading) {
    return (
      <ResponsiveLayout>
        <ResponsiveContainer>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        </ResponsiveContainer>
      </ResponsiveLayout>
    )
  }

  const emergencyLeads = data?.leadMetrics?.recentLeads?.filter(l => l.urgency === 'EMERGENCY') || []

  return (
    <ResponsiveLayout>
      <ResponsiveContainer>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" gutterBottom>
              Website Analytics & Lead Tracking
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Monitor your website performance and lead generation
            </Typography>
          </Box>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="7days">Last 7 Days</MenuItem>
              <MenuItem value="30days">Last 30 Days</MenuItem>
              <MenuItem value="90days">Last 90 Days</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Emergency Alert */}
        {emergencyLeads.length > 0 && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <strong>Emergency Service Requests:</strong> You have {emergencyLeads.length} emergency requests waiting for response!
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Key Metrics */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' } }}>
            <StatCard
              title="Website Leads"
              value={data?.leadMetrics?.websiteLeads?.toLocaleString() || '0'}
              subtitle={`${data?.leadMetrics?.conversionRate || 0}% conversion rate`}
              icon={<LeadsIcon sx={{ fontSize: 40 }} />}
              color="primary.main"
            />
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' } }}>
            <StatCard
              title="Page Views"
              value={data?.pageMetrics?.totalPageViews?.toLocaleString() || '0'}
              subtitle={`${data?.pageMetrics?.uniqueVisitors || 0} unique visitors`}
              icon={<EyeIcon sx={{ fontSize: 40 }} />}
              color="success.main"
            />
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' } }}>
            <StatCard
              title="Form Completion"
              value={`${data?.formMetrics?.completionRate || 0}%`}
              subtitle={`${data?.formMetrics?.formsCompleted || 0} completed`}
              icon={<CheckIcon sx={{ fontSize: 40 }} />}
              color="success.main"
            />
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' } }}>
            <StatCard
              title="Avg Response Time"
              value={data?.leadMetrics?.averageResponseTime || 'N/A'}
              subtitle="to first contact"
              icon={<ClockIcon sx={{ fontSize: 40 }} />}
              color="warning.main"
            />
          </Box>
        </Box>

        {/* Form Funnel Analysis */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Form Conversion Funnel
          </Typography>
          <Box sx={{ mt: 3 }}>
            {/* Forms Viewed */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Forms Viewed</Typography>
                <Typography variant="body2" color="text.secondary">100%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={100} sx={{ height: 10, borderRadius: 5 }} />
            </Box>

            {/* Forms Started */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Forms Started</Typography>
                <Typography variant="body2" color="text.secondary">
                  {((data?.formMetrics?.formsStarted || 0) / (data?.pageMetrics?.totalPageViews || 1) * 100).toFixed(1)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(((data?.formMetrics?.formsStarted || 0) / (data?.pageMetrics?.totalPageViews || 1) * 100), 100)}
                sx={{ height: 10, borderRadius: 5 }}
                color="warning"
              />
            </Box>

            {/* Forms Completed */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Forms Completed</Typography>
                <Typography variant="body2" color="text.secondary">
                  {data?.formMetrics?.completionRate || 0}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={data?.formMetrics?.completionRate || 0}
                sx={{ height: 10, borderRadius: 5 }}
                color="success"
              />
            </Box>

            {/* High Abandonment Warning */}
            {(data?.formMetrics?.abandonmentRate || 0) > 20 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                High abandonment rate ({data?.formMetrics?.abandonmentRate}%). Consider simplifying your form or reducing required fields.
              </Alert>
            )}
          </Box>
        </Paper>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {/* Top Pages */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 45%' } }}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Top Pages
              </Typography>
              {data?.pageMetrics?.topPages && data.pageMetrics.topPages.length > 0 ? (
                <Box sx={{ mt: 2 }}>
                  {data.pageMetrics.topPages.slice(0, 5).map((page, index) => (
                    <Box key={index} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" noWrap sx={{ maxWidth: '70%' }}>
                          {index + 1}. {page.page}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {page.views} views
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(page.views / (data.pageMetrics?.totalPageViews || 1)) * 100}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                  No page data available
                </Typography>
              )}
            </Paper>
          </Box>

          {/* Lead Sources */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 45%' } }}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Lead Sources
              </Typography>
              {data?.leadMetrics?.leadsBySource && data.leadMetrics.leadsBySource.length > 0 ? (
                <Box sx={{ mt: 2 }}>
                  {data.leadMetrics.leadsBySource.map((source, index) => (
                    <Box key={index} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">{source.source}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {source.count} leads
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(source.count / (data.leadMetrics?.totalLeads || 1)) * 100}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                  No lead source data available
                </Typography>
              )}
            </Paper>
          </Box>

          {/* Recent Website Leads */}
          <Box sx={{ flex: '1 1 100%' }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Recent Website Leads
              </Typography>
              {data?.leadMetrics?.recentLeads && data.leadMetrics.recentLeads.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Contact</TableCell>
                        <TableCell>Service Type</TableCell>
                        <TableCell>Urgency</TableCell>
                        <TableCell>Submitted</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.leadMetrics.recentLeads.slice(0, 10).map((lead) => (
                        <TableRow key={lead.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {lead.firstName} {lead.lastName}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {lead.email}<br />
                              {lead.phone}
                            </Typography>
                          </TableCell>
                          <TableCell>{lead.serviceType || 'N/A'}</TableCell>
                          <TableCell>
                            <Chip
                              label={lead.urgency || 'NORMAL'}
                              size="small"
                              color={
                                lead.urgency === 'EMERGENCY' ? 'error' :
                                lead.urgency === 'HIGH' ? 'warning' :
                                'default'
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {new Date(lead.createdAt).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={lead.status || 'NEW'}
                              size="small"
                              color={
                                lead.status === 'CONVERTED' ? 'success' :
                                lead.status === 'CONTACTED' ? 'info' :
                                'default'
                              }
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                  No recent leads available
                </Typography>
              )}
            </Paper>
          </Box>
        </Box>
      </ResponsiveContainer>
    </ResponsiveLayout>
  )
}