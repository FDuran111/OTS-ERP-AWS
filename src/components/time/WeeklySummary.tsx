'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, Typography, Box, Chip, CircularProgress, Alert } from '@mui/material'
import { format, startOfWeek } from 'date-fns'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PendingIcon from '@mui/icons-material/Pending'
import ErrorIcon from '@mui/icons-material/Error'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import CommentIcon from '@mui/icons-material/Comment'

interface WeeklySummaryProps {
  userId?: string
  weekDate?: Date
  onRefresh?: () => void
}

interface DailyBreakdown {
  date: string
  totalHours: number
  regularHours: number
  overtimeHours: number
  doubleTimeHours: number
  status: string
  entries: Array<{
    id: string
    jobNumber: string
    jobTitle: string
    hours: number
    status: string
    hasPhotos: boolean
    hasNotes: boolean
  }>
}

interface WeeklySummaryData {
  weekStart: string
  weekEnd: string
  totalEntries: number
  regularHours: number
  overtimeHours: number
  doubleTimeHours: number
  totalHours: number
  totalPay: number
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PARTIAL'
  breakdown: DailyBreakdown[]
  hasRejections: boolean
  hasPhotos: boolean
}

export default function WeeklySummary({ userId, weekDate = new Date(), onRefresh }: WeeklySummaryProps) {
  const [summary, setSummary] = useState<WeeklySummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSummary = async () => {
    try {
      setLoading(true)
      setError(null)

      const weekStart = startOfWeek(weekDate, { weekStartsOn: 0 })
      const weekParam = format(weekStart, 'yyyy-MM-dd')
      
      const params = new URLSearchParams({ week: weekParam })
      if (userId) params.append('userId', userId)

      const response = await fetch(`/api/time-entries/weekly-summary?${params}`)
      if (!response.ok) throw new Error('Failed to fetch summary')

      const data = await response.json()
      setSummary(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load summary')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSummary()
  }, [userId, weekDate])

  useEffect(() => {
    if (onRefresh) {
      const handler = () => fetchSummary()
      window.addEventListener('time-entry-updated', handler)
      return () => window.removeEventListener('time-entry-updated', handler)
    }
  }, [onRefresh])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'success'
      case 'SUBMITTED': return 'info'
      case 'REJECTED': return 'error'
      case 'PARTIAL': return 'warning'
      default: return 'default'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return <CheckCircleIcon fontSize="small" />
      case 'SUBMITTED': return <PendingIcon fontSize="small" />
      case 'REJECTED': return <ErrorIcon fontSize="small" />
      default: return <AccessTimeIcon fontSize="small" />
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>
  }

  if (!summary || summary.totalEntries === 0) {
    return (
      <Alert severity="info">
        No time entries for week of {format(weekDate, 'MMM d, yyyy')}
      </Alert>
    )
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Week of {format(new Date(summary.weekStart), 'MMM d')} - {format(new Date(summary.weekEnd), 'MMM d, yyyy')}
          </Typography>
          <Chip
            icon={getStatusIcon(summary.status)}
            label={summary.status === 'PARTIAL' ? 'Partially Approved' : summary.status}
            color={getStatusColor(summary.status)}
            size="small"
          />
        </Box>

        <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={2} mb={3}>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Regular Hours
            </Typography>
            <Typography variant="h6">
              {summary.regularHours.toFixed(2)}
            </Typography>
          </Box>

          {summary.overtimeHours > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Overtime (1.5x)
              </Typography>
              <Typography variant="h6" color="warning.main">
                {summary.overtimeHours.toFixed(2)}
              </Typography>
            </Box>
          )}

          {summary.doubleTimeHours > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Double Time (2x)
              </Typography>
              <Typography variant="h6" color="error.main">
                {summary.doubleTimeHours.toFixed(2)}
              </Typography>
            </Box>
          )}

          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Total Hours
            </Typography>
            <Typography variant="h6">
              {summary.totalHours.toFixed(2)}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Estimated Pay
            </Typography>
            <Typography variant="h6" color="success.main">
              ${summary.totalPay.toFixed(2)}
            </Typography>
          </Box>
        </Box>

        {summary.hasRejections && (
          <Alert severity="warning" sx={{ mb: 2 }} icon={<CommentIcon />}>
            Some entries have rejection notes. Please review and address them.
          </Alert>
        )}

        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Daily Breakdown
        </Typography>

        <Box display="flex" flexDirection="column" gap={1}>
          {summary.breakdown.map((day) => (
            <Box
              key={day.date}
              sx={{
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                backgroundColor: day.status === 'REJECTED' ? 'error.light' : 'background.default',
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2" fontWeight="medium">
                  {format(new Date(day.date), 'EEEE, MMM d')}
                </Typography>
                <Box display="flex" gap={1} alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    {day.totalHours.toFixed(2)} hrs
                  </Typography>
                  <Chip
                    label={day.status}
                    size="small"
                    color={getStatusColor(day.status)}
                  />
                </Box>
              </Box>

              {day.entries.map((entry) => (
                <Box
                  key={entry.id}
                  sx={{
                    ml: 2,
                    pl: 2,
                    borderLeft: '2px solid',
                    borderColor: 'divider',
                    py: 0.5,
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                      {entry.jobNumber} - {entry.jobTitle || 'No description'}
                    </Typography>
                    <Box display="flex" gap={0.5} alignItems="center">
                      <Typography variant="caption">{entry.hours.toFixed(2)} hrs</Typography>
                      {entry.hasPhotos && <CameraAltIcon fontSize="small" sx={{ fontSize: 14 }} />}
                      {entry.hasNotes && <CommentIcon fontSize="small" sx={{ fontSize: 14 }} />}
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  )
}
