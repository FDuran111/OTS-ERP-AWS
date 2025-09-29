'use client'

import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineDot,
  TimelineConnector,
  TimelineContent,
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
} from '@mui/material'
import {
  Edit as EditIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  CheckCircle as ApproveIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  ArrowForward as ArrowIcon,
  Close as CloseIcon,
  FilterList as FilterIcon,
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
}

export default function TimeEntryAuditTrail({
  entryId,
  userId,
  limit = 50,
  showFilters = false,
}: TimeEntryAuditTrailProps) {
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [filterDialog, setFilterDialog] = useState(false)
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

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <AddIcon />
      case 'UPDATE':
        return <EditIcon />
      case 'DELETE':
        return <DeleteIcon />
      case 'APPROVE':
        return <ApproveIcon />
      default:
        return <HistoryIcon />
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
        return 'grey'
    }
  }

  const formatChange = (label: string, oldValue: any, newValue: any, suffix?: string) => {
    if (oldValue === newValue || (oldValue == null && newValue == null)) return null
    
    return (
      <Box sx={{ my: 0.5 }}>
        <Typography variant="body2" color="text.secondary">
          {label}:
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label={oldValue != null ? `${oldValue}${suffix || ''}` : 'None'}
            size="small"
            variant="outlined"
            sx={{ textDecoration: 'line-through', opacity: 0.7 }}
          />
          <ArrowIcon fontSize="small" />
          <Chip
            label={newValue != null ? `${newValue}${suffix || ''}` : 'None'}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Stack>
      </Box>
    )
  }

  const renderAuditDetails = (entry: AuditEntry) => {
    const changes = []

    if (entry.action === 'CREATE') {
      return (
        <Typography variant="body2" color="text.secondary">
          Created new time entry with {entry.newHours} hours
        </Typography>
      )
    }

    if (entry.action === 'DELETE') {
      return (
        <Typography variant="body2" color="text.secondary">
          Deleted time entry ({entry.oldHours} hours)
        </Typography>
      )
    }

    // For UPDATE actions, show what changed
    if (entry.oldHours !== entry.newHours) {
      changes.push(formatChange('Hours', entry.oldHours, entry.newHours, 'h'))
    }
    if (entry.oldRegular !== entry.newRegular) {
      changes.push(formatChange('Regular Hours', entry.oldRegular, entry.newRegular, 'h'))
    }
    if (entry.oldOvertime !== entry.newOvertime) {
      changes.push(formatChange('Overtime Hours', entry.oldOvertime, entry.newOvertime, 'h'))
    }
    if (entry.oldDoubletime !== entry.newDoubletime) {
      changes.push(formatChange('Double-Time Hours', entry.oldDoubletime, entry.newDoubletime, 'h'))
    }
    if (entry.oldPay !== entry.newPay) {
      changes.push(formatChange('Estimated Pay', 
        entry.oldPay?.toFixed(2), 
        entry.newPay?.toFixed(2), 
        '$'
      ))
    }
    if (entry.oldDate !== entry.newDate) {
      changes.push(formatChange('Date', 
        entry.oldDate ? format(new Date(entry.oldDate), 'MMM d, yyyy') : null,
        entry.newDate ? format(new Date(entry.newDate), 'MMM d, yyyy') : null
      ))
    }
    if (entry.oldDescription !== entry.newDescription) {
      changes.push(formatChange('Description', entry.oldDescription, entry.newDescription))
    }

    return <Box>{changes.filter(Boolean)}</Box>
  }

  const applyFilters = () => {
    setFilterDialog(false)
    fetchAuditTrail()
  }

  return (
    <>
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" component="div">
              <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Audit Trail
            </Typography>
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

          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : auditEntries.length === 0 ? (
            <Alert severity="info">
              No audit history available
            </Alert>
          ) : (
            <Timeline position="right">
              {auditEntries.map((entry, index) => (
                <TimelineItem key={entry.id}>
                  <TimelineSeparator>
                    <TimelineDot color={getActionColor(entry.action) as any}>
                      {getActionIcon(entry.action)}
                    </TimelineDot>
                    {index < auditEntries.length - 1 && <TimelineConnector />}
                  </TimelineSeparator>
                  <TimelineContent>
                    <Card variant="outlined" sx={{ mb: 2 }}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {entry.action}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {format(new Date(entry.changedAt), 'MMM d, yyyy h:mm a')}
                            </Typography>
                          </Box>
                          <Chip
                            icon={<PersonIcon />}
                            label={entry.changedByName || entry.changedBy}
                            size="small"
                            variant="outlined"
                          />
                        </Stack>

                        {renderAuditDetails(entry)}

                        {entry.changeReason && (
                          <Alert severity="info" sx={{ mt: 1 }}>
                            <Typography variant="caption">
                              Reason: {entry.changeReason}
                            </Typography>
                          </Alert>
                        )}

                        {entry.ipAddress && (
                          <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
                            IP: {entry.ipAddress}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </TimelineContent>
                </TimelineItem>
              ))}
            </Timeline>
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