'use client'

import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Grid,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Stack,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Security as SecurityIcon,
  People as PeopleIcon,
  CheckCircle as CheckCircleIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material'
import { useAuth } from '@/hooks/useAuth'

interface Role {
  id: string
  name: string
  display_name?: string
  description: string
  permissions: string[]
  color?: string
  isSystem: boolean
  active?: boolean
  createdAt?: string
  updatedAt?: string
}

interface User {
  id: string
  email: string
  name: string
  role: string
  active: boolean
}

interface RoleAssignment {
  id: string
  user_id: string
  role_id: string
  assigned_at: string
  assigned_by: string
  user?: User
  role?: Role
}

interface Permission {
  id: string
  name: string
  description?: string
  category: string
}

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
      id={`role-tabpanel-${index}`}
      aria-labelledby={`role-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  )
}

export default function RolePermissions() {
  const { user: currentUser } = useAuth()
  const [tabValue, setTabValue] = useState(0)

  // Roles Management State
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [roleFormData, setRoleFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    permissions: [] as string[],
    color: '#1976d2',
  })

  // User Assignments State
  const [users, setUsers] = useState<User[]>([])
  const [assignments, setAssignments] = useState<RoleAssignment[]>([])
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])

  // Permission Matrix State
  const [permissionCategories, setPermissionCategories] = useState<Record<string, string[]>>({})

  // Available permission resources
  const availablePermissions = [
    { category: 'Jobs', permissions: ['jobs.read', 'jobs.create', 'jobs.update', 'jobs.delete', 'jobs.manage', 'jobs.read_assigned'] },
    { category: 'Time Tracking', permissions: ['time_tracking.read', 'time_tracking.create', 'time_tracking.approve', 'time_tracking.manage', 'time_tracking.manage_own'] },
    { category: 'Users', permissions: ['users.read', 'users.create', 'users.update', 'users.delete', 'users.deactivate'] },
    { category: 'Customers', permissions: ['customers.read', 'customers.create', 'customers.update', 'customers.delete'] },
    { category: 'Materials', permissions: ['materials.read', 'materials.create', 'materials.update', 'materials.delete', 'materials.manage', 'materials.log_usage'] },
    { category: 'Invoices', permissions: ['invoices.read', 'invoices.create', 'invoices.update', 'invoices.delete'] },
    { category: 'Reports', permissions: ['reports.read', 'reports.export'] },
    { category: 'Scheduling', permissions: ['scheduling.read', 'scheduling.manage', 'schedule.view_own'] },
    { category: 'Equipment', permissions: ['equipment.read', 'equipment.manage'] },
    { category: 'Documents', permissions: ['documents.read', 'documents.upload', 'documents.manage'] },
    { category: 'Crew', permissions: ['crew.manage', 'crew.read'] },
    { category: 'Job Notes', permissions: ['job_notes.create', 'job_notes.read'] },
    { category: 'Payroll', permissions: ['payroll.manage', 'payroll.read'] },
    { category: 'Expenses', permissions: ['expenses.manage', 'expenses.read'] },
  ]

  useEffect(() => {
    fetchRoles()
    fetchUsers()
    fetchAssignments()
  }, [])

  const fetchRoles = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/roles', {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('Failed to fetch roles')
      }
      const data = await response.json()
      setRoles(data)
      setError(null)
    } catch (err) {
      setError('Failed to load roles')
      console.error('Error fetching roles:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users', {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      const data = await response.json()
      setUsers(data.users || [])
    } catch (err) {
      console.error('Error fetching users:', err)
    }
  }

  const fetchAssignments = async () => {
    try {
      const response = await fetch('/api/roles/assignments', {
        credentials: 'include'
      })
      if (!response.ok) {
        // If endpoint doesn't exist yet, silently fail
        console.warn('Role assignments endpoint not available')
        return
      }
      const data = await response.json()
      setAssignments(data || [])
    } catch (err) {
      console.error('Error fetching assignments:', err)
    }
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  // Role Management Functions
  const handleCreateRole = () => {
    setEditingRole(null)
    setRoleFormData({
      name: '',
      display_name: '',
      description: '',
      permissions: [],
      color: '#1976d2',
    })
    setRoleDialogOpen(true)
  }

  const handleEditRole = (role: Role) => {
    setEditingRole(role)
    setRoleFormData({
      name: role.name,
      display_name: role.display_name || role.name,
      description: role.description,
      permissions: role.permissions || [],
      color: role.color || '#1976d2',
    })
    setRoleDialogOpen(true)
  }

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete role')
      }

      await fetchRoles()
      setError(null)
    } catch (err: any) {
      setError(err.message)
      console.error('Error deleting role:', err)
    }
  }

  const handleSaveRole = async () => {
    try {
      const url = editingRole ? `/api/roles/${editingRole.id}` : '/api/roles'
      const method = editingRole ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(roleFormData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save role')
      }

      await fetchRoles()
      setRoleDialogOpen(false)
      setError(null)
    } catch (err: any) {
      setError(err.message)
      console.error('Error saving role:', err)
    }
  }

  const togglePermission = (permission: string) => {
    setRoleFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }))
  }

  // User Assignment Functions
  const handleAssignRole = () => {
    setSelectedUser('')
    setSelectedRoles([])
    setAssignDialogOpen(true)
  }

  const handleSaveAssignment = async () => {
    try {
      // This would call an API endpoint to create role assignments
      const response = await fetch('/api/roles/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          user_id: selectedUser,
          role_ids: selectedRoles,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to assign roles')
      }

      await fetchAssignments()
      setAssignDialogOpen(false)
      setError(null)
    } catch (err: any) {
      setError(err.message)
      console.error('Error assigning roles:', err)
    }
  }

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm('Remove this role assignment?')) {
      return
    }

    try {
      const response = await fetch(`/api/roles/assignments/${assignmentId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to remove assignment')
      }

      await fetchAssignments()
      setError(null)
    } catch (err: any) {
      setError(err.message)
      console.error('Error removing assignment:', err)
    }
  }

  const getRoleColor = (role: Role) => {
    return role.color || '#1976d2'
  }

  if (currentUser?.role !== 'OWNER_ADMIN') {
    return (
      <Card>
        <CardContent>
          <Alert severity="warning">
            You do not have permission to access role management.
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Box>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <SecurityIcon sx={{ mr: 1, fontSize: 28 }} />
            <Typography variant="h5" component="h2">
              Roles & Permissions Management
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Manage user roles, permissions, and access control for the system.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab
                icon={<SecurityIcon />}
                iconPosition="start"
                label="Roles Management"
              />
              <Tab
                icon={<PeopleIcon />}
                iconPosition="start"
                label="User Assignments"
              />
              <Tab
                icon={<AssignmentIcon />}
                iconPosition="start"
                label="Permission Matrix"
              />
            </Tabs>
          </Box>

          {/* Tab 1: Roles Management */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6">System Roles</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateRole}
              >
                Create Role
              </Button>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Role Name</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Permissions</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {roles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                backgroundColor: getRoleColor(role),
                              }}
                            />
                            <Typography variant="body2" fontWeight="medium">
                              {role.display_name || role.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {role.description}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${role.permissions?.length || 0} permissions`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          {role.isSystem ? (
                            <Chip label="System" size="small" color="default" />
                          ) : (
                            <Chip label="Custom" size="small" color="secondary" />
                          )}
                        </TableCell>
                        <TableCell>
                          {role.active !== false ? (
                            <Chip label="Active" size="small" color="success" />
                          ) : (
                            <Chip label="Inactive" size="small" />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit Role">
                            <IconButton
                              size="small"
                              onClick={() => handleEditRole(role)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {!role.isSystem && (
                            <Tooltip title="Delete Role">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteRole(role.id)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* Tab 2: User Assignments */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6">Role Assignments</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAssignRole}
              >
                Assign Roles
              </Button>
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Assigned Roles</TableCell>
                    <TableCell>Assigned Date</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => {
                    const userAssignments = assignments.filter(a => a.user_id === user.id)
                    return (
                      <TableRow key={user.id}>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            {userAssignments.length > 0 ? (
                              userAssignments.map((assignment) => {
                                const role = roles.find(r => r.id === assignment.role_id)
                                return role ? (
                                  <Chip
                                    key={assignment.id}
                                    label={role.display_name || role.name}
                                    size="small"
                                    onDelete={() => handleRemoveAssignment(assignment.id)}
                                    sx={{
                                      backgroundColor: getRoleColor(role) + '20',
                                      borderColor: getRoleColor(role),
                                    }}
                                  />
                                ) : null
                              })
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                No roles assigned (using legacy role: {user.role})
                              </Typography>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          {userAssignments.length > 0 ? (
                            new Date(userAssignments[0].assigned_at).toLocaleDateString()
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            onClick={() => {
                              setSelectedUser(user.id)
                              setSelectedRoles(userAssignments.map(a => a.role_id))
                              setAssignDialogOpen(true)
                            }}
                          >
                            Manage Roles
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Tab 3: Permission Matrix */}
          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Permission Matrix
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              View which roles have access to which resources. Check marks indicate granted permissions.
            </Typography>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Permission</TableCell>
                    {roles.filter(r => r.active !== false).map((role) => (
                      <TableCell key={role.id} align="center" sx={{ fontWeight: 'bold' }}>
                        <Tooltip title={role.description}>
                          <Box>
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: getRoleColor(role),
                                display: 'inline-block',
                                mr: 0.5,
                              }}
                            />
                            {role.display_name || role.name}
                          </Box>
                        </Tooltip>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {availablePermissions.map((category) => (
                    <React.Fragment key={category.category}>
                      <TableRow>
                        <TableCell
                          colSpan={roles.filter(r => r.active !== false).length + 1}
                          sx={{
                            backgroundColor: 'action.hover',
                            fontWeight: 'bold',
                            py: 1,
                          }}
                        >
                          {category.category}
                        </TableCell>
                      </TableRow>
                      {category.permissions.map((permission) => (
                        <TableRow key={permission}>
                          <TableCell sx={{ pl: 4 }}>
                            <Typography variant="body2" fontFamily="monospace">
                              {permission}
                            </Typography>
                          </TableCell>
                          {roles.filter(r => r.active !== false).map((role) => {
                            const hasPermission =
                              role.permissions?.includes('*') ||
                              role.permissions?.includes(permission)
                            return (
                              <TableCell key={role.id} align="center">
                                {hasPermission && (
                                  <CheckCircleIcon
                                    fontSize="small"
                                    sx={{ color: getRoleColor(role) }}
                                  />
                                )}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
        </CardContent>
      </Card>

      {/* Create/Edit Role Dialog */}
      <Dialog
        open={roleDialogOpen}
        onClose={() => setRoleDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingRole ? 'Edit Role' : 'Create New Role'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Role Name"
                value={roleFormData.name}
                onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
                disabled={editingRole?.isSystem}
                placeholder="e.g., PROJECT_MANAGER"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Display Name"
                value={roleFormData.display_name}
                onChange={(e) => setRoleFormData({ ...roleFormData, display_name: e.target.value })}
                placeholder="e.g., Project Manager"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                value={roleFormData.description}
                onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Permissions
                </Typography>
              </Divider>
            </Grid>
            {availablePermissions.map((category) => (
              <Grid item xs={12} key={category.category}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {category.category}
                </Typography>
                <FormGroup row>
                  {category.permissions.map((permission) => (
                    <FormControlLabel
                      key={permission}
                      control={
                        <Checkbox
                          checked={roleFormData.permissions.includes(permission)}
                          onChange={() => togglePermission(permission)}
                          disabled={editingRole?.isSystem}
                        />
                      }
                      label={
                        <Typography variant="body2" fontFamily="monospace">
                          {permission.split('.')[1]}
                        </Typography>
                      }
                    />
                  ))}
                </FormGroup>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialogOpen(false)} startIcon={<CancelIcon />}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveRole}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!roleFormData.name || !roleFormData.display_name}
          >
            {editingRole ? 'Save Changes' : 'Create Role'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Roles Dialog */}
      <Dialog
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Assign Roles to User</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select User</InputLabel>
              <Select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                label="Select User"
              >
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Select Roles:
            </Typography>
            <FormGroup>
              {roles.filter(r => r.active !== false).map((role) => (
                <FormControlLabel
                  key={role.id}
                  control={
                    <Checkbox
                      checked={selectedRoles.includes(role.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRoles([...selectedRoles, role.id])
                        } else {
                          setSelectedRoles(selectedRoles.filter(id => id !== role.id))
                        }
                      }}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {role.display_name || role.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {role.description}
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </FormGroup>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveAssignment}
            variant="contained"
            disabled={!selectedUser || selectedRoles.length === 0}
          >
            Assign Roles
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
