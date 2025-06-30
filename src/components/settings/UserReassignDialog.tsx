'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
} from '@mui/material'
import {
  Warning as WarningIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
} from '@mui/icons-material'

interface UserDependencies {
  userId: string
  dependencies: {
    purchaseOrders: {
      created: number
      approved: number
      received: number
      pending: number
    }
    serviceCalls: {
      assigned: number
      dispatched: number
    }
    timeEntries: {
      total: number
      recent: number
    }
    activeSchedules: number
    approvalRules: number
    totalDependencies: number
  }
  reassignmentNeeded: {
    pendingPurchaseOrders: any[]
    activeServiceCalls: any[]
    approvalRules: any[]
  }
  canBeDeactivated: boolean
  message: string
}

interface User {
  id: string
  email: string
  name: string
  role: 'OWNER_ADMIN' | 'FOREMAN' | 'EMPLOYEE'
  active: boolean
}

interface UserReassignDialogProps {
  open: boolean
  user: User
  onClose: () => void
  onSuccess: () => void
}

export default function UserReassignDialog({
  open,
  user,
  onClose,
  onSuccess
}: UserReassignDialogProps) {
  const [loading, setLoading] = useState(true)
  const [dependencies, setDependencies] = useState<UserDependencies | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [selectedNewUser, setSelectedNewUser] = useState<string>('')
  const [reassignOptions, setReassignOptions] = useState({
    purchaseOrders: true,
    serviceCalls: true,
    approvalRules: true
  })
  const [reassigning, setReassigning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && user) {
      fetchDependencies()
      fetchUsers()
    }
  }, [open, user])

  const fetchDependencies = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/users/${user.id}/dependencies`)
      if (!response.ok) {
        throw new Error('Failed to fetch user dependencies')
      }
      const data = await response.json()
      setDependencies(data)
    } catch (err) {
      console.error('Error fetching dependencies:', err)
      setError('Failed to load user dependencies')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      const data = await response.json()
      // Filter out inactive users and the current user
      const activeUsers = data.users.filter((u: User) => 
        u.active && u.id !== user.id
      )
      setUsers(activeUsers)
    } catch (err) {
      console.error('Error fetching users:', err)
    }
  }

  const handleReassign = async () => {
    if (!selectedNewUser) {
      setError('Please select a user to reassign to')
      return
    }

    try {
      setReassigning(true)
      setError(null)

      // Reassign dependencies
      const reassignResponse = await fetch(`/api/users/${user.id}/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newUserId: selectedNewUser,
          reassignPurchaseOrders: reassignOptions.purchaseOrders,
          reassignServiceCalls: reassignOptions.serviceCalls,
          reassignApprovalRules: reassignOptions.approvalRules
        })
      })

      if (!reassignResponse.ok) {
        const errorData = await reassignResponse.json()
        throw new Error(errorData.error || 'Failed to reassign user responsibilities')
      }

      // Now deactivate the user
      const deactivateResponse = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE'
      })

      if (!deactivateResponse.ok) {
        const errorData = await deactivateResponse.json()
        throw new Error(errorData.error || 'Failed to deactivate user')
      }

      onSuccess()
    } catch (err) {
      console.error('Error reassigning/deactivating user:', err)
      setError(err instanceof Error ? err.message : 'Failed to complete operation')
    } finally {
      setReassigning(false)
    }
  }

  const handleDirectDeactivate = async () => {
    try {
      setReassigning(true)
      setError(null)

      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.details) {
          setError(`${data.error}\n\nDetails:\n${data.details.join('\n')}`)
        } else {
          setError(data.error || 'Failed to deactivate user')
        }
        return
      }

      onSuccess()
    } catch (err) {
      console.error('Error deactivating user:', err)
      setError('Failed to deactivate user')
    } finally {
      setReassigning(false)
    }
  }

  if (loading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    )
  }

  const hasBlockingDependencies = dependencies && !dependencies.canBeDeactivated

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          Deactivate User: {user.name}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error.split('\n').map((line, index) => (
              <React.Fragment key={index}>
                {line}
                {index < error.split('\n').length - 1 && <br />}
              </React.Fragment>
            ))}
          </Alert>
        )}

        {dependencies && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {dependencies.message}
            </Typography>

            {dependencies.dependencies.totalDependencies > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  User Dependencies:
                </Typography>
                <List dense>
                  {dependencies.dependencies.purchaseOrders.created > 0 && (
                    <ListItem>
                      <ListItemText 
                        primary={`${dependencies.dependencies.purchaseOrders.created} Purchase Orders Created`}
                      />
                    </ListItem>
                  )}
                  {dependencies.dependencies.purchaseOrders.pending > 0 && (
                    <ListItem>
                      <ListItemText 
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip label="BLOCKING" color="error" size="small" />
                            {dependencies.dependencies.purchaseOrders.pending} Pending Purchase Orders
                          </Box>
                        }
                        secondary="These require approval"
                      />
                    </ListItem>
                  )}
                  {dependencies.dependencies.serviceCalls.assigned > 0 && (
                    <ListItem>
                      <ListItemText 
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip label="BLOCKING" color="error" size="small" />
                            {dependencies.dependencies.serviceCalls.assigned} Active Service Calls
                          </Box>
                        }
                        secondary="Currently assigned"
                      />
                    </ListItem>
                  )}
                  {dependencies.dependencies.approvalRules > 0 && (
                    <ListItem>
                      <ListItemText 
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip label="BLOCKING" color="error" size="small" />
                            {dependencies.dependencies.approvalRules} Approval Rules
                          </Box>
                        }
                        secondary="Purchase order approval rules"
                      />
                    </ListItem>
                  )}
                  {dependencies.dependencies.timeEntries.total > 0 && (
                    <ListItem>
                      <ListItemText 
                        primary={`${dependencies.dependencies.timeEntries.total} Time Entries`}
                        secondary={`${dependencies.dependencies.timeEntries.recent} in last 30 days`}
                      />
                    </ListItem>
                  )}
                </List>
              </>
            )}

            {hasBlockingDependencies && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  Reassign Responsibilities To:
                </Typography>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Select User</InputLabel>
                  <Select
                    value={selectedNewUser}
                    onChange={(e) => setSelectedNewUser(e.target.value)}
                    label="Select User"
                  >
                    <MenuItem value="">
                      <em>Select a user...</em>
                    </MenuItem>
                    {users.map((u) => (
                      <MenuItem key={u.id} value={u.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PersonIcon fontSize="small" />
                          {u.name} - {u.role}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Reassignment Options:
                </Typography>
                <Box sx={{ ml: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={reassignOptions.purchaseOrders}
                        onChange={(e) => setReassignOptions({
                          ...reassignOptions,
                          purchaseOrders: e.target.checked
                        })}
                      />
                    }
                    label="Reassign Purchase Orders"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={reassignOptions.serviceCalls}
                        onChange={(e) => setReassignOptions({
                          ...reassignOptions,
                          serviceCalls: e.target.checked
                        })}
                      />
                    }
                    label="Reassign Service Calls"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={reassignOptions.approvalRules}
                        onChange={(e) => setReassignOptions({
                          ...reassignOptions,
                          approvalRules: e.target.checked
                        })}
                      />
                    }
                    label="Reassign Approval Rules"
                  />
                </Box>
              </>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={reassigning}>
          Cancel
        </Button>
        {hasBlockingDependencies ? (
          <Button
            onClick={handleReassign}
            variant="contained"
            color="warning"
            disabled={reassigning || !selectedNewUser}
            startIcon={reassigning ? <CircularProgress size={20} /> : <AssignmentIcon />}
          >
            {reassigning ? 'Processing...' : 'Reassign & Deactivate'}
          </Button>
        ) : (
          <Button
            onClick={handleDirectDeactivate}
            variant="contained"
            color="error"
            disabled={reassigning}
            startIcon={reassigning && <CircularProgress size={20} />}
          >
            {reassigning ? 'Deactivating...' : 'Deactivate User'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}