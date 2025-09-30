'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import ResponsiveLayout from '@/components/layout/ResponsiveLayout'
import ResponsiveContainer from '@/components/layout/ResponsiveContainer'
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
} from '@mui/material'
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AccountBalance as AccountBalanceIcon,
} from '@mui/icons-material'

interface Account {
  id: string
  code: string
  name: string
  accountType: string
  accountSubType?: string
  parentAccountId?: string
  parentAccountName?: string
  isActive: boolean
  isPosting: boolean
  balanceType: string
  description?: string
}

const accountTypeColors: Record<string, string> = {
  ASSET: 'success',
  LIABILITY: 'error',
  EQUITY: 'primary',
  REVENUE: 'info',
  COGS: 'warning',
  EXPENSE: 'secondary',
}

export default function ChartOfAccountsPage() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('ALL')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    accountType: 'EXPENSE',
    accountSubType: '',
    parentAccountId: '',
    balanceType: 'DEBIT',
    description: '',
    isActive: true,
    isPosting: true,
  })

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/accounting/accounts')
      if (!response.ok) throw new Error('Failed to fetch accounts')
      const data = await response.json()
      setAccounts(data.accounts)
      setError(null)
    } catch (err) {
      console.error('Error fetching accounts:', err)
      setError('Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAccount = async () => {
    try {
      const response = await fetch('/api/accounting/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create account')
      }

      await fetchAccounts()
      setAddDialogOpen(false)
      resetForm()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleUpdateAccount = async () => {
    if (!selectedAccount) return

    try {
      const response = await fetch(`/api/accounting/accounts/${selectedAccount.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update account')
      }

      await fetchAccounts()
      setEditDialogOpen(false)
      setSelectedAccount(null)
      resetForm()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return

    try {
      const response = await fetch(`/api/accounting/accounts/${accountId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete account')
      }

      await fetchAccounts()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      accountType: 'EXPENSE',
      accountSubType: '',
      parentAccountId: '',
      balanceType: 'DEBIT',
      description: '',
      isActive: true,
      isPosting: true,
    })
  }

  const openEditDialog = (account: Account) => {
    setSelectedAccount(account)
    setFormData({
      code: account.code,
      name: account.name,
      accountType: account.accountType,
      accountSubType: account.accountSubType || '',
      parentAccountId: account.parentAccountId || '',
      balanceType: account.balanceType,
      description: account.description || '',
      isActive: account.isActive,
      isPosting: account.isPosting,
    })
    setEditDialogOpen(true)
  }

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = 
      account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'ALL' || account.accountType === filterType
    return matchesSearch && matchesType
  })

  return (
    <ResponsiveLayout user={user}>
      <ResponsiveContainer>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AccountBalanceIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h4" fontWeight="bold">
              Chart of Accounts
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
          >
            Add Account
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              fullWidth
              placeholder="Search by code or name..."
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
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Account Type</InputLabel>
              <Select
                value={filterType}
                label="Account Type"
                onChange={(e) => setFilterType(e.target.value)}
              >
                <MenuItem value="ALL">All Types</MenuItem>
                <MenuItem value="ASSET">Assets</MenuItem>
                <MenuItem value="LIABILITY">Liabilities</MenuItem>
                <MenuItem value="EQUITY">Equity</MenuItem>
                <MenuItem value="REVENUE">Revenue</MenuItem>
                <MenuItem value="COGS">Cost of Goods Sold</MenuItem>
                <MenuItem value="EXPENSE">Expenses</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Paper>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Balance Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {account.code}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{account.name}</Typography>
                      {account.parentAccountName && (
                        <Typography variant="caption" color="text.secondary">
                          Parent: {account.parentAccountName}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={account.accountType}
                        color={accountTypeColors[account.accountType] as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={account.balanceType}
                        variant="outlined"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {account.isActive ? (
                        <Chip label="Active" color="success" size="small" />
                      ) : (
                        <Chip label="Inactive" size="small" />
                      )}
                      {!account.isPosting && (
                        <Chip label="Header" variant="outlined" size="small" sx={{ ml: 1 }} />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => openEditDialog(account)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteAccount(account.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredAccounts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No accounts found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Add Account Dialog */}
        <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add New Account</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Account Code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="Account Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                fullWidth
              />
              <FormControl fullWidth required>
                <InputLabel>Account Type</InputLabel>
                <Select
                  value={formData.accountType}
                  label="Account Type"
                  onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                >
                  <MenuItem value="ASSET">Asset</MenuItem>
                  <MenuItem value="LIABILITY">Liability</MenuItem>
                  <MenuItem value="EQUITY">Equity</MenuItem>
                  <MenuItem value="REVENUE">Revenue</MenuItem>
                  <MenuItem value="COGS">Cost of Goods Sold</MenuItem>
                  <MenuItem value="EXPENSE">Expense</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth required>
                <InputLabel>Balance Type</InputLabel>
                <Select
                  value={formData.balanceType}
                  label="Balance Type"
                  onChange={(e) => setFormData({ ...formData, balanceType: e.target.value })}
                >
                  <MenuItem value="DEBIT">Debit</MenuItem>
                  <MenuItem value="CREDIT">Credit</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={3}
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateAccount} variant="contained">
              Create Account
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Account Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Account</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Account Code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="Account Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                fullWidth
              />
              <FormControl fullWidth required>
                <InputLabel>Account Type</InputLabel>
                <Select
                  value={formData.accountType}
                  label="Account Type"
                  onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                >
                  <MenuItem value="ASSET">Asset</MenuItem>
                  <MenuItem value="LIABILITY">Liability</MenuItem>
                  <MenuItem value="EQUITY">Equity</MenuItem>
                  <MenuItem value="REVENUE">Revenue</MenuItem>
                  <MenuItem value="COGS">Cost of Goods Sold</MenuItem>
                  <MenuItem value="EXPENSE">Expense</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth required>
                <InputLabel>Balance Type</InputLabel>
                <Select
                  value={formData.balanceType}
                  label="Balance Type"
                  onChange={(e) => setFormData({ ...formData, balanceType: e.target.value })}
                >
                  <MenuItem value="DEBIT">Debit</MenuItem>
                  <MenuItem value="CREDIT">Credit</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={3}
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateAccount} variant="contained">
              Update Account
            </Button>
          </DialogActions>
        </Dialog>
      </ResponsiveContainer>
    </ResponsiveLayout>
  )
}
