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
  InputAdornment,
  FormControlLabel,
  Switch,
  Tooltip,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DeleteForever as DeleteForeverIcon,
  Search as SearchIcon,
  Person as PersonIcon,
} from '@mui/icons-material'
import CreateUserDialog from './CreateUserDialog'
import EditUserDialog from './EditUserDialog'
import UserReassignDialog from './UserReassignDialog'
import { useAuth } from '@/hooks/useAuth'

interface User {
  id: string
  email: string
  name: string
  role: 'OWNER_ADMIN' | 'FOREMAN' | 'EMPLOYEE'
  phone?: string
  active: boolean
  createdAt: string
}

export default function UserManagement() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth-token')
      const response = await fetch('/api/users', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      const data = await response.json()
      setUsers(data.users)
      setError(null)
    } catch (err) {
      setError('Failed to load users')
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = () => {
    setCreateDialogOpen(true)
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setEditDialogOpen(true)
  }

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user)
    setReassignDialogOpen(true)
  }

  const handleReassignSuccess = () => {
    setReassignDialogOpen(false)
    setSelectedUser(null)
    fetchUsers()
  }

  const handlePermanentDelete = async (userId: string) => {
    const user = users.find(u => u.id === userId)
    if (!user) return

    const confirmMessage = `Are you sure you want to PERMANENTLY delete ${user.name}? This action cannot be undone and will remove all associated records.`
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      // Ensure proper URL encoding for the user ID
      const encodedUserId = encodeURIComponent(userId)
      const response = await fetch(`/api/users/${encodedUserId}?permanent=true`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Check if response is JSON
      let data
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
      } else {
        // If not JSON, try to get text
        const text = await response.text()
        console.error('Non-JSON response:', text)
        data = { error: 'Server returned non-JSON response' }
      }

      if (!response.ok) {
        console.error('Delete failed:', response.status, data)
        if (data.details) {
          alert(`Error: ${data.error}\n\nDetails:\n${Array.isArray(data.details) ? data.details.join('\n') : data.details}`)
        } else {
          alert(`Error: ${data.error || 'Failed to permanently delete user'}`)
        }
        return
      }

      alert(`User ${user.name} has been permanently deleted.`)
      await fetchUsers()
    } catch (err) {
      console.error('Error permanently deleting user:', err)
      if (err instanceof Error) {
        console.error('Error details:', err.message, err.stack)
      }
      alert('Failed to permanently delete user - check console for details')
    }
  }

  const handleUserCreated = () => {
    setCreateDialogOpen(false)
    fetchUsers()
  }

  const handleUserUpdated = () => {
    setEditDialogOpen(false)
    setSelectedUser(null)
    fetchUsers()
  }

  const getRoleColor = (role: string): 'primary' | 'secondary' | 'default' => {
    switch (role) {
      case 'OWNER_ADMIN':
        return 'primary'
      case 'FOREMAN':
        return 'secondary'
      default:
        return 'default'
    }
  }

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'OWNER_ADMIN':
        return 'Owner/Admin'
      case 'FOREMAN':
        return 'Foreman'
      case 'EMPLOYEE':
        return 'Employee'
      default:
        return role
    }
  }

  const filteredUsers = users.filter(user => {
    // Filter by active/inactive status
    if (showInactive) {
      // When toggle is ON, show ONLY inactive users
      if (user.active) return false
    } else {
      // When toggle is OFF, show ONLY active users
      if (!user.active) return false
    }
    
    // Then filter by search term
    return (
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  if (currentUser?.role !== 'OWNER_ADMIN') {
    return (
      <Alert severity="error">
        Only Owner/Admin users can manage user accounts.
      </Alert>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            User Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create and manage user accounts for your team
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateUser}
          sx={{
            backgroundColor: '#e14eca',
            '&:hover': {
              backgroundColor: '#d236b8',
            },
          }}
        >
          Create User
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              sx={{ flex: 1, minWidth: 300 }}
              placeholder="Search users by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                />
              }
              label={`Show inactive users (${users.filter(u => !u.active).length})`}
            />
          </Box>
        </CardContent>
      </Card>

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
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                        {user.name}
                      </Box>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={getRoleLabel(user.role)}
                        color={getRoleColor(user.role)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.active ? 'Active' : 'Inactive'}
                        color={user.active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={user.id === currentUser?.id ? "Cannot edit your own account" : "Edit user"}>
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleEditUser(user)}
                            disabled={user.id === currentUser?.id}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      {user.active ? (
                        <Tooltip title={user.id === currentUser?.id ? "Cannot delete your own account" : "Deactivate user"}>
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteUser(user)}
                              disabled={user.id === currentUser?.id}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      ) : (
                        <Tooltip title={user.id === currentUser?.id ? "Cannot delete your own account" : "Permanently delete user"}>
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handlePermanentDelete(user.id)}
                              disabled={user.id === currentUser?.id}
                              sx={{ color: 'error.main' }}
                            >
                              <DeleteForeverIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <CreateUserDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onUserCreated={handleUserCreated}
      />

      {selectedUser && (
        <>
          <EditUserDialog
            open={editDialogOpen}
            user={selectedUser}
            onClose={() => {
              setEditDialogOpen(false)
              setSelectedUser(null)
            }}
            onUserUpdated={handleUserUpdated}
          />
          <UserReassignDialog
            open={reassignDialogOpen}
            user={selectedUser}
            onClose={() => {
              setReassignDialogOpen(false)
              setSelectedUser(null)
            }}
            onSuccess={handleReassignSuccess}
          />
        </>
      )}
    </Box>
  )
}