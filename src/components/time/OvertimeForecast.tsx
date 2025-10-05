'use client'

import { Box, Card, CardContent, Typography, LinearProgress, Chip, Alert } from '@mui/material'
import {
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material'
import { useOvertimeForecast } from '@/hooks/useOvertimeForecast'

interface OvertimeForecastProps {
  userId: string
  weekDate?: Date
  additionalHours?: number
  compact?: boolean
}

export default function OvertimeForecast({
  userId,
  weekDate = new Date(),
  additionalHours = 0,
  compact = false,
}: OvertimeForecastProps) {
  const { forecast, loading, error } = useOvertimeForecast(userId, weekDate, additionalHours)

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
      </Box>
    )
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>
  }

  const getStatusColor = () => {
    switch (forecast.status) {
      case 'safe':
        return 'success'
      case 'approaching':
        return 'warning'
      case 'overtime':
        return 'warning'
      case 'excessive':
        return 'error'
      default:
        return 'default'
    }
  }

  const getStatusIcon = () => {
    switch (forecast.status) {
      case 'safe':
        return <CheckCircleIcon fontSize="small" />
      case 'approaching':
        return <WarningIcon fontSize="small" />
      case 'overtime':
        return <TrendingUpIcon fontSize="small" />
      case 'excessive':
        return <ErrorIcon fontSize="small" />
      default:
        return null
    }
  }

  const getStatusMessage = () => {
    switch (forecast.status) {
      case 'safe':
        return `${forecast.hoursUntilOvertime.toFixed(1)} hours until overtime`
      case 'approaching':
        return `Approaching overtime threshold (${forecast.hoursUntilOvertime.toFixed(1)} hrs remaining)`
      case 'overtime':
        return `${forecast.overtimeHours.toFixed(1)} hours of overtime this week`
      case 'excessive':
        return `Excessive hours! ${forecast.doubleTimeHours.toFixed(1)} hours double-time`
      default:
        return ''
    }
  }

  const getProgressColor = () => {
    if (forecast.percentToOvertime < 80) return 'success'
    if (forecast.percentToOvertime < 100) return 'warning'
    return 'error'
  }

  if (compact) {
    return (
      <Box sx={{ mt: 2, mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="caption" color="text.secondary">
            Weekly Progress
          </Typography>
          <Chip
            icon={getStatusIcon()}
            label={`${forecast.weeklyHours.toFixed(1)} / 40 hrs`}
            size="small"
            color={getStatusColor()}
          />
        </Box>
        <LinearProgress
          variant="determinate"
          value={Math.min(forecast.percentToOvertime, 100)}
          color={getProgressColor()}
          sx={{ height: 8, borderRadius: 1 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {getStatusMessage()}
        </Typography>
      </Box>
    )
  }

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="subtitle1" fontWeight="medium">
            Overtime Forecast
          </Typography>
          <Chip
            icon={getStatusIcon()}
            label={forecast.status.toUpperCase()}
            color={getStatusColor()}
            size="small"
          />
        </Box>

        <Box mb={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Weekly Hours
            </Typography>
            <Typography variant="h6">{forecast.weeklyHours.toFixed(1)} hrs</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(forecast.percentToOvertime, 100)}
            color={getProgressColor()}
            sx={{ height: 10, borderRadius: 1 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {getStatusMessage()}
          </Typography>
        </Box>

        <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={2}>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Regular Hours
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {forecast.regularHours.toFixed(1)}
            </Typography>
          </Box>

          {forecast.overtimeHours > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Overtime (1.5x)
              </Typography>
              <Typography variant="body1" fontWeight="medium" color="warning.main">
                {forecast.overtimeHours.toFixed(1)}
              </Typography>
            </Box>
          )}

          {forecast.doubleTimeHours > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Double Time (2x)
              </Typography>
              <Typography variant="body1" fontWeight="medium" color="error.main">
                {forecast.doubleTimeHours.toFixed(1)}
              </Typography>
            </Box>
          )}

          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Est. Weekly Pay
            </Typography>
            <Typography variant="body1" fontWeight="medium" color="success.main">
              ${forecast.estimatedPay.toFixed(2)}
            </Typography>
          </Box>
        </Box>

        {forecast.status === 'approaching' && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            You're approaching the 40-hour overtime threshold. Additional hours will be paid at 1.5x
            your regular rate.
          </Alert>
        )}

        {forecast.status === 'excessive' && (
          <Alert severity="error" sx={{ mt: 2 }}>
            You have excessive hours this week. Please verify your entries are correct and consider
            taking time off to avoid burnout.
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
