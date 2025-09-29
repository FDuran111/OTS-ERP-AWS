'use client'

import React from 'react'
import {
  Box,
  Typography,
  Chip,
  Stack,
  Tooltip,
  LinearProgress,
  Paper,
} from '@mui/material'
import {
  Schedule,
  TrendingUp,
  Speed,
  Info as InfoIcon,
} from '@mui/icons-material'
import { formatHours } from '@/lib/timeCalculations'

interface HoursBreakdownProps {
  regularHours: number
  overtimeHours: number
  doubleTimeHours: number
  totalHours: number
  dailyThreshold?: number
  weeklyTotal?: number
  weeklyThreshold?: number
  consecutiveDay?: number
  isSeventhDay?: boolean
  showDetails?: boolean
}

export default function HoursBreakdownDisplay({
  regularHours,
  overtimeHours,
  doubleTimeHours,
  totalHours,
  dailyThreshold = 8,
  weeklyTotal,
  weeklyThreshold = 40,
  consecutiveDay,
  isSeventhDay = false,
  showDetails = true,
}: HoursBreakdownProps) {
  const getChipColor = (type: 'regular' | 'overtime' | 'double') => {
    switch (type) {
      case 'regular':
        return 'success'
      case 'overtime':
        return 'warning'
      case 'double':
        return 'error'
      default:
        return 'default'
    }
  }

  const progressPercentage = weeklyTotal
    ? Math.min((weeklyTotal / weeklyThreshold) * 100, 100)
    : (totalHours / dailyThreshold) * 100

  return (
    <Box sx={{ width: '100%' }}>
      <Stack spacing={1}>
        {/* Hours Breakdown Chips */}
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {regularHours > 0 && (
            <Tooltip title="Regular pay rate">
              <Chip
                icon={<Schedule />}
                label={`Regular: ${formatHours(regularHours)}`}
                color={getChipColor('regular')}
                size="small"
                variant="filled"
              />
            </Tooltip>
          )}

          {overtimeHours > 0 && (
            <Tooltip title="1.5x pay rate">
              <Chip
                icon={<TrendingUp />}
                label={`OT: ${formatHours(overtimeHours)}`}
                color={getChipColor('overtime')}
                size="small"
                variant="filled"
              />
            </Tooltip>
          )}

          {doubleTimeHours > 0 && (
            <Tooltip title="2x pay rate">
              <Chip
                icon={<Speed />}
                label={`DT: ${formatHours(doubleTimeHours)}`}
                color={getChipColor('double')}
                size="small"
                variant="filled"
              />
            </Tooltip>
          )}

          {isSeventhDay && (
            <Tooltip title="7th consecutive work day - special overtime rules apply">
              <Chip
                icon={<InfoIcon />}
                label="7th Day"
                color="info"
                size="small"
                variant="outlined"
              />
            </Tooltip>
          )}
        </Stack>

        {/* Progress Bar */}
        {showDetails && weeklyTotal !== undefined && (
          <Box sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Weekly Progress
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatHours(weeklyTotal)} / {formatHours(weeklyThreshold)}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progressPercentage}
              sx={{
                height: 6,
                borderRadius: 1,
                '& .MuiLinearProgress-bar': {
                  backgroundColor:
                    weeklyTotal! > weeklyThreshold * 1.5
                      ? 'error.main'
                      : weeklyTotal! > weeklyThreshold
                      ? 'warning.main'
                      : 'success.main',
                },
              }}
            />
          </Box>
        )}

        {/* Total Summary */}
        {showDetails && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 1,
              p: 1,
              bgcolor: 'background.paper',
              borderRadius: 1,
            }}
          >
            <Typography variant="body2" fontWeight="medium">
              Total Hours:
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {formatHours(totalHours)}
            </Typography>
          </Box>
        )}

        {/* Consecutive Day Indicator */}
        {consecutiveDay && consecutiveDay > 1 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            Day {consecutiveDay} of consecutive work
          </Typography>
        )}
      </Stack>
    </Box>
  )
}

// Compact version for table cells
export function HoursBreakdownCompact({
  regularHours,
  overtimeHours,
  doubleTimeHours,
}: {
  regularHours: number
  overtimeHours: number
  doubleTimeHours: number
}) {
  if (regularHours === 0 && overtimeHours === 0 && doubleTimeHours === 0) {
    return <Typography variant="body2" color="text.disabled">-</Typography>
  }

  return (
    <Stack direction="row" spacing={0.5}>
      {regularHours > 0 && (
        <Typography variant="body2" color="success.main">
          {regularHours.toFixed(1)}
        </Typography>
      )}
      {overtimeHours > 0 && (
        <Typography variant="body2" color="warning.main">
          +{overtimeHours.toFixed(1)}
        </Typography>
      )}
      {doubleTimeHours > 0 && (
        <Typography variant="body2" color="error.main">
          +{doubleTimeHours.toFixed(1)}
        </Typography>
      )}
    </Stack>
  )
}