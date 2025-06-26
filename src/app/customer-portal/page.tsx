'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  CircularProgress,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Paper,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Web as WebIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  Launch as LaunchIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material'

interface CustomerPortalUser {
  id: string
  customerId: string
  email: string
  firstName?: string
  lastName?: string
  isActive: boolean
  isEmailVerified: boolean
  lastLoginAt?: string
  createdAt: string
  customer: {
    companyName?: string
    firstName: string
    lastName: string
  }
}

interface CustomerPortalStats {
  totalUsers: number
  activeUsers: number
  totalLogins: number
  recentLogins: number
}

export default function CustomerPortalManagementPage() {
  const [users, setUsers] = useState<CustomerPortalUser[]>([])
  const [stats, setStats] = useState<CustomerPortalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      // For now, we'll show placeholder data since the API doesn't exist yet
      setStats({
        totalUsers: 1,
        activeUsers: 1,
        totalLogins: 5,
        recentLogins: 2
      })
      
      setUsers([
        {
          id: '1',
          customerId: 'cust-1',
          email: 'john@acmeconstruction.com',
          firstName: 'John',
          lastName: 'Smith',
          isActive: true,
          isEmailVerified: true,
          lastLoginAt: '2024-06-20T10:30:00Z',
          createdAt: '2024-06-15T09:00:00Z',
          customer: {
            companyName: 'Acme Construction Co.',
            firstName: 'John',
            lastName: 'Smith'
          }
        }
      ])
    } catch (error) {
      console.error('Error fetching customer portal data:', error)
      setError('Failed to load customer portal data')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={fetchData}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Customer Portal Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage customer portal access, users, and settings
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<LaunchIcon />}
            href="/customer-portal/login"
            target="_blank"
          >
            View Portal
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Add User
          </Button>
        </Stack>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        <Box sx={{ flex: '1 1 calc(25% - 24px)', minWidth: '250px' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="caption">
                    Total Users
                  </Typography>
                  <Typography variant="h4" color="primary.main">
                    {stats?.totalUsers || 0}
                  </Typography>
                  <Typography variant="caption">
                    customer accounts
                  </Typography>
                </Box>
                <PersonIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 calc(25% - 24px)', minWidth: '250px' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="caption">
                    Active Users
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {stats?.activeUsers || 0}
                  </Typography>
                  <Typography variant="caption">
                    verified accounts
                  </Typography>
                </Box>
                <SecurityIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 calc(25% - 24px)', minWidth: '250px' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="caption">
                    Total Logins
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {stats?.totalLogins || 0}
                  </Typography>
                  <Typography variant="caption">
                    all time
                  </Typography>
                </Box>
                <WebIcon sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 calc(25% - 24px)', minWidth: '250px' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="caption">
                    Recent Logins
                  </Typography>
                  <Typography variant="h4" color="info.main">
                    {stats?.recentLogins || 0}
                  </Typography>
                  <Typography variant="caption">
                    last 7 days
                  </Typography>
                </Box>
                <ViewIcon sx={{ fontSize: 40, color: 'info.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Customer Portal Users Table */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Customer Portal Users</Typography>
            <Typography variant="body2" color="text.secondary">
              {users.length} total users
            </Typography>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Customer</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Login</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {user.firstName} {user.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.customer.companyName || 'Individual Customer'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {user.email}
                        {user.isEmailVerified && (
                          <Chip
                            label="Verified"
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.isActive ? 'Active' : 'Inactive'}
                        color={user.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(user.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <IconButton size="small" title="Edit User">
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" title="Delete User" color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {users.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <PersonIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No customer portal users
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Create customer portal accounts to give clients access to their project information
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Add First User
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Feature Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 2 }}>
        <Box sx={{ flex: '1 1 calc(33.333% - 24px)', minWidth: '300px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Portal Features
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  • Real-time project status updates
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Invoice viewing and payment
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Progress photo galleries
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Message center with notifications
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Mobile-responsive design
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 calc(33.333% - 24px)', minWidth: '300px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Security & Access
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  • Secure JWT-based authentication
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Email verification required
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Password reset functionality
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Session management
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Role-based permissions
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 calc(33.333% - 24px)', minWidth: '300px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Stack spacing={1}>
                <Button variant="outlined" fullWidth startIcon={<LaunchIcon />}>
                  Test Customer Login
                </Button>
                <Button variant="outlined" fullWidth startIcon={<SettingsIcon />}>
                  Portal Settings
                </Button>
                <Button variant="outlined" fullWidth startIcon={<PersonIcon />}>
                  Bulk Import Users
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Customer Portal User</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Customer</InputLabel>
              <Select label="Customer">
                <MenuItem value="">Select Customer</MenuItem>
                {/* Add customer options here */}
              </Select>
            </FormControl>
            <TextField fullWidth label="Email Address" type="email" />
            <TextField fullWidth label="First Name" />
            <TextField fullWidth label="Last Name" />
            <TextField fullWidth label="Phone Number" />
            <TextField fullWidth label="Initial Password" type="password" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained">Create User</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}