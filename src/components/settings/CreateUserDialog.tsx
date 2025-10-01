'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  MenuItem,
  Alert,
  IconButton,
  InputAdornment,
  Typography,
  CircularProgress,
  FormControl,
  FormLabel,
  FormGroup,
  Checkbox,
  FormControlLabel,
} from '@mui/material'
import {
  Close as CloseIcon,
  Visibility,
  VisibilityOff,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Badge as BadgeIcon,
} from '@mui/icons-material'

interface Role {
  id: string
  name: string
  display_name?: string
  description: string
  permissions: string[]
  isSystem: boolean
  active?: boolean
}

interface CreateUserDialogProps {
  open: boolean
  onClose: () => void
  onUserCreated: () => void
}

export default function CreateUserDialog({ open, onClose, onUserCreated }: CreateUserDialogProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: 'EMPLOYEE' as 'OWNER_ADMIN' | 'FOREMAN' | 'EMPLOYEE',
    phone: '',
  })
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])
  const [loadingRoles, setLoadingRoles] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      fetchRoles()
    }
  }, [open])

  const fetchRoles = async () => {
    try {
      setLoadingRoles(true)
      const response = await fetch('/api/roles', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setRoles(data.filter((r: Role) => r.active !== false))
      }
    } catch (err) {
      console.error('Error fetching roles:', err)
    } finally {
      setLoadingRoles(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Create user first (with legacy role)
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: formData.role,
          phone: formData.phone || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user')
      }

      // Assign new RBAC roles if selected
      if (selectedRoleIds.length > 0) {
        await fetch('/api/roles/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            user_id: data.user.id,
            role_ids: selectedRoleIds,
          }),
        })
      }

      // Reset form
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
        role: 'EMPLOYEE',
        phone: '',
      })
      setSelectedRoleIds([])

      onUserCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
        role: 'EMPLOYEE',
        phone: '',
      })
      setError(null)
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Create New User</Typography>
          <IconButton onClick={handleClose} disabled={loading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            margin="normal"
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            margin="normal"
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="Phone Number"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            margin="normal"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PhoneIcon />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            select
            label="Role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            margin="normal"
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <BadgeIcon />
                </InputAdornment>
              ),
            }}
          >
            <MenuItem value="EMPLOYEE">Employee</MenuItem>
            <MenuItem value="FOREMAN">Foreman</MenuItem>
            <MenuItem value="OWNER_ADMIN">Owner/Admin</MenuItem>
          </TextField>

          <TextField
            fullWidth
            label="Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange}
            margin="normal"
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="Confirm Password"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={handleChange}
            margin="normal"
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <FormControl component="fieldset">
              <FormLabel component="legend">
                <Typography variant="body2" fontWeight="medium">
                  Additional RBAC Roles (New System)
                </Typography>
              </FormLabel>
              {loadingRoles ? (
                <CircularProgress size={20} sx={{ my: 1 }} />
              ) : (
                <FormGroup>
                  {roles.map((role) => (
                    <FormControlLabel
                      key={role.id}
                      control={
                        <Checkbox
                          checked={selectedRoleIds.includes(role.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRoleIds([...selectedRoleIds, role.id])
                            } else {
                              setSelectedRoleIds(selectedRoleIds.filter(id => id !== role.id))
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
              )}
            </FormControl>
          </Box>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Legacy Role Permissions:</strong>
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              • <strong>Employee:</strong> View assigned work, log time, add notes
            </Typography>
            <Typography variant="body2">
              • <strong>Foreman:</strong> Manage jobs, crews, schedules, materials
            </Typography>
            <Typography variant="body2">
              • <strong>Owner/Admin:</strong> Full system control, all features
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{
              backgroundColor: '#e14eca',
              '&:hover': {
                backgroundColor: '#d236b8',
              },
            }}
          >
            {loading ? 'Creating...' : 'Create User'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}