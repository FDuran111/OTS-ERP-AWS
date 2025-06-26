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
  IconButton,
  AppBar,
  Toolbar,
  Drawer,
  ListItemIcon,
  ListItemButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  List,
  ListItemText,
  Switch,
  Button,
  TextField,
  FormControlLabel,
  Tabs,
  Tab,
  Grid,
  Alert,
  Snackbar,
  CircularProgress,
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
  Business,
  Notifications,
  Security,
  Palette,
  Save,
  TrendingUp,
} from '@mui/icons-material'

const drawerWidth = 240

interface User {
  id: string
  email: string
  name: string
  role: string
}

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
  current_password: z.string().optional(),
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
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

const menuItems = [
  { text: 'Dashboard', icon: DashboardIcon, path: '/dashboard' },
  { text: 'Jobs', icon: WorkIcon, path: '/jobs' },
  { text: 'Schedule', icon: ScheduleIcon, path: '/schedule' },
  { text: 'Time Tracking', icon: TimeIcon, path: '/time' },
  { text: 'Customers', icon: PeopleIcon, path: '/customers' },
  { text: 'Leads', icon: TrendingUp, path: '/leads' },
  { text: 'Materials', icon: InventoryIcon, path: '/materials' },
  { text: 'Invoicing', icon: ReceiptIcon, path: '/invoicing' },
  { text: 'Reports', icon: AssessmentIcon, path: '/reports' },
  { text: 'Settings', icon: SettingsIcon, path: '/settings' },
]

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [tabValue, setTabValue] = useState(0)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

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
  const [darkMode, setDarkMode] = useState(true)
  const [showJobNumbers, setShowJobNumbers] = useState(true)
  const [compactView, setCompactView] = useState(true)
  const [showTooltips, setShowTooltips] = useState(false)

  // Form setup
  const companyForm = useForm<CompanySettings>({
    resolver: zodResolver(CompanySettingsSchema),
    defaultValues: {
      company_name: 'Ortmeier Technicians',
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
          company_name: settings.company.company_name || 'Ortmeier Technicians',
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
      
      // Update appearance settings
      if (settings.appearance) {
        setDarkMode(settings.appearance.dark_mode ?? true)
        setShowJobNumbers(settings.appearance.show_job_numbers ?? true)
        setCompactView(settings.appearance.compact_view ?? true)
        setShowTooltips(settings.appearance.show_tooltips ?? false)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      setMessage({ type: 'error', text: 'Failed to load settings' })
    }
  }

  // Save settings to API
  const saveSettings = async (type: 'company' | 'notifications' | 'security' | 'appearance', data: any) => {
    setLoading(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, data }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save settings')
      }
      
      setMessage({ type: 'success', text: 'Settings saved successfully!' })
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save settings' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/login')
      return
    }
    setUser(JSON.parse(storedUser))
    loadSettings()
  }, [router])

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    localStorage.removeItem('user')
    router.push('/login')
  }

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

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
    
    await saveSettings('security', securityData)
    
    // Clear password fields after successful submission
    if (data.new_password) {
      securityForm.reset({
        current_password: '',
        new_password: '',
        confirm_password: '',
      })
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

  const handleAppearanceSave = async () => {
    const appearanceData = {
      dark_mode: darkMode,
      show_job_numbers: showJobNumbers,
      compact_view: compactView,
      show_tooltips: showTooltips,
    }
    await saveSettings('appearance', appearanceData)
  }

  if (!user) return null

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ px: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 300 }}>
          Ortmeier Tech
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ flexGrow: 1 }}>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.text}
            onClick={() => router.push(item.path)}
            selected={item.path === '/settings'}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(225, 78, 202, 0.08)',
              },
              '&.Mui-selected': {
                backgroundColor: 'rgba(225, 78, 202, 0.12)',
              },
            }}
          >
            <ListItemIcon>
              <item.icon sx={{ color: 'text.secondary' }} />
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItemButton>
        ))}
      </List>
      <Divider />
      <List>
        <ListItemButton onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon sx={{ color: 'text.secondary' }} />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Settings
          </Typography>
          <IconButton onClick={handleMenuClick}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {user.name.charAt(0)}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem>
              <Typography variant="body2">{user.name}</Typography>
            </MenuItem>
            <MenuItem>
              <Typography variant="caption" color="text.secondary">
                {user.role}
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
        }}
      >
        <Container maxWidth="xl">
          <Typography variant="h4" sx={{ mb: 4 }}>
            Settings
          </Typography>

          <Card>
            <CardContent>
              <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tab icon={<Business />} label="Company" />
                <Tab icon={<Notifications />} label="Notifications" />
                <Tab icon={<Security />} label="Security" />
                <Tab icon={<Palette />} label="Appearance" />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                <form onSubmit={companyForm.handleSubmit(onCompanySubmit)}>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
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
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
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
                    </Grid>
                    <Grid size={{ xs: 12 }}>
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
                    </Grid>
                  </Grid>
                </form>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
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

                <Divider sx={{ my: 3 }} />
                
                <Typography variant="h6" gutterBottom>
                  Notification Types
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
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
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
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
                  </Grid>
                </Grid>

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

              <TabPanel value={tabValue} index={2}>
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

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom>
                  Change Password
                </Typography>
                <form onSubmit={securityForm.handleSubmit(onSecuritySubmit)}>
                  <Grid container spacing={2} sx={{ maxWidth: 600 }}>
                    <Grid size={{ xs: 12 }}>
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
                    </Grid>
                    <Grid size={{ xs: 12 }}>
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
                    </Grid>
                    <Grid size={{ xs: 12 }}>
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
                    </Grid>
                  </Grid>

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

              <TabPanel value={tabValue} index={3}>
                <Typography variant="h6" gutterBottom>
                  Appearance Settings
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={darkMode}
                      onChange={(e) => setDarkMode(e.target.checked)}
                    />
                  }
                  label="Dark Mode"
                />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 3 }}>
                  Use dark theme for better visibility in low light conditions
                </Typography>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom>
                  Display Options
                </Typography>
                <FormControlLabel 
                  control={
                    <Switch 
                      checked={showJobNumbers}
                      onChange={(e) => setShowJobNumbers(e.target.checked)}
                    />
                  } 
                  label="Show job numbers in lists" 
                />
                <FormControlLabel 
                  control={
                    <Switch 
                      checked={compactView}
                      onChange={(e) => setCompactView(e.target.checked)}
                    />
                  } 
                  label="Compact view for tables" 
                />
                <FormControlLabel 
                  control={
                    <Switch 
                      checked={showTooltips}
                      onChange={(e) => setShowTooltips(e.target.checked)}
                    />
                  } 
                  label="Show tooltips" 
                />

                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                  disabled={loading}
                  onClick={handleAppearanceSave}
                  sx={{
                    mt: 3,
                    backgroundColor: '#e14eca',
                    '&:hover': {
                      backgroundColor: '#d236b8',
                    },
                  }}
                >
                  Save Appearance Settings
                </Button>
              </TabPanel>
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
    </Box>
  )
}