'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Alert,
  Grid,
  Avatar,
  Tabs,
  Tab
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  AttachMoney as MoneyIcon,
  Badge as BadgeIcon,
  Close as CloseIcon
} from '@mui/icons-material'

interface User {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  active: boolean
  regularRate: number | null
  overtimeRate: number | null
  doubleTimeRate: number | null
  createdAt: string
}

const ROLES = [
  { value: 'OWNER_ADMIN', label: 'Owner/Admin', color: 'error' },
  { value: 'FOREMAN', label: 'Foreman', color: 'warning' },
  { value: 'OFFICE', label: 'Office Staff', color: 'info' },
  { value: 'EMPLOYEE', label: 'Employee', color: 'success' },
  { value: 'TECHNICIAN', label: 'Technician', color: 'primary' },
  { value: 'VIEWER', label: 'Viewer', color: 'default' }
]

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [currentTab, setCurrentTab] = useState(0)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'EMPLOYEE',
    password: '',
    active: true,
    regularRate: '15.00',
    overtimeRate: '',
    doubleTimeRate: '',
    sendWelcomeEmail: true
  })

  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/users')
      if (!response.ok) throw new Error('Failed to load users')
      const data = await response.json()
      setUsers(data.users || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        password: '',
        active: user.active,
        regularRate: user.regularRate?.toString() || '15.00',
        overtimeRate: user.overtimeRate?.toString() || '',
        doubleTimeRate: user.doubleTimeRate?.toString() || '',
        sendWelcomeEmail: false
      })
    } else {
      setEditingUser(null)
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: 'EMPLOYEE',
        password: '',
        active: true,
        regularRate: '15.00',
        overtimeRate: '',
        doubleTimeRate: '',
        sendWelcomeEmail: true
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingUser(null)
    setError(null)
  }

  const handleSubmit = async () => {
    try {
      setError(null)

      // Validation
      if (!formData.name || !formData.email || !formData.role) {
        setError('Name, email, and role are required')
        return
      }

      if (!editingUser && !formData.password) {
        setError('Password is required for new users')
        return
      }

      const endpoint = editingUser 
        ? `/api/users/${editingUser.id}`
        : '/api/users/create'

      const method = editingUser ? 'PUT' : 'POST'

      const payload: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        role: formData.role,
        active: formData.active,
        regularRate: parseFloat(formData.regularRate) || 15.00,
        overtimeRate: formData.overtimeRate ? parseFloat(formData.overtimeRate) : null,
        doubleTimeRate: formData.doubleTimeRate ? parseFloat(formData.doubleTimeRate) : null
      }

      if (formData.password) {
        payload.password = formData.password
      }

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save user')
      }

      setSuccess(editingUser ? 'User updated successfully' : 'User created successfully')
      setTimeout(() => setSuccess(null), 3000)
      
      handleCloseDialog()
      loadUsers()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleToggleActive = async (user: User) => {
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !user.active })
      })

      if (!response.ok) throw new Error('Failed to update user')

      setSuccess(`User ${!user.active ? 'activated' : 'deactivated'}`)
      setTimeout(() => setSuccess(null), 3000)
      loadUsers()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const getRoleColor = (role: string) => {
    const roleConfig = ROLES.find(r => r.value === role)
    return roleConfig?.color || 'default'
  }

  const getRoleLabel = (role: string) => {
    const roleConfig = ROLES.find(r => r.value === role)
    return roleConfig?.label || role
  }

  const activeUsers = users.filter(u => u.active)
  const inactiveUsers = users.filter(u => !u.active)
  const displayUsers = currentTab === 0 ? activeUsers : inactiveUsers

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          User Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add User
        </Button>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Users
              </Typography>
              <Typography variant="h4">{users.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Active Users
              </Typography>
              <Typography variant="h4" color="success.main">{activeUsers.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Employees
              </Typography>
              <Typography variant="h4">{users.filter(u => u.role === 'EMPLOYEE').length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Admins
              </Typography>
              <Typography variant="h4">{users.filter(u => u.role === 'OWNER_ADMIN' || u.role === 'FOREMAN').length}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Active Users (${activeUsers.length})`} />
        <Tab label={`Inactive Users (${inactiveUsers.length})`} />
      </Tabs>

      {/* Users Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Pay Rates</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">Loading...</TableCell>
              </TableRow>
            ) : displayUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No {currentTab === 0 ? 'active' : 'inactive'} users found
                </TableCell>
              </TableRow>
            ) : (
              displayUsers.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar>{user.name.charAt(0).toUpperCase()}</Avatar>
                      <Box>
                        <Typography variant="body1" fontWeight={500}>
                          {user.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {user.id.substring(0, 8)}...
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EmailIcon fontSize="small" color="action" />
                        <Typography variant="body2">{user.email}</Typography>
                      </Box>
                      {user.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PhoneIcon fontSize="small" color="action" />
                          <Typography variant="body2">{user.phone}</Typography>
                        </Box>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getRoleLabel(user.role)}
                      color={getRoleColor(user.role) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography variant="body2">
                        Regular: ${user.regularRate?.toFixed(2) || '15.00'}/hr
                      </Typography>
                      {user.overtimeRate && (
                        <Typography variant="body2" color="text.secondary">
                          OT: ${user.overtimeRate.toFixed(2)}/hr
                        </Typography>
                      )}
                      {user.doubleTimeRate && (
                        <Typography variant="body2" color="text.secondary">
                          DT: ${user.doubleTimeRate.toFixed(2)}/hr
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.active ? 'Active' : 'Inactive'}
                      color={user.active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(user)}
                      color="primary"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleToggleActive(user)}
                      color={user.active ? 'error' : 'success'}
                    >
                      <Badge fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
            {editingUser ? 'Edit User' : 'Create New User'}
            <IconButton onClick={handleCloseDialog} sx={{ ml: 'auto' }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom color="primary">
                Basic Information
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={formData.role}
                  label="Role"
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  {ROLES.map(role => (
                    <MenuItem key={role.value} value={role.value}>
                      {role.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={editingUser ? "New Password (leave blank to keep current)" : "Password"}
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editingUser}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  />
                }
                label="Active"
              />
            </Grid>

            {/* Pay Rates */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom color="primary" sx={{ mt: 2 }}>
                Pay Rates
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Regular Rate ($/hr)"
                type="number"
                value={formData.regularRate}
                onChange={(e) => setFormData({ ...formData, regularRate: e.target.value })}
                inputProps={{ step: "0.01", min: "0" }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Overtime Rate ($/hr)"
                type="number"
                value={formData.overtimeRate}
                onChange={(e) => setFormData({ ...formData, overtimeRate: e.target.value })}
                inputProps={{ step: "0.01", min: "0" }}
                placeholder="Auto: 1.5x Regular"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Double Time Rate ($/hr)"
                type="number"
                value={formData.doubleTimeRate}
                onChange={(e) => setFormData({ ...formData, doubleTimeRate: e.target.value })}
                inputProps={{ step: "0.01", min: "0" }}
                placeholder="Auto: 2x Regular"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingUser ? 'Update User' : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
