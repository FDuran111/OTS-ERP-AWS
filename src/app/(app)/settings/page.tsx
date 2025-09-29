'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Switch,
  Button,
  TextField,
  FormControlLabel,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  CircularProgress,
  Divider,
} from '@mui/material'
import {
  Business,
  Notifications,
  Security,
  Save,
  Group as GroupIcon,
} from '@mui/icons-material'
import UserManagement from '@/components/settings/UserManagement'
import { useAuth } from '@/hooks/useAuth'
import ResponsiveLayout from '@/components/layout/ResponsiveLayout'

// Validation schemas
const CompanySettingsSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  business_address: z.string().optional(),
  phone_number: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  license_number: z.string().optional(),
  tax_id: z.string().optional(),
  default_hourly_rate: z.string().optional(),
  invoice_terms: z.string().optional(),
})

const SecuritySettingsSchema = z.object({
  current_password: z.string().optional().or(z.literal('')),
  new_password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  confirm_password: z.string().optional(),
}).refine((data) => {
  if (data.new_password && data.new_password !== data.confirm_password) {
    return false
  }
  return true
}, {
  message: "Passwords don't match",
  path: ["confirm_password"],
})

type CompanySettings = z.infer<typeof CompanySettingsSchema>
type SecuritySettings = z.infer<typeof SecuritySettingsSchema>

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  )
}


export default function SettingsPage() {
  const router = useRouter()
  const { user: authUser } = useAuth()
  const [tabValue, setTabValue] = useState(0)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Calculate tab indices based on user role
  const getTabIndex = (tabName: 'company' | 'notifications' | 'security' | 'appearance' | 'users') => {
    const isEmployee = authUser?.role === 'EMPLOYEE'
    
    if (tabName === 'company' && isEmployee) return -1 // Hidden for employees
    if (tabName === 'notifications') return isEmployee ? 0 : 1
    if (tabName === 'security') return isEmployee ? 1 : 2
    if (tabName === 'users') return authUser?.role === 'OWNER_ADMIN' ? 3 : -1
    
    return 0
  }

  // Settings state
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [smsNotifications, setSmsNotifications] = useState(false)
  const [newJobAssignments, setNewJobAssignments] = useState(true)
  const [scheduleChanges, setScheduleChanges] = useState(true)
  const [invoiceReminders, setInvoiceReminders] = useState(true)
  const [materialLowStockAlerts, setMaterialLowStockAlerts] = useState(false)
  const [customerMessages, setCustomerMessages] = useState(true)
  const [dailySummary, setDailySummary] = useState(false)
  const [twoFactorAuth, setTwoFactorAuth] = useState(false)

  // Form setup
  const companyForm = useForm<CompanySettings>({
    resolver: zodResolver(CompanySettingsSchema),
    defaultValues: {
      company_name: 'Ortmeier Technical Service',
      business_address: '123 Electric Ave, Anytown, ST 12345',
      phone_number: '(555) 123-4567',
      email: 'info@ortmeiertech.com',
      license_number: 'EC-123456',
      tax_id: '12-3456789',
      default_hourly_rate: '125.00',
      invoice_terms: 'Net 30',
    }
  })

  const securityForm = useForm<SecuritySettings>({
    resolver: zodResolver(SecuritySettingsSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    }
  })

  // Load settings from API
  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      if (!response.ok) {
        throw new Error('Failed to load settings')
      }
      const settings = await response.json()
      
      // Update company form
      if (settings.company) {
        companyForm.reset({
          company_name: settings.company.company_name || 'Ortmeier Technical Service',
          business_address: settings.company.business_address || '',
          phone_number: settings.company.phone_number || '',
          email: settings.company.email || '',
          license_number: settings.company.license_number || '',
          tax_id: settings.company.tax_id || '',
          default_hourly_rate: settings.company.default_hourly_rate?.toString() || '125.00',
          invoice_terms: settings.company.invoice_terms || 'Net 30',
        })
      }
      
      // Update notification settings
      if (settings.notifications) {
        setEmailNotifications(settings.notifications.email_notifications ?? true)
        setSmsNotifications(settings.notifications.sms_notifications ?? false)
        setNewJobAssignments(settings.notifications.new_job_assignments ?? true)
        setScheduleChanges(settings.notifications.schedule_changes ?? true)
        setInvoiceReminders(settings.notifications.invoice_reminders ?? true)
        setMaterialLowStockAlerts(settings.notifications.material_low_stock_alerts ?? false)
        setCustomerMessages(settings.notifications.customer_messages ?? true)
        setDailySummary(settings.notifications.daily_summary ?? false)
      }
      
      // Update security settings
      if (settings.security) {
        setTwoFactorAuth(settings.security.two_factor_auth ?? false)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      setMessage({ type: 'error', text: 'Failed to load settings' })
    }
  }

  // Save settings to API
  const saveSettings = async (type: 'company' | 'notifications' | 'security' | 'appearance', data: any) => {
    setLoading(true)
    console.log('Saving settings - Type:', type, 'Data:', data)
    try {
      const requestBody = { type, data }
      console.log('Request body being sent:', JSON.stringify(requestBody))
      
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save settings')
      }
      
      setMessage({ type: 'success', text: 'Settings saved successfully!' })
      return true // Return success
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save settings' })
      return false // Return failure
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authUser) {
      router.push('/login')
      return
    }
    loadSettings()
  }, [router, authUser])


  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  // Form submit handlers
  const onCompanySubmit = async (data: CompanySettings) => {
    const companyData = {
      ...data,
      default_hourly_rate: parseFloat(data.default_hourly_rate || '125.00'),
    }
    await saveSettings('company', companyData)
  }

  const onSecuritySubmit = async (data: SecuritySettings) => {
    console.log('Security form submitted:', data)
    
    if (data.new_password && !data.current_password) {
      setMessage({ type: 'error', text: 'Current password is required to change password' })
      return
    }
    
    const securityData = {
      two_factor_auth: twoFactorAuth,
      ...(data.new_password ? {
        current_password: data.current_password,
        new_password: data.new_password,
        confirm_password: data.confirm_password,
      } : {})
    }
    
    console.log('Sending security data:', securityData)
    
    const success = await saveSettings('security', securityData)
    
    // Only proceed if the save was successful
    if (success && data.new_password) {
      securityForm.reset({
        current_password: '',
        new_password: '',
        confirm_password: '',
      })
      
      // Show success message and redirect to login after password change
      setMessage({ type: 'success', text: 'Password changed successfully! Please login with your new password.' })
      
      // Wait a moment for the user to see the message, then redirect
      setTimeout(() => {
        // Clear auth token and redirect to login
        localStorage.removeItem('auth-token')
        localStorage.removeItem('user')
        router.push('/login')
      }, 2000)
    } else if (!success && data.new_password) {
      // Password change failed - likely due to incorrect current password
      console.error('Password change failed - check current password')
    }
  }

  const handleNotificationSave = async () => {
    const notificationData = {
      email_notifications: emailNotifications,
      sms_notifications: smsNotifications,
      new_job_assignments: newJobAssignments,
      schedule_changes: scheduleChanges,
      invoice_reminders: invoiceReminders,
      material_low_stock_alerts: materialLowStockAlerts,
      customer_messages: customerMessages,
      daily_summary: dailySummary,
    }
    await saveSettings('notifications', notificationData)
  }

  if (!authUser) return null

  return (
    <ResponsiveLayout>
      <Box sx={{ p: 2.5 }}>
        <Container maxWidth="xl">
          <Typography variant="h4" sx={{ mb: 4 }}>
            Settings
          </Typography>

          <Card sx={{
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              boxShadow: 3,
            },
          }}>
            <CardContent sx={{ p: 2.5 }}>
              <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                {(authUser?.role === 'OWNER_ADMIN' || authUser?.role === 'FOREMAN') && (
                  <Tab icon={<Business />} label="Company" />
                )}
                <Tab icon={<Notifications />} label="Notifications" />
                <Tab icon={<Security />} label="Security" />
                {authUser?.role === 'OWNER_ADMIN' && (
                  <Tab icon={<GroupIcon />} label="User Management" />
                )}
              </Tabs>

              {/* Company Settings - Only for OWNER_ADMIN and FOREMAN */}
              {(authUser?.role === 'OWNER_ADMIN' || authUser?.role === 'FOREMAN') && (
                <TabPanel value={tabValue} index={0}>
                <form onSubmit={companyForm.handleSubmit(onCompanySubmit)}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '300px' }}>
                      <Controller
                        name="company_name"
                        control={companyForm.control}
                        render={({ field, fieldState }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="Company Name"
                            margin="normal"
                            error={!!fieldState.error}
                            helperText={fieldState.error?.message}
                          />
                        )}
                      />
                      <Controller
                        name="business_address"
                        control={companyForm.control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="Business Address"
                            margin="normal"
                            multiline
                            rows={2}
                          />
                        )}
                      />
                      <Controller
                        name="phone_number"
                        control={companyForm.control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="Phone Number"
                            margin="normal"
                          />
                        )}
                      />
                      <Controller
                        name="email"
                        control={companyForm.control}
                        render={({ field, fieldState }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="Email"
                            margin="normal"
                            error={!!fieldState.error}
                            helperText={fieldState.error?.message}
                          />
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '300px' }}>
                      <Controller
                        name="license_number"
                        control={companyForm.control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="License Number"
                            margin="normal"
                          />
                        )}
                      />
                      <Controller
                        name="tax_id"
                        control={companyForm.control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="Tax ID"
                            margin="normal"
                          />
                        )}
                      />
                      <Controller
                        name="default_hourly_rate"
                        control={companyForm.control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="Default Hourly Rate"
                            margin="normal"
                          />
                        )}
                      />
                      <Controller
                        name="invoice_terms"
                        control={companyForm.control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="Invoice Terms"
                            margin="normal"
                          />
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 100%' }}>
                      <Button
                        type="submit"
                        variant="contained"
                        startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                        disabled={loading}
                        sx={{
                          mt: 2,
                          backgroundColor: '#e14eca',
                          '&:hover': {
                            backgroundColor: '#d236b8',
                          },
                        }}
                      >
                        Save Company Settings
                      </Button>
                    </Box>
                  </Box>
                </form>
                </TabPanel>
              )}

              {/* Notifications - Available to all users */}
              <TabPanel value={tabValue} index={getTabIndex('notifications')}>
                <Typography variant="h6" gutterBottom>
                  Notification Preferences
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={emailNotifications}
                      onChange={(e) => setEmailNotifications(e.target.checked)}
                    />
                  }
                  label="Email Notifications"
                />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
                  Receive email updates for new jobs, schedule changes, and invoices
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={smsNotifications}
                      onChange={(e) => setSmsNotifications(e.target.checked)}
                    />
                  }
                  label="SMS Notifications"
                />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
                  Get text messages for urgent updates and reminders
                </Typography>

                <Divider sx={{ my: 2 }} />
                
                <Typography variant="h6" gutterBottom>
                  Notification Types
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '300px' }}>
                    <FormControlLabel 
                      control={
                        <Switch 
                          checked={newJobAssignments}
                          onChange={(e) => setNewJobAssignments(e.target.checked)}
                        />
                      } 
                      label="New Job Assignments" 
                    />
                    <FormControlLabel 
                      control={
                        <Switch 
                          checked={scheduleChanges}
                          onChange={(e) => setScheduleChanges(e.target.checked)}
                        />
                      } 
                      label="Schedule Changes" 
                    />
                    <FormControlLabel 
                      control={
                        <Switch 
                          checked={invoiceReminders}
                          onChange={(e) => setInvoiceReminders(e.target.checked)}
                        />
                      } 
                      label="Invoice Reminders" 
                    />
                  </Box>
                  <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '300px' }}>
                    <FormControlLabel 
                      control={
                        <Switch 
                          checked={materialLowStockAlerts}
                          onChange={(e) => setMaterialLowStockAlerts(e.target.checked)}
                        />
                      } 
                      label="Material Low Stock Alerts" 
                    />
                    <FormControlLabel 
                      control={
                        <Switch 
                          checked={customerMessages}
                          onChange={(e) => setCustomerMessages(e.target.checked)}
                        />
                      } 
                      label="Customer Messages" 
                    />
                    <FormControlLabel 
                      control={
                        <Switch 
                          checked={dailySummary}
                          onChange={(e) => setDailySummary(e.target.checked)}
                        />
                      } 
                      label="Daily Summary" 
                    />
                  </Box>
                </Box>

                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                  disabled={loading}
                  onClick={handleNotificationSave}
                  sx={{
                    mt: 3,
                    backgroundColor: '#e14eca',
                    '&:hover': {
                      backgroundColor: '#d236b8',
                    },
                  }}
                >
                  Save Notification Settings
                </Button>
              </TabPanel>

              {/* Security - Available to all users */}
              <TabPanel value={tabValue} index={getTabIndex('security')}>
                <Typography variant="h6" gutterBottom>
                  Security Settings
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={twoFactorAuth}
                      onChange={(e) => setTwoFactorAuth(e.target.checked)}
                    />
                  }
                  label="Two-Factor Authentication"
                />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 3 }}>
                  Add an extra layer of security to your account
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Typography variant="h6" gutterBottom>
                  Change Password
                </Typography>
                <form onSubmit={securityForm.handleSubmit(onSecuritySubmit)}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, maxWidth: 600 }}>
                    <Box sx={{ flex: '1 1 100%' }}>
                      <Controller
                        name="current_password"
                        control={securityForm.control}
                        render={({ field, fieldState }) => (
                          <TextField
                            {...field}
                            fullWidth
                            type="password"
                            label="Current Password"
                            margin="normal"
                            error={!!fieldState.error}
                            helperText={fieldState.error?.message}
                          />
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 100%' }}>
                      <Controller
                        name="new_password"
                        control={securityForm.control}
                        render={({ field, fieldState }) => (
                          <TextField
                            {...field}
                            fullWidth
                            type="password"
                            label="New Password"
                            margin="normal"
                            error={!!fieldState.error}
                            helperText={fieldState.error?.message}
                          />
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 100%' }}>
                      <Controller
                        name="confirm_password"
                        control={securityForm.control}
                        render={({ field, fieldState }) => (
                          <TextField
                            {...field}
                            fullWidth
                            type="password"
                            label="Confirm New Password"
                            margin="normal"
                            error={!!fieldState.error}
                            helperText={fieldState.error?.message}
                          />
                        )}
                      />
                    </Box>
                  </Box>

                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                    disabled={loading}
                    sx={{
                      mt: 3,
                      backgroundColor: '#e14eca',
                      '&:hover': {
                        backgroundColor: '#d236b8',
                      },
                    }}
                  >
                    Update Password
                  </Button>
                </form>
              </TabPanel>

              {/* User Management - Only for OWNER_ADMIN */}
              {authUser?.role === 'OWNER_ADMIN' && (
                <TabPanel value={tabValue} index={getTabIndex('users')}>
                  <UserManagement />
                </TabPanel>
              )}
            </CardContent>
          </Card>
        </Container>
        
        {/* Notification Snackbar */}
        <Snackbar
          open={!!message}
          autoHideDuration={6000}
          onClose={() => setMessage(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={() => setMessage(null)} 
            severity={message?.type} 
            sx={{ width: '100%' }}
          >
            {message?.text}
          </Alert>
        </Snackbar>
      </Box>
    </ResponsiveLayout>
  )
}