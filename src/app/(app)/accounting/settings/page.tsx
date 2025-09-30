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
  Paper,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Divider,
  Card,
  CardContent,
  Grid,
} from '@mui/material'
import {
  Settings as SettingsIcon,
  Save as SaveIcon,
} from '@mui/icons-material'

interface AccountingSettings {
  id: string
  periodFrequency: string
  fiscalYearStartMonth: number
  defaultCurrency: string
  enableMultiCurrency: boolean
  retainedEarningsAccountId?: string
  currentPeriodId?: string
  autoCreatePeriods: boolean
  requireApproval: boolean
  enableBudgets: boolean
}

interface Account {
  id: string
  code: string
  name: string
  accountType: string
}

const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

export default function AccountingSettingsPage() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<AccountingSettings | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    periodFrequency: 'MONTHLY',
    fiscalYearStartMonth: 1,
    defaultCurrency: 'USD',
    enableMultiCurrency: false,
    retainedEarningsAccountId: '',
    autoCreatePeriods: true,
    requireApproval: false,
    enableBudgets: false,
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [settingsRes, accountsRes] = await Promise.all([
        fetch('/api/accounting/settings'),
        fetch('/api/accounting/accounts'),
      ])

      if (!settingsRes.ok) throw new Error('Failed to fetch settings')
      if (!accountsRes.ok) throw new Error('Failed to fetch accounts')

      const settingsData = await settingsRes.json()
      const accountsData = await accountsRes.json()

      setSettings(settingsData.settings)
      setAccounts(accountsData.accounts.filter((a: Account) => a.accountType === 'EQUITY'))

      setFormData({
        periodFrequency: settingsData.settings.periodFrequency || 'MONTHLY',
        fiscalYearStartMonth: settingsData.settings.fiscalYearStartMonth || 1,
        defaultCurrency: settingsData.settings.defaultCurrency || 'USD',
        enableMultiCurrency: settingsData.settings.enableMultiCurrency || false,
        retainedEarningsAccountId: settingsData.settings.retainedEarningsAccountId || '',
        autoCreatePeriods: settingsData.settings.autoCreatePeriods !== false,
        requireApproval: settingsData.settings.requireApproval || false,
        enableBudgets: settingsData.settings.enableBudgets || false,
      })

      setError(null)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load accounting settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const response = await fetch('/api/accounting/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update settings')
      }

      const data = await response.json()
      setSettings(data.settings)
      setSuccess('Settings saved successfully!')
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <ResponsiveLayout user={user}>
        <ResponsiveContainer>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        </ResponsiveContainer>
      </ResponsiveLayout>
    )
  }

  return (
    <ResponsiveLayout user={user}>
      <ResponsiveContainer>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <SettingsIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h4" fontWeight="bold">
              Accounting Settings
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* General Settings */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  General Settings
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Stack spacing={3}>
                  <FormControl fullWidth>
                    <InputLabel>Period Frequency</InputLabel>
                    <Select
                      value={formData.periodFrequency}
                      label="Period Frequency"
                      onChange={(e) => handleFieldChange('periodFrequency', e.target.value)}
                    >
                      <MenuItem value="MONTHLY">Monthly</MenuItem>
                      <MenuItem value="QUARTERLY">Quarterly</MenuItem>
                      <MenuItem value="SEMI_ANNUALLY">Semi-Annually</MenuItem>
                      <MenuItem value="YEARLY">Yearly</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>Fiscal Year Start Month</InputLabel>
                    <Select
                      value={formData.fiscalYearStartMonth}
                      label="Fiscal Year Start Month"
                      onChange={(e) => handleFieldChange('fiscalYearStartMonth', e.target.value)}
                    >
                      {MONTH_OPTIONS.map(month => (
                        <MenuItem key={month.value} value={month.value}>
                          {month.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    label="Default Currency"
                    value={formData.defaultCurrency}
                    onChange={(e) => handleFieldChange('defaultCurrency', e.target.value)}
                    fullWidth
                    helperText="3-letter currency code (e.g., USD, EUR, GBP)"
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Account Settings */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Account Configuration
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Stack spacing={3}>
                  <FormControl fullWidth>
                    <InputLabel>Retained Earnings Account</InputLabel>
                    <Select
                      value={formData.retainedEarningsAccountId}
                      label="Retained Earnings Account"
                      onChange={(e) => handleFieldChange('retainedEarningsAccountId', e.target.value)}
                    >
                      <MenuItem value="">
                        <em>None selected</em>
                      </MenuItem>
                      {accounts.map(account => (
                        <MenuItem key={account.id} value={account.id}>
                          {account.code} - {account.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Feature Toggles */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Features
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Stack spacing={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.autoCreatePeriods}
                        onChange={(e) => handleFieldChange('autoCreatePeriods', e.target.checked)}
                      />
                    }
                    label="Auto-create accounting periods"
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 4, mt: -1 }}>
                    Automatically create new periods when current period is closed
                  </Typography>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.requireApproval}
                        onChange={(e) => handleFieldChange('requireApproval', e.target.checked)}
                      />
                    }
                    label="Require approval before posting"
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 4, mt: -1 }}>
                    Journal entries must be approved before they can be posted
                  </Typography>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.enableMultiCurrency}
                        onChange={(e) => handleFieldChange('enableMultiCurrency', e.target.checked)}
                      />
                    }
                    label="Enable multi-currency support"
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 4, mt: -1 }}>
                    Allow transactions in multiple currencies with exchange rates
                  </Typography>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.enableBudgets}
                        onChange={(e) => handleFieldChange('enableBudgets', e.target.checked)}
                      />
                    }
                    label="Enable budget tracking"
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 4, mt: -1 }}>
                    Track budgets vs actuals for accounts and periods
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* System Information */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  System Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {settings && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">
                        Settings ID
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {settings.id}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">
                        Current Period
                      </Typography>
                      <Typography variant="body2">
                        {settings.currentPeriodId || 'No active period'}
                      </Typography>
                    </Grid>
                  </Grid>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Save button at bottom */}
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <CircularProgress size={24} /> : 'Save Settings'}
          </Button>
        </Box>
      </ResponsiveContainer>
    </ResponsiveLayout>
  )
}
