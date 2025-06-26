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
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Person as PersonIcon,
} from '@mui/icons-material'
import CreateUserDialog from './CreateUserDialog'
import EditUserDialog from './EditUserDialog'
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
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/users')
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

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) {
      return
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false })
      })

      if (!response.ok) {
        throw new Error('Failed to deactivate user')
      }

      await fetchUsers()
    } catch (err) {
      console.error('Error deactivating user:', err)
      alert('Failed to deactivate user')
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

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
          <TextField
            fullWidth
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
                      <IconButton
                        size="small"
                        onClick={() => handleEditUser(user)}
                        disabled={user.id === currentUser?.id}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={user.id === currentUser?.id || !user.active}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
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
        <EditUserDialog
          open={editDialogOpen}
          user={selectedUser}
          onClose={() => {
            setEditDialogOpen(false)
            setSelectedUser(null)
          }}
          onUserUpdated={handleUserUpdated}
        />
      )}
    </Box>
  )
}