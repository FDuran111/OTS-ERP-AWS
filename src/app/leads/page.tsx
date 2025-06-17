'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Chip,
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
  Button,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Stack,
  Badge,
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
  Add as AddIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  TrendingUp as LeadsIcon,
  Warning as WarningIcon,
  AttachMoney,
} from '@mui/icons-material'

const drawerWidth = 240

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface Lead {
  id: string
  firstName: string
  lastName: string
  companyName?: string
  email?: string
  phone?: string
  status: string
  source?: string
  estimatedValue?: number
  priority?: string
  description?: string
  lastContactDate?: string
  nextFollowUpDate?: string
  assignedUser?: {
    id: string
    name: string
    email: string
  }
  daysSinceLastContact?: number
  overdue?: boolean
  activities?: any[]
  estimates?: any[]
}

const leadStages = [
  { key: 'COLD_LEAD', label: 'Cold Leads', color: '#f5f5f5' },
  { key: 'WARM_LEAD', label: 'Warm Leads', color: '#f8f8f8' },
  { key: 'ESTIMATE_REQUESTED', label: 'Estimate Requested', color: '#f5f5f5' },
  { key: 'ESTIMATE_SENT', label: 'Estimate Sent', color: '#f8f8f8' },
  { key: 'ESTIMATE_APPROVED', label: 'Approved', color: '#f5f5f5' },
  { key: 'JOB_SCHEDULED', label: 'Job Scheduled', color: '#f8f8f8' },
  { key: 'FOLLOW_UP_REQUIRED', label: 'Follow-up Required', color: '#f5f5f5' },
  { key: 'LOST', label: 'Lost', color: '#f8f8f8' },
]

const menuItems = [
  { text: 'Dashboard', icon: DashboardIcon, path: '/dashboard' },
  { text: 'Jobs', icon: WorkIcon, path: '/jobs' },
  { text: 'Schedule', icon: ScheduleIcon, path: '/schedule' },
  { text: 'Time Tracking', icon: TimeIcon, path: '/time' },
  { text: 'Customers', icon: PeopleIcon, path: '/customers' },
  { text: 'Leads', icon: LeadsIcon, path: '/leads' },
  { text: 'Materials', icon: InventoryIcon, path: '/materials' },
  { text: 'Invoicing', icon: ReceiptIcon, path: '/invoicing' },
  { text: 'Reports', icon: AssessmentIcon, path: '/reports' },
  { text: 'Settings', icon: SettingsIcon, path: '/settings' },
]

export default function LeadsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [leadsByStatus, setLeadsByStatus] = useState<Record<string, Lead[]>>({})
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/login')
      return
    }
    setUser(JSON.parse(storedUser))
    fetchLeads()
  }, [router])

  const fetchLeads = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/leads')
      if (!response.ok) {
        throw new Error('Failed to fetch leads')
      }
      const data = await response.json()
      setLeads(data.leads)
      setLeadsByStatus(data.leadsByStatus)
      setStatusCounts(data.statusCounts)
      setError(null)
    } catch (error) {
      console.error('Error fetching leads:', error)
      setError('Failed to load leads')
    } finally {
      setLoading(false)
    }
  }

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

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'HIGH':
        return 'error'
      case 'MEDIUM':
        return 'warning'
      case 'LOW':
        return 'info'
      default:
        return 'default'
    }
  }

  const formatCurrency = (amount?: number) => {
    return amount ? `$${amount.toLocaleString()}` : 'TBD'
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
            selected={item.path === '/leads'}
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
            Lead Pipeline
          </Typography>
          <Button
            color="inherit"
            startIcon={<AddIcon />}
            sx={{ mr: 2 }}
          >
            Add Lead
          </Button>
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
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Stack direction="row" spacing={3} sx={{ minWidth: 'max-content', pb: 2 }}>
                {leadStages.map((stage) => (
                  <Paper
                    key={stage.key}
                    sx={{
                      minWidth: 320,
                      maxWidth: 320,
                      backgroundColor: stage.color,
                      border: '1px solid #ddd',
                      borderRadius: 2,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    }}
                  >
                    <Box sx={{ 
                      p: 3, 
                      borderBottom: '1px solid #ddd',
                      backgroundColor: 'white',
                      borderTopLeftRadius: 8,
                      borderTopRightRadius: 8,
                    }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography variant="h6" fontWeight="600" color="text.primary">
                          {stage.label}
                        </Typography>
                        <Badge 
                          badgeContent={statusCounts[stage.key] || 0} 
                          color="primary"
                          sx={{
                            '& .MuiBadge-badge': {
                              fontSize: '0.75rem',
                              fontWeight: 'bold'
                            }
                          }}
                        />
                      </Stack>
                    </Box>
                    <Box sx={{ p: 2, maxHeight: 600, overflowY: 'auto' }}>
                      {(leadsByStatus[stage.key] || []).map((lead) => (
                        <Card
                          key={lead.id}
                          sx={{
                            mb: 2,
                            cursor: 'pointer',
                            backgroundColor: 'white',
                            border: lead.overdue ? '2px solid #f44336' : '1px solid #e0e0e0',
                            borderRadius: 2,
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                              transform: 'translateY(-2px)',
                            },
                          }}
                        >
                          <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                            <Stack spacing={2}>
                              {/* Header with name and priority */}
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Typography variant="h6" fontWeight="600" color="text.primary">
                                  {lead.companyName || `${lead.firstName} ${lead.lastName}`}
                                </Typography>
                                {lead.priority && (
                                  <Chip
                                    label={lead.priority}
                                    size="small"
                                    color={getPriorityColor(lead.priority) as any}
                                    sx={{ fontWeight: 'medium' }}
                                  />
                                )}
                              </Box>
                              
                              {/* Description */}
                              {lead.description && (
                                <Typography 
                                  variant="body2" 
                                  color="text.primary"
                                  sx={{ 
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {lead.description}
                                </Typography>
                              )}
                              
                              {/* Estimated Value */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <AttachMoney sx={{ fontSize: 18, color: 'success.main' }} />
                                <Typography variant="body1" fontWeight="medium" color="success.main">
                                  {formatCurrency(lead.estimatedValue)}
                                </Typography>
                              </Box>
                              
                              {/* Contact Information */}
                              {lead.phone && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <PhoneIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                                  <Typography variant="body2" color="text.primary">
                                    {lead.phone}
                                  </Typography>
                                </Box>
                              )}
                              
                              {lead.email && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <EmailIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                                  <Typography variant="body2" color="text.primary">
                                    {lead.email}
                                  </Typography>
                                </Box>
                              )}
                              
                              {/* Assigned User */}
                              {lead.assignedUser && (
                                <Chip
                                  label={`Assigned: ${lead.assignedUser.name}`}
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                  sx={{ alignSelf: 'flex-start' }}
                                />
                              )}
                              
                              {/* Last Contact Warning */}
                              {lead.daysSinceLastContact !== null && (
                                <Box 
                                  sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 1,
                                    p: 1,
                                    borderRadius: 1,
                                    backgroundColor: lead.overdue ? 'error.main' : 'grey.100',
                                    color: lead.overdue ? 'white' : 'text.primary',
                                  }}
                                >
                                  {lead.overdue && <WarningIcon sx={{ fontSize: 16 }} />}
                                  <Typography 
                                    variant="caption" 
                                    fontWeight="medium"
                                  >
                                    Last contact: {lead.daysSinceLastContact} days ago
                                  </Typography>
                                </Box>
                              )}
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
                      {(!leadsByStatus[stage.key] || leadsByStatus[stage.key].length === 0) && (
                        <Box sx={{ 
                          textAlign: 'center', 
                          py: 4,
                          backgroundColor: 'white',
                          borderRadius: 1,
                          border: '1px dashed #ddd'
                        }}>
                          <Typography color="text.secondary" variant="body2" fontWeight="medium">
                            No leads in this stage
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                ))}
              </Stack>
            </Box>
          )}
        </Container>
      </Box>
    </Box>
  )
}