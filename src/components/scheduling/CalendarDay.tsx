'use client'

import { Box, Paper, Typography, Chip, Tooltip, IconButton } from '@mui/material'
import { format } from 'date-fns'
import { alpha } from '@mui/material/styles'
import {
  Build as BuildIcon,
  PhoneInTalk as ServiceIcon,
  Group as GroupIcon,
  Schedule as ScheduleIcon,
  FlashOn as LineVoltageIcon,
  SettingsInputComponent as LowVoltageIcon,
} from '@mui/icons-material'

interface CalendarDayProps {
  date: Date
  jobs: any[]
  isToday: boolean
  isCurrentMonth?: boolean
  onDateClick: (date: Date) => void
  onCrewAssignment: (entry: any) => void
  onMaterialReservation: (entry: any) => void
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'High': return '#ef5350'
    case 'Medium': return '#ff9800'
    case 'Low': return '#42a5f5'
    default: return '#9e9e9e'
  }
}

const getJobTypeColor = (type: string, division?: string) => {
  if (division === 'LOW_VOLTAGE') {
    return { bg: '#e3f2fd', text: '#1565c0', border: '#42a5f5' }
  }
  if (type === 'INSTALLATION') {
    return { bg: '#e8f5e9', text: '#2e7d32', border: '#66bb6a' }
  }
  return { bg: '#fff3e0', text: '#e65100', border: '#ff9800' }
}

export function CalendarDay({
  date,
  jobs,
  isToday,
  isCurrentMonth = true,
  onDateClick,
  onCrewAssignment,
  onMaterialReservation
}: CalendarDayProps) {
  return (
    <Paper
      elevation={isToday ? 3 : 0}
      sx={{
        minHeight: 120,
        height: '100%',
        p: 1,
        cursor: 'pointer',
        position: 'relative',
        border: 2,
        borderColor: isToday ? 'primary.main' : isCurrentMonth ? 'grey.200' : 'grey.100',
        bgcolor: isToday 
          ? alpha('#1976d2', 0.03) 
          : isCurrentMonth 
            ? 'background.paper'
            : 'grey.50',
        opacity: isCurrentMonth ? 1 : 0.6,
        transition: 'all 0.2s ease-in-out',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        '&:hover': {
          bgcolor: isToday 
            ? alpha('#1976d2', 0.06)
            : isCurrentMonth 
              ? 'grey.50'
              : 'grey.100',
          boxShadow: 2,
          borderColor: isToday ? 'primary.main' : 'grey.300',
          transform: 'translateY(-1px)',
          opacity: 1
        },
      }}
      onClick={() => onDateClick(date)}
    >
      {/* Today indicator */}
      {isToday && (
        <Box
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: 'primary.main'
          }}
        />
      )}

      {/* Date Number */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: isToday ? 700 : 600,
            color: isToday 
              ? 'primary.main' 
              : isCurrentMonth 
                ? 'text.primary'
                : 'text.secondary',
            fontSize: '0.875rem',
            lineHeight: 1
          }}
        >
          {format(date, 'd')}
        </Typography>
        {jobs.length > 0 && (
          <Chip
            label={jobs.length}
            size="small"
            sx={{
              height: 16,
              fontSize: '0.65rem',
              fontWeight: 600,
              bgcolor: isToday ? 'primary.main' : 'grey.500',
              color: 'white',
              '& .MuiChip-label': {
                px: 0.5
              }
            }}
          />
        )}
      </Box>

      {/* Jobs for this day */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 0.5, 
        flexGrow: 1, 
        overflow: 'auto',
        '&::-webkit-scrollbar': {
          width: '3px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '2px',
        }
      }}>
        {jobs.slice(0, 2).map((entry) => {
          const colors = getJobTypeColor(entry.job.type, entry.job.division)
          const priorityColor = getPriorityColor(entry.job.priority)
          
          return (
            <Tooltip
              key={entry.id}
              title={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {entry.job.jobNumber} - {entry.job.title || entry.job.description}
                  </Typography>
                  <Typography variant="caption">
                    Customer: {entry.job.customer}
                  </Typography>
                  <br />
                  <Typography variant="caption">
                    Type: {entry.job.type} | Priority: {entry.job.priority}
                  </Typography>
                  <br />
                  <Typography variant="caption">
                    Estimated Hours: {entry.estimatedHours}h
                  </Typography>
                  {entry.crew && entry.crew.length > 0 && (
                    <>
                      <br />
                      <Typography variant="caption">
                        Crew: {entry.crew.map((c: any) => c.name).join(', ')}
                      </Typography>
                    </>
                  )}
                </Box>
              }
              arrow
              placement="top"
            >
              <Paper
                elevation={0}
                sx={{ 
                  p: 0.75,
                  borderRadius: 0.75,
                  bgcolor: colors.bg,
                  border: 1,
                  borderColor: colors.border,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: 2,
                    borderColor: colors.text,
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  onCrewAssignment(entry)
                }}
              >
                {/* Priority Indicator */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: 3,
                    height: '100%',
                    bgcolor: priorityColor,
                  }}
                />
                
                {/* Job Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.25 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                    {entry.job.division === 'LOW_VOLTAGE' ? (
                      <LowVoltageIcon sx={{ fontSize: '0.7rem', color: colors.text }} />
                    ) : entry.job.type === 'INSTALLATION' ? (
                      <BuildIcon sx={{ fontSize: '0.7rem', color: colors.text }} />
                    ) : (
                      <ServiceIcon sx={{ fontSize: '0.7rem', color: colors.text }} />
                    )}
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: colors.text }}>
                      {entry.job.jobNumber}
                    </Typography>
                  </Box>
                  {entry.estimatedHours && (
                    <Typography sx={{ fontSize: '0.6rem', color: colors.text, opacity: 0.7 }}>
                      {entry.estimatedHours}h
                    </Typography>
                  )}
                </Box>
                
                {/* Customer Name */}
                <Typography sx={{ 
                  fontSize: '0.7rem', 
                  fontWeight: 600,
                  color: colors.text,
                  lineHeight: 1.1,
                  mb: 0.25,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {entry.job.customer}
                </Typography>
                
                {/* Job Description - only 1 line */}
                <Typography sx={{ 
                  fontSize: '0.65rem', 
                  color: colors.text,
                  opacity: 0.8,
                  lineHeight: 1.1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {entry.job.title || entry.job.description || 'No description'}
                </Typography>
                
                {/* Crew count only */}
                {entry.crew && entry.crew.length > 0 && (
                  <Box sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.25,
                    mt: 0.25
                  }}>
                    <GroupIcon sx={{ fontSize: '0.6rem', color: colors.text, opacity: 0.7 }} />
                    <Typography sx={{ fontSize: '0.6rem', color: colors.text, opacity: 0.7 }}>
                      {entry.crew.length} crew
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Tooltip>
          )
        })}
        
        {jobs.length > 2 && (
          <Box
            sx={{
              textAlign: 'center',
              py: 0.25,
              px: 0.5,
              bgcolor: 'grey.100',
              borderRadius: 0.5,
              cursor: 'pointer',
              '&:hover': {
                bgcolor: 'grey.200'
              }
            }}
            onClick={(e) => {
              e.stopPropagation()
              onDateClick(date)
            }}
          >
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'text.secondary',
                fontSize: '0.6rem',
                fontWeight: 600
              }}
            >
              +{jobs.length - 2} more
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  )
}