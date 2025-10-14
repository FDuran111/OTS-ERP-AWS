'use client'

import React, { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  Chip,
} from '@mui/material'
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Lock as LockIcon,
  Badge as BadgeIcon,
} from '@mui/icons-material'
import ResponsiveLayout from '@/components/layout/ResponsiveLayout'
import ResponsiveContainer from '@/components/layout/ResponsiveContainer'
import { useAuthCheck } from '@/hooks/useAuthCheck'
import { useRouter } from 'next/navigation'

interface UserProfile {
  id: string
  email: string
  name: string
  role: string
  phone?: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export default function ProfilePage() {
  const router = useRouter()
  const { user: authUser, loading: authLoading } = useAuthCheck()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // UI state
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({
    open: false,
    message: '',
    severity: 'success'
  })

  useEffect(() => {
    if (!authLoading && authUser) {
      fetchProfile()
    }
  }, [authLoading, authUser])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/profile', {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch profile')
      }

      const data = await response.json()
      setProfile(data)
      setName(data.name)
      setEmail(data.email)
      setPhone(data.phone || '')
    } catch (error) {
      console.error('Error fetching profile:', error)
      setSnackbar({
        open: true,
        message: 'Failed to load profile',
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          email,
          phone
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      setProfile(data.user)
      setEditing(false)

      // Update localStorage user data
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const userData = JSON.parse(storedUser)
        userData.name = data.user.name
        userData.email = data.user.email
        localStorage.setItem('user', JSON.stringify(userData))
      }

      setSnackbar({
        open: true,
        message: 'Profile updated successfully',
        severity: 'success'
      })
    } catch (error: any) {
      console.error('Error updating profile:', error)
      setSnackbar({
        open: true,
        message: error.message || 'Failed to update profile',
        severity: 'error'
      })
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setSnackbar({
        open: true,
        message: 'New passwords do not match',
        severity: 'error'
      })
      return
    }

    if (newPassword.length < 6) {
      setSnackbar({
        open: true,
        message: 'Password must be at least 6 characters',
        severity: 'error'
      })
      return
    }

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password')
      }

      setChangingPassword(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')

      setSnackbar({
        open: true,
        message: 'Password changed successfully',
        severity: 'success'
      })
    } catch (error: any) {
      console.error('Error changing password:', error)
      setSnackbar({
        open: true,
        message: error.message || 'Failed to change password',
        severity: 'error'
      })
    }
  }

  const handleCancelEdit = () => {
    if (profile) {
      setName(profile.name)
      setEmail(profile.email)
      setPhone(profile.phone || '')
    }
    setEditing(false)
  }

  const handleCancelPasswordChange = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setChangingPassword(false)
  }

  if (authLoading || loading) {
    return (
      <ResponsiveLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </ResponsiveLayout>
    )
  }

  if (!authUser || !profile) {
    return (
      <ResponsiveLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <Typography>Failed to load profile</Typography>
        </Box>
      </ResponsiveLayout>
    )
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'OWNER_ADMIN':
        return 'error'
      case 'FOREMAN':
        return 'warning'
      case 'EMPLOYEE':
        return 'info'
      default:
        return 'default'
    }
  }

  const getRoleLabel = (role: string) => {
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

  return (
    <ResponsiveLayout>
      <ResponsiveContainer title="My Profile">
        <Stack spacing={3}>
          {/* Profile Information */}
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <PersonIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
              <Box>
                <Typography variant="h5" gutterBottom>
                  Profile Information
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  View and manage your account details
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ mb: 3 }} />

            <Stack spacing={3}>
              {/* Role Badge */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <BadgeIcon sx={{ fontSize: 16, mr: 0.5 }} />
                  Role
                </Typography>
                <Chip
                  label={getRoleLabel(profile.role)}
                  color={getRoleColor(profile.role)}
                  size="small"
                />
              </Box>

              {/* Name */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <PersonIcon sx={{ fontSize: 16, mr: 0.5 }} />
                  Name
                </Typography>
                {editing ? (
                  <TextField
                    fullWidth
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    size="small"
                  />
                ) : (
                  <Typography variant="body1">{profile.name}</Typography>
                )}
              </Box>

              {/* Email */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <EmailIcon sx={{ fontSize: 16, mr: 0.5 }} />
                  Email
                </Typography>
                {editing ? (
                  <TextField
                    fullWidth
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    size="small"
                  />
                ) : (
                  <Typography variant="body1">{profile.email}</Typography>
                )}
              </Box>

              {/* Phone */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <PhoneIcon sx={{ fontSize: 16, mr: 0.5 }} />
                  Phone
                </Typography>
                {editing ? (
                  <TextField
                    fullWidth
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    size="small"
                    placeholder="(123) 456-7890"
                  />
                ) : (
                  <Typography variant="body1">{profile.phone || 'Not provided'}</Typography>
                )}
              </Box>

              {/* Edit/Save Buttons */}
              <Box sx={{ display: 'flex', gap: 2, pt: 2 }}>
                {editing ? (
                  <>
                    <Button
                      variant="contained"
                      onClick={handleSaveProfile}
                    >
                      Save Changes
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="contained"
                    onClick={() => setEditing(true)}
                  >
                    Edit Profile
                  </Button>
                )}
              </Box>
            </Stack>
          </Paper>

          {/* Change Password */}
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <LockIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
              <Box>
                <Typography variant="h5" gutterBottom>
                  Change Password
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Update your account password
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {changingPassword ? (
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  type="password"
                  label="Current Password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <TextField
                  fullWidth
                  type="password"
                  label="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  helperText="Minimum 6 characters"
                />
                <TextField
                  fullWidth
                  type="password"
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    onClick={handleChangePassword}
                    disabled={!currentPassword || !newPassword || !confirmPassword}
                  >
                    Change Password
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleCancelPasswordChange}
                  >
                    Cancel
                  </Button>
                </Box>
              </Stack>
            ) : (
              <Button
                variant="outlined"
                onClick={() => setChangingPassword(true)}
              >
                Change Password
              </Button>
            )}
          </Paper>

          {/* Account Information */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Account Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Account Created
                </Typography>
                <Typography variant="body2">
                  {new Date(profile.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Last Updated
                </Typography>
                <Typography variant="body2">
                  {new Date(profile.updatedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Account Status
                </Typography>
                <Chip
                  label={profile.active ? 'Active' : 'Inactive'}
                  color={profile.active ? 'success' : 'default'}
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Box>
            </Stack>
          </Paper>
        </Stack>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </ResponsiveContainer>
    </ResponsiveLayout>
  )
}
