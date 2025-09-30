'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import ResponsiveLayout from '@/components/layout/ResponsiveLayout'
import ResponsiveContainer from '@/components/layout/ResponsiveContainer'
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Grid,
  Divider,
  FormControlLabel,
  Checkbox,
} from '@mui/material'
import {
  Assessment as AssessmentIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material'
import { format } from 'date-fns'

interface TrialBalanceAccount {
  accountId: string
  code: string
  name: string
  accountType: string
  accountSubType?: string
  balanceType: string
  totalDebits: number
  totalCredits: number
  balance: number
}

interface TrialBalanceSummary {
  totalDebits: number
  totalCredits: number
  difference: number
  isBalanced: boolean
  byType: Array<{
    type: string
    totalDebits: number
    totalCredits: number
    balance: number
    accounts: TrialBalanceAccount[]
  }>
}

const accountTypeColors: Record<string, string> = {
  ASSET: 'success',
  LIABILITY: 'error',
  EQUITY: 'primary',
  REVENUE: 'info',
  COGS: 'warning',
  EXPENSE: 'secondary',
}

export default function TrialBalancePage() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<TrialBalanceAccount[]>([])
  const [summary, setSummary] = useState<TrialBalanceSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    accountType: 'ALL',
    includeZeroBalances: true,
  })

  useEffect(() => {
    fetchTrialBalance()
  }, [])

  const fetchTrialBalance = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.accountType !== 'ALL') params.append('accountType', filters.accountType)
      params.append('includeZeroBalances', filters.includeZeroBalances.toString())

      const headers: HeadersInit = {}
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`/api/accounting/trial-balance?${params}`, {
        credentials: 'include',
        headers
      })
      if (!response.ok) throw new Error('Failed to fetch trial balance')
      
      const data = await response.json()
      setAccounts(data.accounts)
      setSummary(data.summary)
      setError(null)
    } catch (err) {
      console.error('Error fetching trial balance:', err)
      setError('Failed to load trial balance')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (field: string, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const handleGenerateReport = () => {
    fetchTrialBalance()
  }

  const exportToCSV = () => {
    if (!accounts.length) return

    const headers = ['Account Code', 'Account Name', 'Type', 'Debits', 'Credits', 'Balance']
    const rows = accounts.map(acc => [
      acc.code,
      acc.name,
      acc.accountType,
      acc.totalDebits.toFixed(2),
      acc.totalCredits.toFixed(2),
      acc.balance.toFixed(2),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
      '',
      `Total,,${summary?.totalDebits.toFixed(2)},${summary?.totalCredits.toFixed(2)},`,
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trial-balance-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  return (
    <ResponsiveLayout user={user}>
      <ResponsiveContainer>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AssessmentIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h4" fontWeight="bold">
              Trial Balance
            </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={exportToCSV}
              disabled={!accounts.length}
            >
              Export CSV
            </Button>
          </Stack>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Report Filters</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Start Date"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="End Date"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Account Type</InputLabel>
                <Select
                  value={filters.accountType}
                  label="Account Type"
                  onChange={(e) => handleFilterChange('accountType', e.target.value)}
                >
                  <MenuItem value="ALL">All Types</MenuItem>
                  <MenuItem value="ASSET">Assets</MenuItem>
                  <MenuItem value="LIABILITY">Liabilities</MenuItem>
                  <MenuItem value="EQUITY">Equity</MenuItem>
                  <MenuItem value="REVENUE">Revenue</MenuItem>
                  <MenuItem value="COGS">Cost of Goods Sold</MenuItem>
                  <MenuItem value="EXPENSE">Expenses</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.includeZeroBalances}
                    onChange={(e) => handleFilterChange('includeZeroBalances', e.target.checked)}
                  />
                }
                label="Include Zero Balances"
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={handleGenerateReport}
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </Button>
          </Box>
        </Paper>

        {/* Summary Cards */}
        {summary && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    Total Debits
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="success.main">
                    ${summary.totalDebits.toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    Total Credits
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="error.main">
                    ${summary.totalCredits.toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    Difference
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color={summary.isBalanced ? 'success.main' : 'warning.main'}>
                    ${summary.difference.toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: summary.isBalanced ? 'success.light' : 'error.light' }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {summary.isBalanced ? '✓ Balanced' : '✗ Unbalanced'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Trial Balance Table */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Account Code</TableCell>
                  <TableCell>Account Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Debits</TableCell>
                  <TableCell align="right">Credits</TableCell>
                  <TableCell align="right">Balance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summary?.byType.map((typeGroup) => (
                  <React.Fragment key={typeGroup.type}>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell colSpan={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip 
                            label={typeGroup.type} 
                            color={accountTypeColors[typeGroup.type] as any} 
                            size="small" 
                          />
                          <Typography variant="body2" fontWeight="bold">
                            Subtotal: ${typeGroup.balance.toFixed(2)}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                    {typeGroup.accounts.map((account) => (
                      <TableRow key={account.accountId}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {account.code}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{account.name}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={account.balanceType}
                            variant="outlined"
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          ${account.totalDebits.toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          ${account.totalCredits.toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          <Typography 
                            variant="body2" 
                            fontWeight="bold"
                            color={account.balance >= 0 ? 'success.main' : 'error.main'}
                          >
                            ${account.balance.toFixed(2)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
                
                {summary && (
                  <>
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Divider sx={{ my: 1 }} />
                      </TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: 'primary.light' }}>
                      <TableCell colSpan={3}>
                        <Typography variant="h6" fontWeight="bold">
                          TOTALS
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="h6" fontWeight="bold">
                          ${summary.totalDebits.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="h6" fontWeight="bold">
                          ${summary.totalCredits.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="h6" fontWeight="bold" color={summary.isBalanced ? 'success.main' : 'error.main'}>
                          {summary.isBalanced ? 'BALANCED' : `DIFF: $${summary.difference.toFixed(2)}`}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </>
                )}
                
                {accounts.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No accounts found. Try adjusting your filters or create some journal entries first.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </ResponsiveContainer>
    </ResponsiveLayout>
  )
}
