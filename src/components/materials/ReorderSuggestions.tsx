'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  IconButton,
  Tooltip,
  LinearProgress,
} from '@mui/material'
import {
  Refresh as RefreshIcon,
  ShoppingCart as OrderIcon,
  TrendingUp,
  TrendingDown,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon,
} from '@mui/icons-material'

interface ReorderSuggestion {
  id: string
  code: string
  name: string
  category: string
  unit: string
  currentStock: number
  currentMinStock: number
  cost: number
  totalUsedPeriod: number
  usageTransactions: number
  jobsUsedOn: number
  avgDailyUsage: number
  trendFactor: number
  suggestedMinStock: number
  suggestedReorderPoint: number
  suggestedOrderQuantity: number
  confidenceScore: number
  daysUntilStockout: number
  estimatedLeadTimeDays: number
  urgency: string
  estimatedOrderCost: number
  reason: string
}

interface SuggestionSummary {
  totalSuggestions: number
  criticalItems: number
  urgentItems: number
  totalEstimatedCost: number
  avgConfidence: number
  period: number
  minConfidence: number
}

export default function ReorderSuggestions() {
  const [suggestions, setSuggestions] = useState<ReorderSuggestion[]>([])
  const [summary, setSummary] = useState<SuggestionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('90')
  const [minConfidence, setMinConfidence] = useState('0.7')

  useEffect(() => {
    fetchSuggestions()
  }, [period, minConfidence])

  const fetchSuggestions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ period, minConfidence })
      const response = await fetch(`/api/materials/reorder-suggestions?${params}`)
      
      if (!response.ok) throw new Error('Failed to fetch reorder suggestions')
      
      const data = await response.json()
      setSuggestions(data.suggestions || [])
      setSummary(data.summary || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load suggestions')
    } finally {
      setLoading(false)
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL': return 'error'
      case 'URGENT': return 'warning'
      case 'MEDIUM': return 'info'
      case 'LOW': return 'default'
      case 'NORMAL': return 'success'
      default: return 'default'
    }
  }

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL': return <WarningIcon sx={{ color: 'error.main' }} />
      case 'URGENT': return <WarningIcon sx={{ color: 'warning.main' }} />
      case 'MEDIUM': return <InfoIcon sx={{ color: 'info.main' }} />
      case 'LOW': return <InfoIcon sx={{ color: 'text.secondary' }} />
      case 'NORMAL': return <CheckIcon sx={{ color: 'success.main' }} />
      default: return <InfoIcon />
    }
  }

  const getTrendIcon = (trendFactor: number) => {
    if (trendFactor > 1.1) return <TrendingUp sx={{ color: 'error.main' }} />
    if (trendFactor < 0.9) return <TrendingDown sx={{ color: 'success.main' }} />
    return null
  }

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
  }

  const formatDays = (days: number) => {
    if (days >= 999) return '∞'
    return Math.round(days).toString()
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Analyzing usage patterns...</Typography>
      </Box>
    )
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Header Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Automated Reorder Suggestions
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Analysis Period</InputLabel>
            <Select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              label="Analysis Period"
            >
              <MenuItem value="30">Last 30 days</MenuItem>
              <MenuItem value="60">Last 60 days</MenuItem>
              <MenuItem value="90">Last 90 days</MenuItem>
              <MenuItem value="180">Last 6 months</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Min Confidence</InputLabel>
            <Select
              value={minConfidence}
              onChange={(e) => setMinConfidence(e.target.value)}
              label="Min Confidence"
            >
              <MenuItem value="0.5">50%</MenuItem>
              <MenuItem value="0.6">60%</MenuItem>
              <MenuItem value="0.7">70%</MenuItem>
              <MenuItem value="0.8">80%</MenuItem>
              <MenuItem value="0.9">90%</MenuItem>
            </Select>
          </FormControl>
          
          <IconButton onClick={fetchSuggestions} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Box>

      {/* Summary Cards */}
      {summary && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography color="text.secondary" variant="caption">
                Total Suggestions
              </Typography>
              <Typography variant="h6">{summary.totalSuggestions}</Typography>
            </CardContent>
          </Card>
          
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography color="text.secondary" variant="caption">
                Critical Items
              </Typography>
              <Typography variant="h6" color="error">
                {summary.criticalItems}
              </Typography>
            </CardContent>
          </Card>
          
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography color="text.secondary" variant="caption">
                Urgent Items
              </Typography>
              <Typography variant="h6" color="warning.main">
                {summary.urgentItems}
              </Typography>
            </CardContent>
          </Card>
          
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography color="text.secondary" variant="caption">
                Estimated Order Cost
              </Typography>
              <Typography variant="h6" color="primary">
                {formatCurrency(summary.totalEstimatedCost)}
              </Typography>
            </CardContent>
          </Card>
          
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography color="text.secondary" variant="caption">
                Avg Confidence
              </Typography>
              <Typography variant="h6">
                {Math.round(summary.avgConfidence * 100)}%
              </Typography>
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* Suggestions Table */}
      {suggestions.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <CheckIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" color="success.main">
              No Reorder Suggestions
            </Typography>
            <Typography color="text.secondary">
              All materials are adequately stocked based on current usage patterns.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Material</TableCell>
                    <TableCell align="center">Urgency</TableCell>
                    <TableCell align="right">Current Stock</TableCell>
                    <TableCell align="right">Suggested Reorder</TableCell>
                    <TableCell align="right">Order Qty</TableCell>
                    <TableCell align="right">Est. Cost</TableCell>
                    <TableCell align="right">Days Left</TableCell>
                    <TableCell align="center">Confidence</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {suggestions.map((suggestion) => (
                    <TableRow key={suggestion.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {suggestion.code}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {suggestion.name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              {suggestion.category}
                            </Typography>
                            {getTrendIcon(suggestion.trendFactor) && (
                              <Tooltip title={`Usage trend: ${((suggestion.trendFactor - 1) * 100).toFixed(1)}%`}>
                                <Box sx={{ ml: 1 }}>
                                  {getTrendIcon(suggestion.trendFactor)}
                                </Box>
                              </Tooltip>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                          {getUrgencyIcon(suggestion.urgency)}
                          <Chip
                            label={suggestion.urgency}
                            size="small"
                            color={getUrgencyColor(suggestion.urgency) as any}
                            variant="outlined"
                          />
                        </Box>
                      </TableCell>
                      
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {suggestion.currentStock.toLocaleString()} {suggestion.unit}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Min: {suggestion.currentMinStock} {suggestion.unit}
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium" color="primary">
                          {suggestion.suggestedReorderPoint.toLocaleString()} {suggestion.unit}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Suggested min: {suggestion.suggestedMinStock}
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {suggestion.suggestedOrderQuantity.toLocaleString()} {suggestion.unit}
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {formatCurrency(suggestion.estimatedOrderCost)}
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="right">
                        <Typography 
                          variant="body2" 
                          fontWeight="medium"
                          color={suggestion.daysUntilStockout <= 7 ? 'error' : 
                                 suggestion.daysUntilStockout <= 14 ? 'warning.main' : 'text.primary'}
                        >
                          {formatDays(suggestion.daysUntilStockout)}
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="center">
                        <LinearProgress
                          variant="determinate"
                          value={suggestion.confidenceScore * 100}
                          color={suggestion.confidenceScore >= 0.8 ? 'success' : 
                                 suggestion.confidenceScore >= 0.6 ? 'warning' : 'error'}
                          sx={{ width: 60 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {Math.round(suggestion.confidenceScore * 100)}%
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Tooltip title={suggestion.reason}>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'block'
                            }}
                          >
                            {suggestion.reason}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<OrderIcon />}
                          onClick={() => {
                            // Future: Integrate with ordering system
                            alert(`Create order for ${suggestion.suggestedOrderQuantity} ${suggestion.unit} of ${suggestion.name}`)
                          }}
                        >
                          Order
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}