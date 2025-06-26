'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Link,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider,
  Card,
  CardContent,
} from '@mui/material'
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
  Home as HomeIcon,
  Phone as PhoneIcon,
  Construction as ConstructionIcon,
} from '@mui/icons-material'

export default function CustomerLoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showResetForm, setShowResetForm] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState<string | null>(null)

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('customer-token')
    if (token) {
      router.push('/customer-portal/dashboard')
    }
  }, [router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (error) setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/customer-portal/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      // Store token and user data
      localStorage.setItem('customer-token', data.token)
      localStorage.setItem('customer-user', JSON.stringify(data.user))

      console.log('Customer login successful:', data.user)

      // Redirect to dashboard
      router.push('/customer-portal/dashboard')

    } catch (error: any) {
      console.error('Login error:', error)
      setError(error.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!resetEmail) {
      setError('Please enter your email address')
      return
    }

    setResetLoading(true)
    setError(null)
    setResetMessage(null)

    try {
      const response = await fetch('/api/customer-portal/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: resetEmail }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Password reset failed')
      }

      setResetMessage(data.message)
      
      // Show reset token in development
      if (data.resetToken) {
        console.log('Development - Reset Token:', data.resetToken)
      }

    } catch (error: any) {
      console.error('Password reset error:', error)
      setError(error.message || 'Password reset failed. Please try again.')
    } finally {
      setResetLoading(false)
    }
  }

  const handleBackToLogin = () => {
    setShowResetForm(false)
    setResetEmail('')
    setResetMessage(null)
    setError(null)
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        {/* Company Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: 'white',
              mb: 2,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            }}
          >
            <ConstructionIcon sx={{ fontSize: 40, color: '#e14eca' }} />
          </Box>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              color: 'white',
              fontWeight: 'bold',
              mb: 1,
            }}
          >
            Ortmeier Technical Service
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: 'rgba(255,255,255,0.9)',
              fontWeight: 300,
            }}
          >
            Customer Portal
          </Typography>
        </Box>

        <Paper
          elevation={10}
          sx={{
            p: 4,
            borderRadius: 3,
            backgroundColor: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {!showResetForm ? (
            <>
              {/* Login Form */}
              <Typography
                variant="h4"
                component="h2"
                sx={{
                  textAlign: 'center',
                  mb: 3,
                  color: 'text.primary',
                  fontWeight: 600,
                }}
              >
                Welcome Back
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  textAlign: 'center',
                  mb: 4,
                  color: 'text.secondary',
                }}
              >
                Sign in to view your projects and invoices
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  autoComplete="email"
                  sx={{ mb: 3 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="Password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  autoComplete="current-password"
                  sx={{ mb: 4 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon color="action" />
                      </InputAdornment>
                    ),
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

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{
                    mb: 3,
                    py: 1.5,
                    backgroundColor: '#e14eca',
                    '&:hover': {
                      backgroundColor: '#d236b8',
                    },
                    '&:disabled': {
                      backgroundColor: 'rgba(225, 78, 202, 0.5)',
                    },
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Sign In'
                  )}
                </Button>

                <Box sx={{ textAlign: 'center' }}>
                  <Link
                    component="button"
                    variant="body2"
                    onClick={(e) => {
                      e.preventDefault()
                      setShowResetForm(true)
                    }}
                    sx={{
                      color: '#e14eca',
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    Forgot your password?
                  </Link>
                </Box>
              </Box>
            </>
          ) : (
            <>
              {/* Password Reset Form */}
              <Typography
                variant="h4"
                component="h2"
                sx={{
                  textAlign: 'center',
                  mb: 3,
                  color: 'text.primary',
                  fontWeight: 600,
                }}
              >
                Reset Password
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  textAlign: 'center',
                  mb: 4,
                  color: 'text.secondary',
                }}
              >
                Enter your email address and we'll send you a link to reset your password
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              {resetMessage && (
                <Alert severity="success" sx={{ mb: 3 }}>
                  {resetMessage}
                </Alert>
              )}

              <Box component="form" onSubmit={handlePasswordReset}>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  autoComplete="email"
                  sx={{ mb: 4 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={resetLoading}
                  sx={{
                    mb: 3,
                    py: 1.5,
                    backgroundColor: '#e14eca',
                    '&:hover': {
                      backgroundColor: '#d236b8',
                    },
                  }}
                >
                  {resetLoading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>

                <Box sx={{ textAlign: 'center' }}>
                  <Link
                    component="button"
                    variant="body2"
                    onClick={(e) => {
                      e.preventDefault()
                      handleBackToLogin()
                    }}
                    sx={{
                      color: '#e14eca',
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    Back to Sign In
                  </Link>
                </Box>
              </Box>
            </>
          )}

          <Divider sx={{ my: 4 }} />

          {/* Contact Information */}
          <Card sx={{ backgroundColor: 'rgba(225, 78, 202, 0.05)' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Need Help?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Contact our team for assistance with your account
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    (555) 123-4567
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    support@ortmeiertech.com
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Paper>

        {/* Footer */}
        <Typography
          variant="body2"
          sx={{
            textAlign: 'center',
            mt: 4,
            color: 'rgba(255,255,255,0.8)',
          }}
        >
          © 2024 Ortmeier Technical Service. All rights reserved.
        </Typography>
      </Container>
    </Box>
  )
}