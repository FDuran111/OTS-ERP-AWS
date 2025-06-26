'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  Box,
  Typography,
  Avatar,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  LinearProgress,
  Stack,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Tooltip
} from '@mui/material'
import {
  Refresh as RefreshIcon,
  Work as WorkIcon,
  AccessTime as TimeIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon
} from '@mui/icons-material'

interface ActiveEntry {
  id: string
  userId: string
  userName: string
  jobNumber: string
  jobTitle: string
  clockInTime: string
  currentHours: number
  estimatedCost: number
  hourlyRate: number
  location?: {
    latitude: number
    longitude: number
  }
}

interface RealtimeCostData {
  activeEntries: ActiveEntry[]
  activeCosts: {
    activeWorkers: number
    totalActiveHours: number
    totalEstimatedCost: number
  }
  todaysSummary: {
    completedEntries: number
    totalHours: number
    totalCost: number
    averageRate: number
  }
  budgetAnalysis: {
    estimatedValue: number
    billedAmount: number
    actualCosts: number
    laborCosts: number
    materialCosts: number
    equipmentCosts: number
    remainingBudget: number
    costPercentage: number
  } | null
  recentActivity: Array<{
    id: string
    userName: string
    clockInTime: string
    clockOutTime: string
    totalHours: number
    totalCost: number
    hourlyRate: number
    workDescription?: string
  }>
  burnRate: {
    avgCostPerHour: number
    weeklyEntries: number
    weeklyTotal: number
  }
  summary: {
    totalEstimatedCurrentCost: number
    activeWorkers: number
    todaysTotalHours: number
    projectedDailyCost: number
    budgetHealth: {
      status: 'GOOD' | 'WARNING' | 'DANGER'
      percentage: number
      remaining: number
    } | null
  }
  timestamp: string
}

interface RealTimeJobCostsProps {
  jobId: string
  jobNumber?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

export default function RealTimeJobCosts({ 
  jobId, 
  jobNumber, 
  autoRefresh = true, 
  refreshInterval = 60000 // 1 minute
}: RealTimeJobCostsProps) {
  const [data, setData] = useState<RealtimeCostData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchRealTimeData = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch(`/api/jobs/${jobId}/costs/realtime`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch real-time data: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        setData(result)
        setLastUpdated(new Date())
      } else {
        setError(result.error || 'Failed to fetch data')
      }
    } catch (err) {
      console.error('Error fetching real-time costs:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    fetchRealTimeData()
  }, [fetchRealTimeData])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchRealTimeData, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchRealTimeData])

  const getBudgetStatusColor = (status: string) => {
    switch (status) {
      case 'GOOD': return 'success'
      case 'WARNING': return 'warning'
      case 'DANGER': return 'error'
      default: return 'default'
    }
  }

  const getBudgetStatusIcon = (status: string) => {
    switch (status) {
      case 'GOOD': return <CheckIcon />
      case 'WARNING': return <WarningIcon />
      case 'DANGER': return <ErrorIcon />
      default: return <CheckIcon />
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`
  }

  const getTimeAgo = (clockInTime: string) => {
    const now = new Date()
    const clockIn = new Date(clockInTime)
    const diffMinutes = Math.floor((now.getTime() - clockIn.getTime()) / 60000)
    
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`
    } else {
      const hours = Math.floor(diffMinutes / 60)
      const minutes = diffMinutes % 60
      return `${hours}h ${minutes}m ago`
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
        <IconButton size="small" onClick={fetchRealTimeData} sx={{ ml: 1 }}>
          <RefreshIcon />
        </IconButton>
      </Alert>
    )
  }

  if (!data) return null

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Real-Time Job Costs
          </Typography>
          {jobNumber && (
            <Typography variant="body2" color="text.secondary">
              Job #{jobNumber}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Last updated: {lastUpdated?.toLocaleTimeString()}
          </Typography>
          <IconButton size="small" onClick={fetchRealTimeData}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
        <Box sx={{ flex: '1 1 calc(25% - 24px)', minWidth: '250px' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4">
                    {data.summary.activeWorkers}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Workers
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 calc(25% - 24px)', minWidth: '250px' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <TimeIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4">
                    {formatHours(data.summary.todaysTotalHours)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Today's Hours
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 calc(25% - 24px)', minWidth: '250px' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <MoneyIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4">
                    {formatCurrency(data.summary.projectedDailyCost)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Projected Daily Cost
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 calc(25% - 24px)', minWidth: '250px' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ 
                  bgcolor: data.summary.budgetHealth ? 
                    `${getBudgetStatusColor(data.summary.budgetHealth.status)}.main` : 
                    'grey.500' 
                }}>
                  {data.summary.budgetHealth ? 
                    getBudgetStatusIcon(data.summary.budgetHealth.status) : 
                    <WorkIcon />
                  }
                </Avatar>
                <Box>
                  <Typography variant="h4">
                    {data.summary.budgetHealth ? 
                      `${data.summary.budgetHealth.percentage.toFixed(0)}%` : 
                      'N/A'
                    }
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Budget Used
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Budget Progress */}
      {data.budgetAnalysis && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Budget Analysis
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">
                  Costs vs Budget
                </Typography>
                <Typography variant="body2">
                  {formatCurrency(data.budgetAnalysis.actualCosts)} / {formatCurrency(data.budgetAnalysis.estimatedValue)}
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={Math.min(data.budgetAnalysis.costPercentage, 100)}
                color={getBudgetStatusColor(data.summary.budgetHealth?.status || 'GOOD')}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: '1 1 calc(25% - 16px)', minWidth: '120px' }}>
                <Typography variant="body2" color="text.secondary">Labor</Typography>
                <Typography variant="body1">{formatCurrency(data.budgetAnalysis.laborCosts)}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 calc(25% - 16px)', minWidth: '120px' }}>
                <Typography variant="body2" color="text.secondary">Materials</Typography>
                <Typography variant="body1">{formatCurrency(data.budgetAnalysis.materialCosts)}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 calc(25% - 16px)', minWidth: '120px' }}>
                <Typography variant="body2" color="text.secondary">Equipment</Typography>
                <Typography variant="body1">{formatCurrency(data.budgetAnalysis.equipmentCosts)}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 calc(25% - 16px)', minWidth: '120px' }}>
                <Typography variant="body2" color="text.secondary">Remaining</Typography>
                <Typography 
                  variant="body1" 
                  color={data.budgetAnalysis.remainingBudget >= 0 ? 'success.main' : 'error.main'}
                >
                  {formatCurrency(data.budgetAnalysis.remainingBudget)}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {/* Active Workers */}
        <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '300px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Active Workers ({data.activeEntries.length})
              </Typography>
              {data.activeEntries.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  No workers currently clocked in
                </Typography>
              ) : (
                <List>
                  {data.activeEntries.map((entry) => (
                    <ListItem key={entry.id} sx={{ px: 0 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {entry.userName.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={entry.userName}
                        secondary={
                          <Box>
                            <Typography variant="caption" display="block">
                              Clocked in {getTimeAgo(entry.clockInTime)}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                              <Chip 
                                label={formatHours(entry.currentHours)}
                                size="small"
                                color="info"
                              />
                              <Chip 
                                label={formatCurrency(entry.estimatedCost)}
                                size="small"
                                color="success"
                              />
                              {entry.location && (
                                <Tooltip title="GPS Location Available">
                                  <LocationIcon fontSize="small" color="action" />
                                </Tooltip>
                              )}
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Recent Activity */}
        <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '300px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activity (24h)
              </Typography>
              {data.recentActivity.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  No recent activity
                </Typography>
              ) : (
                <List>
                  {data.recentActivity.slice(0, 5).map((activity) => (
                    <ListItem key={activity.id} sx={{ px: 0 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'success.main' }}>
                          <CheckIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={activity.userName}
                        secondary={
                          <Box>
                            <Typography variant="caption" display="block">
                              {new Date(activity.clockOutTime).toLocaleTimeString()}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                              <Chip 
                                label={formatHours(activity.totalHours)}
                                size="small"
                                variant="outlined"
                              />
                              <Chip 
                                label={formatCurrency(activity.totalCost)}
                                size="small"
                                variant="outlined"
                                color="success"
                              />
                            </Box>
                            {activity.workDescription && (
                              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                {activity.workDescription}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  )
}