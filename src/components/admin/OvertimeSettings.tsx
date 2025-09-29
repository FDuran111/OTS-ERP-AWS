'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  Alert,
  Box,
  Divider,
  IconButton,
  Tooltip,
  Paper,
  Tabs,
  Tab,
} from '@mui/material'
import {
  Settings as SettingsIcon,
  Info as InfoIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material'
import EmployeePayRates from './EmployeePayRates'

interface OvertimeSettingsData {
  useDailyOT: boolean  // Toggle for daily OT rules
  useWeeklyOT: boolean // Toggle for weekly OT rules
  dailyOTThreshold: number
  weeklyOTThreshold: number
  dailyDTThreshold: number
  weeklyDTThreshold: number
  otMultiplier: number
  dtMultiplier: number
  seventhDayOT: boolean
  seventhDayDT: boolean
  roundingInterval: number
  roundingType: 'nearest' | 'up' | 'down'
  breakRules: {
    autoDeduct: boolean
    rules: any[]
  }
}

interface OvertimeSettingsProps {
  open?: boolean
  onClose?: () => void
  triggerButton?: boolean // If true, renders as a button that opens dialog
}

export default function OvertimeSettings({
  open: controlledOpen,
  onClose: controlledOnClose,
  triggerButton = false
}: OvertimeSettingsProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [currentTab, setCurrentTab] = useState(0)
  const [settings, setSettings] = useState<OvertimeSettingsData>({
    useDailyOT: false,  // Default to weekly only (Nebraska style)
    useWeeklyOT: true,  // Weekly is almost always used
    dailyOTThreshold: 8,
    weeklyOTThreshold: 40,
    dailyDTThreshold: 12,
    weeklyDTThreshold: 60,
    otMultiplier: 1.5,
    dtMultiplier: 2.0,
    seventhDayOT: false,
    seventhDayDT: false,
    roundingInterval: 15,
    roundingType: 'nearest',
    breakRules: { autoDeduct: false, rules: [] }
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const open = controlledOpen ?? internalOpen
  const handleClose = controlledOnClose ?? (() => setInternalOpen(false))
  const handleOpen = () => setInternalOpen(true)

  useEffect(() => {
    if (open) {
      fetchSettings()
    }
  }, [open])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/overtime-settings')
      if (response.ok) {
        const data = await response.json()
        // Ensure the new toggle fields have default values if not present
        setSettings({
          ...data,
          useDailyOT: data.useDailyOT ?? false,  // Default to false if undefined
          useWeeklyOT: data.useWeeklyOT ?? true,  // Default to true if undefined
        })
      }
    } catch (error) {
      console.error('Error fetching overtime settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSuccessMessage('')

    try {
      const response = await fetch('/api/overtime-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        setSuccessMessage('Settings saved successfully!')
        // Close immediately after successful save
        handleClose()
        // Reset success message after closing
        setTimeout(() => {
          setSuccessMessage('')
        }, 100)
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving overtime settings:', error)
      alert('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: keyof OvertimeSettingsData) => (
    event: React.ChangeEvent<HTMLInputElement | { value: unknown }>
  ) => {
    const value = event.target.value
    setSettings(prev => ({
      ...prev,
      [field]: typeof prev[field] === 'number' ? parseFloat(value as string) || 0 : value
    }))
  }

  const handleSwitchChange = (field: keyof OvertimeSettingsData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setSettings(prev => ({
      ...prev,
      [field]: event.target.checked
    }))
  }

  const dialogContent = (
    <>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon />
          <Typography variant="h6">Payroll Settings</Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
          <Tab
            icon={<ScheduleIcon />}
            label="Overtime Settings"
            iconPosition="start"
            sx={{ textTransform: 'none' }}
          />
          <Tab
            icon={<MoneyIcon />}
            label="Employee Pay Rates"
            iconPosition="start"
            sx={{ textTransform: 'none' }}
          />
        </Tabs>
      </Box>

      <DialogContent dividers>
        {currentTab === 0 ? (
          loading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>Loading settings...</Box>
          ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {successMessage && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {successMessage}
              </Alert>
            )}

            {/* Overtime Mode Selection */}
            <Paper elevation={1} sx={{ p: 2, bgcolor: 'background.paper' }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Overtime Calculation Mode
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.useDailyOT}
                        onChange={handleSwitchChange('useDailyOT')}
                        color="primary"
                      />
                    }
                    label="Use Daily Overtime Rules"
                  />
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                    Calculate OT/DT based on daily hours worked
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.useWeeklyOT}
                        onChange={handleSwitchChange('useWeeklyOT')}
                        color="primary"
                      />
                    }
                    label="Use Weekly Overtime Rules"
                  />
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                    Calculate OT/DT based on weekly hours worked
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Daily Overtime Settings */}
            <Paper elevation={1} sx={{ p: 2, bgcolor: 'background.paper', opacity: settings.useDailyOT ? 1 : 0.6 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Daily Overtime Rules {!settings.useDailyOT && "(Disabled)"}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Daily OT Threshold"
                    type="number"
                    value={settings.dailyOTThreshold}
                    onChange={handleChange('dailyOTThreshold')}
                    fullWidth
                    disabled={!settings.useDailyOT}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">hours</InputAdornment>,
                      inputProps: { min: 0, max: 24, step: 0.5 }
                    }}
                    helperText="Hours before overtime kicks in (standard: 8)"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Daily DT Threshold"
                    type="number"
                    value={settings.dailyDTThreshold}
                    onChange={handleChange('dailyDTThreshold')}
                    fullWidth
                    disabled={!settings.useDailyOT}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">hours</InputAdornment>,
                      inputProps: { min: 0, max: 24, step: 0.5 }
                    }}
                    helperText="Hours before double-time kicks in (standard: 12)"
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Weekly Overtime Settings */}
            <Paper elevation={1} sx={{ p: 2, bgcolor: 'background.paper', opacity: settings.useWeeklyOT ? 1 : 0.6 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Weekly Overtime Rules {!settings.useWeeklyOT && "(Disabled)"}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Weekly OT Threshold"
                    type="number"
                    value={settings.weeklyOTThreshold}
                    onChange={handleChange('weeklyOTThreshold')}
                    fullWidth
                    disabled={!settings.useWeeklyOT}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">hours</InputAdornment>,
                      inputProps: { min: 0, max: 168, step: 1 }
                    }}
                    helperText="Weekly hours before overtime (standard: 40)"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Weekly DT Threshold"
                    type="number"
                    value={settings.weeklyDTThreshold}
                    onChange={handleChange('weeklyDTThreshold')}
                    fullWidth
                    disabled={!settings.useWeeklyOT}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">hours</InputAdornment>,
                      inputProps: { min: 0, max: 168, step: 1 }
                    }}
                    helperText="Weekly hours before double-time (not common)"
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Pay Multipliers */}
            <Paper elevation={1} sx={{ p: 2, bgcolor: 'background.paper' }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Pay Multipliers
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Overtime Multiplier"
                    type="number"
                    value={settings.otMultiplier}
                    onChange={handleChange('otMultiplier')}
                    fullWidth
                    InputProps={{
                      endAdornment: <InputAdornment position="end">x</InputAdornment>,
                      inputProps: { min: 1, max: 3, step: 0.1 }
                    }}
                    helperText="Rate multiplier for overtime (standard: 1.5x)"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Double Time Multiplier"
                    type="number"
                    value={settings.dtMultiplier}
                    onChange={handleChange('dtMultiplier')}
                    fullWidth
                    InputProps={{
                      endAdornment: <InputAdornment position="end">x</InputAdornment>,
                      inputProps: { min: 1, max: 4, step: 0.1 }
                    }}
                    helperText="Rate multiplier for double-time (standard: 2.0x)"
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* 7th Day Rules (California) */}
            <Paper elevation={1} sx={{ p: 2, bgcolor: 'background.paper' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  7th Consecutive Day Rules
                </Typography>
                <Tooltip title="California labor law: Working 7 consecutive days triggers special overtime rules">
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.seventhDayOT}
                        onChange={handleSwitchChange('seventhDayOT')}
                      />
                    }
                    label="7th day is all overtime"
                    sx={{ mt: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                    First 8 hours on 7th consecutive day are OT minimum
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.seventhDayDT}
                        onChange={handleSwitchChange('seventhDayDT')}
                        disabled={!settings.seventhDayOT}
                      />
                    }
                    label="7th day DT after 8 hours"
                    sx={{ mt: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                    Hours over 8 on 7th day are double-time
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Time Rounding */}
            <Paper elevation={1} sx={{ p: 2, bgcolor: 'background.paper' }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Time Rounding Rules
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Rounding Interval</InputLabel>
                    <Select
                      value={settings.roundingInterval}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        roundingInterval: parseInt(e.target.value as string)
                      }))}
                      label="Rounding Interval"
                    >
                      <MenuItem value={0}>No rounding</MenuItem>
                      <MenuItem value={5}>5 minutes</MenuItem>
                      <MenuItem value={6}>6 minutes (1/10 hour)</MenuItem>
                      <MenuItem value={15}>15 minutes</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Rounding Type</InputLabel>
                    <Select
                      value={settings.roundingType}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        roundingType: e.target.value as 'nearest' | 'up' | 'down'
                      }))}
                      label="Rounding Type"
                    >
                      <MenuItem value="nearest">Nearest interval</MenuItem>
                      <MenuItem value="up">Always round up</MenuItem>
                      <MenuItem value="down">Always round down</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>

            {/* Example Calculation */}
            <Alert severity="info" icon={<InfoIcon />}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Example Calculation:
              </Typography>
              <Typography variant="body2">
                If an employee works 11 hours on Monday:
              </Typography>
              <Typography variant="body2" component="ul" sx={{ mt: 1 }}>
                <li>Regular: {settings.dailyOTThreshold} hours</li>
                <li>Overtime: {Math.min(settings.dailyDTThreshold - settings.dailyOTThreshold, 11 - settings.dailyOTThreshold)} hours @ {settings.otMultiplier}x pay</li>
                {11 > settings.dailyDTThreshold && (
                  <li>Double-time: {11 - settings.dailyDTThreshold} hours @ {settings.dtMultiplier}x pay</li>
                )}
              </Typography>
            </Alert>
          </Box>
          )
        ) : (
          <Box sx={{ p: 0, m: -3 }}>
            <EmployeePayRates />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {currentTab === 0 ? (
          <>
            <Button onClick={handleClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={saving || loading}
              startIcon={<SaveIcon />}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </>
        ) : (
          <Button onClick={handleClose}>
            Close
          </Button>
        )}
      </DialogActions>
    </>
  )

  if (triggerButton) {
    return (
      <>
        <Tooltip title="Configure Overtime Settings">
          <IconButton onClick={handleOpen} color="primary">
            <SettingsIcon />
          </IconButton>
        </Tooltip>
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
          {dialogContent}
        </Dialog>
      </>
    )
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      {dialogContent}
    </Dialog>
  )
}