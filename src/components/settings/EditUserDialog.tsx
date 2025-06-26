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
  Switch,
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

interface User {
  id: string
  email: string
  name: string
  role: 'OWNER_ADMIN' | 'FOREMAN' | 'EMPLOYEE'
  phone?: string
  active: boolean
}

interface EditUserDialogProps {
  open: boolean
  user: User
  onClose: () => void
  onUserUpdated: () => void
}

export default function EditUserDialog({ open, user, onClose, onUserUpdated }: EditUserDialogProps) {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'EMPLOYEE' as 'OWNER_ADMIN' | 'FOREMAN' | 'EMPLOYEE',
    phone: '',
    active: true,
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [changePassword, setChangePassword] = useState(false)

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone || '',
        active: user.active,
        password: '',
        confirmPassword: '',
      })
      setChangePassword(false)
    }
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate passwords if changing
    if (changePassword) {
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match')
        return
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      const updateData: any = {
        email: formData.email,
        name: formData.name,
        role: formData.role,
        phone: formData.phone || undefined,
        active: formData.active,
      }

      if (changePassword && formData.password) {
        updateData.password = formData.password
      }

      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user')
      }

      onUserUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setError(null)
      setChangePassword(false)
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Edit User</Typography>
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

          <FormControlLabel
            control={
              <Switch
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                name="active"
              />
            }
            label="Active"
            sx={{ mt: 2, mb: 2 }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={changePassword}
                onChange={(e) => setChangePassword(e.target.checked)}
              />
            }
            label="Change Password"
            sx={{ mb: 2 }}
          />

          {changePassword && (
            <>
              <TextField
                fullWidth
                label="New Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                margin="normal"
                required={changePassword}
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
                label="Confirm New Password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                margin="normal"
                required={changePassword}
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
            </>
          )}
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
            {loading ? 'Updating...' : 'Update User'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}