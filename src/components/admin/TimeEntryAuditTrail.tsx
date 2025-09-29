'use client'

import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Stack,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  MenuItem,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material'
import {
  Edit as EditIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  CheckCircle as ApproveIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  Close as CloseIcon,
  FilterList as FilterIcon,
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowUp as CollapseIcon,
} from '@mui/icons-material'
import { format } from 'date-fns'

interface AuditEntry {
  id: string
  entryId: string
  userId: string
  userName?: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT'
  oldHours?: number
  newHours?: number
  oldRegular?: number
  newRegular?: number
  oldOvertime?: number
  newOvertime?: number
  oldDoubletime?: number
  newDoubletime?: number
  oldPay?: number
  newPay?: number
  oldJobId?: string
  newJobId?: string
  oldDate?: string
  newDate?: string
  oldDescription?: string
  newDescription?: string
  changedBy: string
  changedByName?: string
  changedAt: string
  changeReason?: string
  ipAddress?: string
}

interface TimeEntryAuditTrailProps {
  entryId?: string
  userId?: string
  limit?: number
  showFilters?: boolean
  showTitle?: boolean
}

export default function TimeEntryAuditTrail({
  entryId,
  userId,
  limit = 50,
  showFilters = false,
  showTitle = false,
}: TimeEntryAuditTrailProps) {
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [filterDialog, setFilterDialog] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [filters, setFilters] = useState({
    action: '',
    changedBy: '',
    dateFrom: '',
    dateTo: '',
  })

  useEffect(() => {
    fetchAuditTrail()
  }, [entryId, userId])

  const fetchAuditTrail = async () => {
    setLoading(true)
    try {
      let url = '/api/audit-trail?'
      const params = new URLSearchParams()

      if (entryId) params.append('entryId', entryId)
      if (userId) params.append('userId', userId)
      params.append('limit', limit.toString())

      if (filters.action) params.append('action', filters.action)
      if (filters.changedBy) params.append('changedBy', filters.changedBy)
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)

      const response = await fetch(url + params.toString(), {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setAuditEntries(data)
      }
    } catch (error) {
      console.error('Error fetching audit trail:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'success'
      case 'UPDATE':
        return 'primary'
      case 'DELETE':
        return 'error'
      case 'APPROVE':
        return 'success'
      case 'REJECT':
        return 'warning'
      default:
        return 'default'
    }
  }

  const getChangesSummary = (entry: AuditEntry): string => {
    const changes: string[] = []

    if (entry.action === 'CREATE') {
      return `Created entry with ${entry.newHours} hours`
    }

    if (entry.action === 'DELETE') {
      return `Deleted entry (${entry.oldHours} hours)`
    }

    // For UPDATE actions
    if (entry.oldHours !== entry.newHours && entry.oldHours != null && entry.newHours != null) {
      changes.push(`Hours: ${entry.oldHours} → ${entry.newHours}`)
    }
    if (entry.oldRegular !== entry.newRegular && entry.oldRegular != null && entry.newRegular != null) {
      changes.push(`Regular: ${entry.oldRegular}h → ${entry.newRegular}h`)
    }
    if (entry.oldOvertime !== entry.newOvertime && entry.oldOvertime != null && entry.newOvertime != null) {
      changes.push(`OT: ${entry.oldOvertime}h → ${entry.newOvertime}h`)
    }
    if (entry.oldDoubletime !== entry.newDoubletime && entry.oldDoubletime != null && entry.newDoubletime != null) {
      changes.push(`DT: ${entry.oldDoubletime}h → ${entry.newDoubletime}h`)
    }
    if (entry.oldPay !== entry.newPay && entry.oldPay != null && entry.newPay != null) {
      changes.push(`Pay: $${entry.oldPay.toFixed(2)} → $${entry.newPay.toFixed(2)}`)
    }
    if (entry.oldDate !== entry.newDate && entry.oldDate && entry.newDate) {
      changes.push(`Date: ${format(new Date(entry.oldDate), 'MM/dd')} → ${format(new Date(entry.newDate), 'MM/dd')}`)
    }

    return changes.length > 0 ? changes.join(', ') : 'No changes'
  }

  const applyFilters = () => {
    setFilterDialog(false)
    fetchAuditTrail()
  }

  const displayedEntries = showAll ? auditEntries : auditEntries.slice(0, 3)

  return (
    <>
      <Card>
        <CardContent>
          {(showTitle || showFilters) && (
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              {showTitle ? (
                <Typography variant="h6">
                  📝 Audit Trail
                </Typography>
              ) : (
                <Box />
              )}
              {showFilters && (
                <IconButton
                  size="small"
                  onClick={() => setFilterDialog(true)}
                  color="primary"
                >
                  <FilterIcon />
                </IconButton>
              )}
            </Stack>
          )}

          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : auditEntries.length === 0 ? (
            <Alert severity="info">
              No audit history available
            </Alert>
          ) : (
            <>
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: showAll ? 400 : 'auto', overflow: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date & Time</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Employee</TableCell>
                      <TableCell>Changes</TableCell>
                      <TableCell>Changed By</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {displayedEntries.map((entry) => (
                      <TableRow key={entry.id} hover>
                        <TableCell>
                          <Typography variant="body2">
                            {format(new Date(entry.changedAt), 'MMM d, yyyy')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {format(new Date(entry.changedAt), 'h:mm a')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={entry.action}
                            size="small"
                            color={getActionColor(entry.action) as any}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {entry.userName || 'Unknown'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                            {getChangesSummary(entry)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <PersonIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {entry.changedByName || 'System'}
                            </Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {auditEntries.length > 3 && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Button
                    size="small"
                    onClick={() => setShowAll(!showAll)}
                    endIcon={showAll ? <CollapseIcon /> : <ExpandMoreIcon />}
                  >
                    {showAll
                      ? 'Show Less'
                      : `Show All (${auditEntries.length} entries)`
                    }
                  </Button>
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Filter Dialog */}
      <Dialog
        open={filterDialog}
        onClose={() => setFilterDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Filter Audit Trail
          <IconButton
            onClick={() => setFilterDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              select
              label="Action Type"
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              fullWidth
            >
              <MenuItem value="">All Actions</MenuItem>
              <MenuItem value="CREATE">Create</MenuItem>
              <MenuItem value="UPDATE">Update</MenuItem>
              <MenuItem value="DELETE">Delete</MenuItem>
              <MenuItem value="APPROVE">Approve</MenuItem>
              <MenuItem value="REJECT">Reject</MenuItem>
            </TextField>

            <TextField
              label="Changed By"
              value={filters.changedBy}
              onChange={(e) => setFilters({ ...filters, changedBy: e.target.value })}
              placeholder="User ID or Name"
              fullWidth
            />

            <TextField
              label="Date From"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            <TextField
              label="Date To"
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>

          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
            <Button
              onClick={() => {
                setFilters({ action: '', changedBy: '', dateFrom: '', dateTo: '' })
                setFilterDialog(false)
                fetchAuditTrail()
              }}
            >
              Clear Filters
            </Button>
            <Button variant="contained" onClick={applyFilters}>
              Apply Filters
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  )
}