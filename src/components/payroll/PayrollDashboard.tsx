'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tab,
  Tabs,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Stack,
  Divider
} from '@mui/material'
import {
  Download as DownloadIcon,
  Visibility as ViewIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Assessment as ReportIcon,
  Schedule as PeriodIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon
} from '@mui/icons-material'

interface PayrollPeriod {
  id: string
  startDate: string
  endDate: string
  periodType: string
  description: string
  isActive: boolean
  status: string
  timeEntryCount: number
  totalHours: number
  totalPay: number
  employeeCount: number
  isCurrentPeriod: boolean
}

interface PayrollSummary {
  totalEmployees: number
  totalHours: number
  totalPay: number
  totalOvertimeHours: number
  averageHoursPerEmployee: number
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`payroll-tabpanel-${index}`}
      aria-labelledby={`payroll-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

export default function PayrollDashboard() {
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Payroll periods
  const [periods, setPeriods] = useState<PayrollPeriod[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null)
  
  // Export settings
  const [exportDialog, setExportDialog] = useState(false)
  const [exportFormat, setExportFormat] = useState('json')
  const [groupBy, setGroupBy] = useState('employee')
  
  // Report settings
  const [reportDialog, setReportDialog] = useState(false)
  const [reportType, setReportType] = useState('PAYROLL_SUMMARY')
  
  // Filter settings
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // Data
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary | null>(null)
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([])

  useEffect(() => {
    // Set default date range to current month
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    setStartDate(firstDay.toISOString().split('T')[0])
    setEndDate(lastDay.toISOString().split('T')[0])
    
    fetchPayrollPeriods()
    fetchPendingApprovals()
  }, [])

  const fetchPayrollPeriods = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/time-tracking/payroll/periods')
      const data = await response.json()
      
      if (data.success) {
        setPeriods(data.data)
        // Set current period as selected if exists
        const currentPeriod = data.data.find((p: PayrollPeriod) => p.isCurrentPeriod)
        if (currentPeriod) {
          setSelectedPeriod(currentPeriod)
        }
      }
    } catch (err) {
      setError('Failed to load payroll periods')
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingApprovals = async () => {
    try {
      const response = await fetch('/api/time-tracking/payroll/approval?status=SUBMITTED')
      const data = await response.json()
      
      if (data.success) {
        setPendingApprovals(data.data)
      }
    } catch (err) {
      console.error('Failed to load pending approvals:', err)
    }
  }

  const generatePayrollExport = async () => {
    try {
      setLoading(true)
      
      const exportData = {
        startDate,
        endDate,
        format: exportFormat,
        groupBy,
        includeBreaks: true
      }
      
      const response = await fetch('/api/time-tracking/payroll/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData)
      })
      
      if (exportFormat === 'csv') {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `payroll-export-${startDate}-to-${endDate}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      } else {
        const data = await response.json()
        setPayrollSummary(data.summary)
        console.log('Export data:', data)
      }
      
      setExportDialog(false)
    } catch (err) {
      setError('Failed to generate export')
    } finally {
      setLoading(false)
    }
  }

  const generateReport = async () => {
    try {
      setLoading(true)
      
      const reportData = {
        reportType,
        startDate,
        endDate,
        includeBreaks: true
      }
      
      const response = await fetch('/api/time-tracking/payroll/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      })
      
      const data = await response.json()
      console.log('Report data:', data)
      
      setReportDialog(false)
    } catch (err) {
      setError('Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  const approveTimeEntries = async (timeEntryIds: string[], action: 'APPROVE' | 'REJECT') => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/time-tracking/payroll/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeEntryIds,
          action,
          approvedBy: 'current-user-id' // Replace with actual user ID
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        fetchPendingApprovals() // Refresh the list
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to process approval')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'primary'
      case 'CLOSED': return 'default'
      case 'PROCESSING': return 'warning'
      default: return 'default'
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Payroll Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Quick Actions */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => setExportDialog(true)}
          >
            Export Payroll
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="outlined"
            startIcon={<ReportIcon />}
            onClick={() => setReportDialog(true)}
          >
            Generate Report
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="outlined"
            startIcon={<PeriodIcon />}
            onClick={fetchPayrollPeriods}
          >
            Manage Periods
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              fetchPayrollPeriods()
              fetchPendingApprovals()
            }}
          >
            Refresh
          </Button>
        </Grid>
      </Grid>

      {/* Summary Cards */}
      {payrollSummary && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Employees
                </Typography>
                <Typography variant="h4">
                  {payrollSummary.totalEmployees}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Hours
                </Typography>
                <Typography variant="h4">
                  {payrollSummary.totalHours.toFixed(1)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Pay
                </Typography>
                <Typography variant="h4" color="success.main">
                  ${payrollSummary.totalPay.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Overtime Hours
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {payrollSummary.totalOvertimeHours.toFixed(1)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Payroll Periods" />
          <Tab label="Pending Approvals" />
          <Tab label="Reports" />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <TabPanel value={activeTab} index={0}>
        <Typography variant="h6" gutterBottom>
          Payroll Periods
        </Typography>
        
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Period</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Employees</TableCell>
                <TableCell align="right">Hours</TableCell>
                <TableCell align="right">Pay</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {periods.map((period) => (
                <TableRow key={period.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {period.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(period.startDate).toLocaleDateString()} - {new Date(period.endDate).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={period.periodType} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={period.status} 
                      size="small" 
                      color={getStatusColor(period.status)}
                    />
                    {period.isCurrentPeriod && (
                      <Chip label="Current" size="small" color="success" sx={{ ml: 1 }} />
                    )}
                  </TableCell>
                  <TableCell align="right">{period.employeeCount}</TableCell>
                  <TableCell align="right">{period.totalHours.toFixed(1)}</TableCell>
                  <TableCell align="right">${period.totalPay.toLocaleString()}</TableCell>
                  <TableCell align="center">
                    <IconButton size="small">
                      <ViewIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Typography variant="h6" gutterBottom>
          Pending Approvals
        </Typography>
        
        {pendingApprovals.length === 0 ? (
          <Alert severity="info">No time entries pending approval</Alert>
        ) : (
          pendingApprovals.map((employee) => (
            <Card key={employee.userId} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">{employee.employeeName}</Typography>
                  <Box>
                    <Button
                      size="small"
                      startIcon={<ApproveIcon />}
                      color="success"
                      onClick={() => approveTimeEntries(
                        employee.entries.map((e: any) => e.id), 
                        'APPROVE'
                      )}
                      sx={{ mr: 1 }}
                    >
                      Approve All
                    </Button>
                    <Button
                      size="small"
                      startIcon={<RejectIcon />}
                      color="error"
                      onClick={() => approveTimeEntries(
                        employee.entries.map((e: any) => e.id), 
                        'REJECT'
                      )}
                    >
                      Reject All
                    </Button>
                  </Box>
                </Box>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {employee.totalEntries} entries • {employee.totalHours.toFixed(1)} hours • ${employee.totalPay.toFixed(2)}
                  {employee.flaggedEntries > 0 && (
                    <Chip 
                      label={`${employee.flaggedEntries} flagged`} 
                      size="small" 
                      color="warning" 
                      sx={{ ml: 1 }} 
                    />
                  )}
                </Typography>
              </CardContent>
            </Card>
          ))
        )}
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <Typography variant="h6" gutterBottom>
          Reports & Analytics
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Payroll Summary
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Complete payroll summary with totals by employee
                </Typography>
                <Button variant="outlined" fullWidth>
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Overtime Analysis
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Detailed overtime hours and cost analysis
                </Typography>
                <Button variant="outlined" fullWidth>
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Break Analysis
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Break patterns and compliance tracking
                </Typography>
                <Button variant="outlined" fullWidth>
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Export Dialog */}
      <Dialog open={exportDialog} onClose={() => setExportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Export Payroll Data</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <FormControl fullWidth>
              <InputLabel>Export Format</InputLabel>
              <Select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)} label="Export Format">
                <MenuItem value="json">JSON (Preview)</MenuItem>
                <MenuItem value="csv">CSV (Download)</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Group By</InputLabel>
              <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} label="Group By">
                <MenuItem value="employee">Employee</MenuItem>
                <MenuItem value="job">Job</MenuItem>
                <MenuItem value="date">Date</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={generatePayrollExport} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Export'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={reportDialog} onClose={() => setReportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generate Report</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Report Type</InputLabel>
              <Select value={reportType} onChange={(e) => setReportType(e.target.value)} label="Report Type">
                <MenuItem value="PAYROLL_SUMMARY">Payroll Summary</MenuItem>
                <MenuItem value="EMPLOYEE_DETAIL">Employee Detail</MenuItem>
                <MenuItem value="OVERTIME_ANALYSIS">Overtime Analysis</MenuItem>
                <MenuItem value="BREAK_ANALYSIS">Break Analysis</MenuItem>
                <MenuItem value="JOB_COST_ANALYSIS">Job Cost Analysis</MenuItem>
                <MenuItem value="PRODUCTIVITY_METRICS">Productivity Metrics</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={generateReport} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Generate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}