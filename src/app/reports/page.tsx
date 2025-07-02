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
  List,
  ListItemText,
  Divider,
  CircularProgress,
  Snackbar,
  Alert,
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
  Download as DownloadIcon,
  TrendingUp,
  AttachMoney,
  Engineering,
  Description,
} from '@mui/icons-material'

interface User {
  id: string
  email: string
  name: string
  role: string
}

const reportTypes = [
  {
    title: 'Revenue Report',
    description: 'Monthly revenue breakdown by job type',
    icon: AttachMoney,
    color: '#1d8cf8',
    lastGenerated: '2025-05-25',
  },
  {
    title: 'Job Performance',
    description: 'Job completion rates and efficiency metrics',
    icon: TrendingUp,
    color: '#00bf9a',
    lastGenerated: '2025-05-24',
  },
  {
    title: 'Crew Productivity',
    description: 'Hours worked and productivity by crew',
    icon: Engineering,
    color: '#e14eca',
    lastGenerated: '2025-05-23',
  },
  {
    title: 'Material Usage',
    description: 'Material consumption and cost analysis',
    icon: InventoryIcon,
    color: '#fd5d93',
    lastGenerated: '2025-05-22',
  },
  {
    title: 'Customer Report',
    description: 'Customer job history and satisfaction',
    icon: PeopleIcon,
    color: '#ff8d72',
    lastGenerated: '2025-05-21',
  },
  {
    title: 'Invoice Summary',
    description: 'Outstanding invoices and payment history',
    icon: Description,
    color: '#00f2c3',
    lastGenerated: '2025-05-20',
  },
]

interface QuickStat {
  label: string
  value: string
}


export default function ReportsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [timeRange, setTimeRange] = useState('month')
  const [quickStats, setQuickStats] = useState<QuickStat[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingReport, setGeneratingReport] = useState<string | null>(null)
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({ open: false, message: '', severity: 'success' })

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/login')
      return
    }
    setUser(JSON.parse(storedUser))
    fetchQuickStats()
  }, [router, timeRange])

  const fetchQuickStats = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/reports/quick-stats?timeRange=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        
        const rangeLabelMap: Record<string, string> = {
          week: 'This Week',
          month: 'This Month', 
          quarter: 'This Quarter',
          year: 'This Year'
        }
        
        const rangeLabel = rangeLabelMap[timeRange] || 'This Month'
        
        setQuickStats([
          { 
            label: `Revenue ${rangeLabel}`, 
            value: `$${data.revenueThisPeriod.toLocaleString()}` 
          },
          { 
            label: 'Jobs Completed', 
            value: data.jobsCompleted.toString() 
          },
          { 
            label: 'Average Job Value', 
            value: `$${Math.round(data.averageJobValue).toLocaleString()}` 
          },
          { 
            label: 'Outstanding Invoices', 
            value: `$${data.outstandingInvoices.toLocaleString()}` 
          },
        ])
      }
    } catch (error) {
      console.error('Error fetching quick stats:', error)
      // Fallback to empty stats
      setQuickStats([
        { label: 'Revenue This Month', value: '$0' },
        { label: 'Jobs Completed', value: '0' },
        { label: 'Average Job Value', value: '$0' },
        { label: 'Outstanding Invoices', value: '$0' },
      ])
    } finally {
      setLoading(false)
    }
  }


  const handleGenerateReport = async (reportType: string) => {
    try {
      setGeneratingReport(reportType)
      
      const apiEndpoints: Record<string, string> = {
        'Revenue Report': '/api/reports/revenue',
        'Job Performance': '/api/reports/job-performance',
        'Crew Productivity': '/api/reports/crew-productivity',
        'Material Usage': '/api/reports/material-usage',
        'Customer Report': '/api/reports/customer',
        'Invoice Summary': '/api/reports/invoice-summary'
      }

      const endpoint = apiEndpoints[reportType]
      if (!endpoint) {
        setSnackbar({
          open: true,
          message: 'Report type not implemented yet',
          severity: 'error'
        })
        return
      }

      const response = await fetch(`${endpoint}?timeRange=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        
        // Generate PDF based on report type
        let pdfGenerated = true
        
        switch (reportType) {
          case 'Revenue Report': {
            const { generateRevenueReportPDF } = await import('@/lib/pdf/revenue-report')
            generateRevenueReportPDF(data)
            break
          }
          case 'Job Performance': {
            const { generateJobPerformanceReportPDF } = await import('@/lib/pdf/job-performance-report')
            generateJobPerformanceReportPDF(data)
            break
          }
          case 'Crew Productivity': {
            const { generateCrewProductivityReportPDF } = await import('@/lib/pdf/crew-productivity-report')
            generateCrewProductivityReportPDF(data)
            break
          }
          case 'Material Usage': {
            const { generateMaterialUsageReportPDF } = await import('@/lib/pdf/material-usage-report')
            generateMaterialUsageReportPDF(data)
            break
          }
          case 'Customer Report': {
            const { generateCustomerReportPDF } = await import('@/lib/pdf/customer-report')
            generateCustomerReportPDF(data)
            break
          }
          case 'Invoice Summary': {
            const { generateInvoiceSummaryReportPDF } = await import('@/lib/pdf/invoice-summary-report')
            generateInvoiceSummaryReportPDF(data)
            break
          }
          default:
            pdfGenerated = false
            console.log(`${reportType} Data:`, data)
        }
        
        setSnackbar({
          open: true,
          message: pdfGenerated ? `${reportType} PDF downloaded successfully!` : `${reportType} generated!`,
          severity: 'success'
        })
      } else {
        throw new Error('Failed to generate report')
      }
    } catch (error) {
      console.error('Error generating report:', error)
      setSnackbar({
        open: true,
        message: 'Failed to generate report. Please try again.',
        severity: 'error'
      })
    } finally {
      setGeneratingReport(null)
    }
  }

  if (!user) return null

  // Breadcrumbs for navigation
  const breadcrumbs = [
    {
      label: 'Home',
      path: '/dashboard',
      icon: <DashboardIcon fontSize="small" />
    },
    {
      label: 'Reports',
      path: '/reports',
      icon: <AssessmentIcon fontSize="small" />
    }
  ]

  return (
    <ResponsiveLayout>
      <ResponsiveContainer
        title="Reports & Analytics"
        subtitle="Generate comprehensive reports and analytics for your electrical business"
        breadcrumbs={breadcrumbs}
        actions={
          <Stack direction="row" spacing={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                label="Time Range"
              >
                <MenuItem value="week">This Week</MenuItem>
                <MenuItem value="month">This Month</MenuItem>
                <MenuItem value="quarter">This Quarter</MenuItem>
                <MenuItem value="year">This Year</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        }
      >

          <Grid container spacing={3} sx={{ mb: 4 }}>
            {quickStats.map((stat) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.label}>
                <Paper sx={{ p: 2 }}>
                  <Typography color="text.secondary" variant="caption">
                    {stat.label}
                  </Typography>
                  <Typography variant="h5">{stat.value}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Typography variant="h6" sx={{ mb: 2 }}>
            Available Reports
          </Typography>
          <Grid container spacing={3}>
            {reportTypes.map((report) => (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={report.title}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 48,
                          height: 48,
                          borderRadius: '12px',
                          backgroundColor: `${report.color}20`,
                          mr: 2,
                        }}
                      >
                        <report.icon sx={{ color: report.color }} />
                      </Box>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6">{report.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {report.description}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        Last generated: {report.lastGenerated}
                      </Typography>
                      <Button
                        size="small"
                        startIcon={
                          generatingReport === report.title ? (
                            <CircularProgress size={16} />
                          ) : (
                            <DownloadIcon />
                          )
                        }
                        sx={{ color: report.color }}
                        onClick={() => handleGenerateReport(report.title)}
                        disabled={generatingReport !== null}
                      >
                        {generatingReport === report.title ? 'Generating...' : 'Generate'}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Card sx={{ mt: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              <List>
                <ListItemText
                  primary="Monthly Revenue Report generated"
                  secondary="Generated by Sarah Johnson - 2 hours ago"
                />
                <Divider />
                <ListItemText
                  primary="Crew Productivity Report exported"
                  secondary="Exported by Mike Davis - Yesterday at 4:30 PM"
                />
                <Divider />
                <ListItemText
                  primary="Customer Satisfaction Report created"
                  secondary="Created by Admin - 3 days ago"
                />
              </List>
            </CardContent>
          </Card>

          <Snackbar
            open={snackbar.open}
            autoHideDuration={6000}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert
              onClose={() => setSnackbar({ ...snackbar, open: false })}
              severity={snackbar.severity}
              sx={{ width: '100%' }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
      </ResponsiveContainer>
    </ResponsiveLayout>
  )
}