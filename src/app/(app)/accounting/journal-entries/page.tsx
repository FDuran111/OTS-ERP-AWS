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
  TextField,
  Divider,
  Card,
  CardContent,
} from '@mui/material'
import {
  Add as AddIcon,
  Receipt as ReceiptIcon,
  Delete as DeleteIcon,
  PostAdd as PostIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material'
import { format } from 'date-fns'

interface JournalEntry {
  id: string
  entryNumber: string
  entryDate: string
  periodId: string
  status: 'DRAFT' | 'POSTED' | 'REVERSED'
  description?: string
  sourceModule: string
  totalDebits: number
  totalCredits: number
  createdBy: string
  postedAt?: string
}

interface JournalEntryLine {
  lineNumber: number
  accountId: string
  accountCode?: string
  accountName?: string
  debit: number
  credit: number
  description?: string
}

interface Account {
  id: string
  code: string
  name: string
  accountType: string
}

interface Period {
  id: string
  name: string
  status: string
}

const statusColors = {
  DRAFT: 'default',
  POSTED: 'success',
  REVERSED: 'error',
}

export default function JournalEntriesPage() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [periods, setPeriods] = useState<Period[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)
  const [selectedEntryLines, setSelectedEntryLines] = useState<JournalEntryLine[]>([])
  const [actionLoading, setActionLoading] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    entryDate: format(new Date(), 'yyyy-MM-dd'),
    periodId: '',
    description: '',
  })

  const [lines, setLines] = useState<JournalEntryLine[]>([
    { lineNumber: 1, accountId: '', debit: 0, credit: 0, description: '' },
    { lineNumber: 2, accountId: '', debit: 0, credit: 0, description: '' },
  ])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [entriesRes, accountsRes, periodsRes] = await Promise.all([
        fetch('/api/accounting/journal-entries'),
        fetch('/api/accounting/accounts'),
        fetch('/api/accounting/periods'),
      ])

      if (!entriesRes.ok) throw new Error('Failed to fetch journal entries')
      if (!accountsRes.ok) throw new Error('Failed to fetch accounts')
      if (!periodsRes.ok) throw new Error('Failed to fetch periods')

      const entriesData = await entriesRes.json()
      const accountsData = await accountsRes.json()
      const periodsData = await periodsRes.json()

      setEntries(entriesData.entries)
      setAccounts(accountsData.accounts.filter((a: any) => a.accountType && a.isPosting))
      setPeriods(periodsData.periods)
      
      if (periodsData.periods.length > 0 && !formData.periodId) {
        const openPeriod = periodsData.periods.find((p: Period) => p.status === 'OPEN')
        if (openPeriod) {
          setFormData(prev => ({ ...prev, periodId: openPeriod.id }))
        }
      }

      setError(null)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load journal entries')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateEntry = async () => {
    try {
      setActionLoading(true)

      if (!formData.periodId) {
        throw new Error('Please select an accounting period. No open periods found.')
      }

      const totalDebits = lines.reduce((sum, line) => sum + Number(line.debit), 0)
      const totalCredits = lines.reduce((sum, line) => sum + Number(line.credit), 0)

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new Error(`Entry is not balanced. Debits: $${totalDebits.toFixed(2)}, Credits: $${totalCredits.toFixed(2)}`)
      }

      const validLines = lines.filter(line => line.accountId && (line.debit > 0 || line.credit > 0))

      if (validLines.length < 2) {
        throw new Error('Journal entry must have at least 2 lines')
      }

      const response = await fetch('/api/accounting/journal-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          lines: validLines,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create journal entry')
      }

      await fetchData()
      setAddDialogOpen(false)
      resetForm()
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handlePostEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to post this entry? Posted entries cannot be edited.')) return

    try {
      setActionLoading(true)
      const response = await fetch(`/api/accounting/journal-entries/${entryId}/post`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to post entry')
      }

      await fetchData()
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleViewEntry = async (entry: JournalEntry) => {
    try {
      const response = await fetch(`/api/accounting/journal-entries/${entry.id}`)
      if (!response.ok) throw new Error('Failed to fetch entry details')
      
      const data = await response.json()
      setSelectedEntry(entry)
      setSelectedEntryLines(data.lines || [])
      setViewDialogOpen(true)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const resetForm = () => {
    setFormData({
      entryDate: format(new Date(), 'yyyy-MM-dd'),
      periodId: periods.find(p => p.status === 'OPEN')?.id || '',
      description: '',
    })
    setLines([
      { lineNumber: 1, accountId: '', debit: 0, credit: 0, description: '' },
      { lineNumber: 2, accountId: '', debit: 0, credit: 0, description: '' },
    ])
  }

  const addLine = () => {
    setLines([...lines, {
      lineNumber: lines.length + 1,
      accountId: '',
      debit: 0,
      credit: 0,
      description: '',
    }])
  }

  const removeLine = (index: number) => {
    if (lines.length <= 2) {
      setError('Journal entry must have at least 2 lines')
      return
    }
    const newLines = lines.filter((_, i) => i !== index)
    newLines.forEach((line, i) => line.lineNumber = i + 1)
    setLines(newLines)
  }

  const updateLine = (index: number, field: keyof JournalEntryLine, value: any) => {
    const newLines = [...lines]
    newLines[index] = { ...newLines[index], [field]: value }
    
    if (field === 'debit' && value > 0) {
      newLines[index].credit = 0
    } else if (field === 'credit' && value > 0) {
      newLines[index].debit = 0
    }
    
    setLines(newLines)
  }

  const totalDebits = lines.reduce((sum, line) => sum + Number(line.debit || 0), 0)
  const totalCredits = lines.reduce((sum, line) => sum + Number(line.credit || 0), 0)
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01

  return (
    <ResponsiveLayout user={user}>
      <ResponsiveContainer>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ReceiptIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h4" fontWeight="bold">
              Journal Entries
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
          >
            Create Entry
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
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
                  <TableCell>Entry #</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Debits</TableCell>
                  <TableCell align="right">Credits</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {entry.entryNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {format(new Date(entry.entryDate), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {entry.description || <em>No description</em>}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {entry.sourceModule}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      ${entry.totalDebits.toFixed(2)}
                    </TableCell>
                    <TableCell align="right">
                      ${entry.totalCredits.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={entry.status}
                        color={statusColors[entry.status] as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleViewEntry(entry)}
                      >
                        <ViewIcon />
                      </IconButton>
                      {entry.status === 'DRAFT' && (
                        <Button
                          size="small"
                          startIcon={<PostIcon />}
                          onClick={() => handlePostEntry(entry.id)}
                          disabled={actionLoading}
                          color="primary"
                        >
                          Post
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {entries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No journal entries found. Create your first entry to get started.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Create Entry Dialog */}
        <Dialog 
          open={addDialogOpen} 
          onClose={() => setAddDialogOpen(false)} 
          maxWidth="md" 
          fullWidth
        >
          <DialogTitle>Create Journal Entry</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Entry Date"
                  type="date"
                  value={formData.entryDate}
                  onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                  required
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <FormControl fullWidth required>
                  <InputLabel>Accounting Period</InputLabel>
                  <Select
                    value={formData.periodId}
                    label="Accounting Period"
                    onChange={(e) => setFormData({ ...formData, periodId: e.target.value })}
                  >
                    {periods.filter(p => p.status === 'OPEN').map(period => (
                      <MenuItem key={period.id} value={period.id}>
                        {period.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={2}
                fullWidth
              />

              <Divider />

              <Typography variant="h6">Entry Lines</Typography>

              {lines.map((line, index) => (
                <Card key={index} variant="outlined">
                  <CardContent>
                    <Stack spacing={2}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle2">Line {line.lineNumber}</Typography>
                        {lines.length > 2 && (
                          <IconButton size="small" onClick={() => removeLine(index)} color="error">
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </Box>
                      <FormControl fullWidth required>
                        <InputLabel>Account</InputLabel>
                        <Select
                          value={line.accountId}
                          label="Account"
                          onChange={(e) => updateLine(index, 'accountId', e.target.value)}
                        >
                          {accounts.map(account => (
                            <MenuItem key={account.id} value={account.id}>
                              {account.code} - {account.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Stack direction="row" spacing={2}>
                        <TextField
                          label="Debit"
                          type="number"
                          value={line.debit || ''}
                          onChange={(e) => updateLine(index, 'debit', parseFloat(e.target.value) || 0)}
                          fullWidth
                          inputProps={{ min: 0, step: 0.01 }}
                        />
                        <TextField
                          label="Credit"
                          type="number"
                          value={line.credit || ''}
                          onChange={(e) => updateLine(index, 'credit', parseFloat(e.target.value) || 0)}
                          fullWidth
                          inputProps={{ min: 0, step: 0.01 }}
                        />
                      </Stack>
                      <TextField
                        label="Line Description"
                        value={line.description}
                        onChange={(e) => updateLine(index, 'description', e.target.value)}
                        fullWidth
                      />
                    </Stack>
                  </CardContent>
                </Card>
              ))}

              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addLine}
              >
                Add Line
              </Button>

              <Paper sx={{ p: 2, bgcolor: isBalanced ? 'success.light' : 'error.light' }}>
                <Stack direction="row" spacing={3} justifyContent="space-around">
                  <Box>
                    <Typography variant="caption" color="text.secondary">Total Debits</Typography>
                    <Typography variant="h6">${totalDebits.toFixed(2)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Total Credits</Typography>
                    <Typography variant="h6">${totalCredits.toFixed(2)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Difference</Typography>
                    <Typography variant="h6">${Math.abs(totalDebits - totalCredits).toFixed(2)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Status</Typography>
                    <Typography variant="h6" color={isBalanced ? 'success.main' : 'error.main'}>
                      {isBalanced ? '✓ Balanced' : '✗ Unbalanced'}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateEntry} 
              variant="contained"
              disabled={actionLoading || !isBalanced}
            >
              {actionLoading ? <CircularProgress size={24} /> : 'Create Entry'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Entry Dialog */}
        <Dialog 
          open={viewDialogOpen} 
          onClose={() => setViewDialogOpen(false)} 
          maxWidth="md" 
          fullWidth
        >
          <DialogTitle>
            Journal Entry Details: {selectedEntry?.entryNumber}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Date</Typography>
                <Typography variant="body1">
                  {selectedEntry && format(new Date(selectedEntry.entryDate), 'MMMM dd, yyyy')}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Description</Typography>
                <Typography variant="body1">{selectedEntry?.description || 'No description'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Status</Typography>
                <Chip 
                  label={selectedEntry?.status} 
                  color={selectedEntry ? statusColors[selectedEntry.status] as any : 'default'} 
                  size="small" 
                />
              </Box>

              <Divider />

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Account</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Debit</TableCell>
                      <TableCell align="right">Credit</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedEntryLines.map((line, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {line.accountCode}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {line.accountName}
                          </Typography>
                        </TableCell>
                        <TableCell>{line.description || '-'}</TableCell>
                        <TableCell align="right">
                          {line.debit > 0 ? `$${line.debit.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell align="right">
                          {line.credit > 0 ? `$${line.credit.toFixed(2)}` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={2}>
                        <Typography variant="subtitle2">Totals</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle2">
                          ${selectedEntryLines.reduce((sum, line) => sum + line.debit, 0).toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle2">
                          ${selectedEntryLines.reduce((sum, line) => sum + line.credit, 0).toFixed(2)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </ResponsiveContainer>
    </ResponsiveLayout>
  )
}
