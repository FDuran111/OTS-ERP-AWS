'use client'

import { Box, Paper, Typography, Chip, Tooltip } from '@mui/material'
import { format } from 'date-fns'
import { alpha } from '@mui/material/styles'

interface CalendarDayProps {
  date: Date
  jobs: any[]
  isToday: boolean
  onDateClick: (date: Date) => void
  onCrewAssignment: (entry: any) => void
  onMaterialReservation: (entry: any) => void
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'High': return 'error'
    case 'Medium': return 'warning'
    case 'Low': return 'info'
    default: return 'default'
  }
}

export function CalendarDay({
  date,
  jobs,
  isToday,
  onDateClick,
  onCrewAssignment,
  onMaterialReservation
}: CalendarDayProps) {
  return (
    <Paper
      elevation={isToday ? 4 : 1}
      sx={{
        minHeight: 120,
        p: 1.5,
        cursor: 'pointer',
        position: 'relative',
        border: 1,
        borderColor: isToday ? 'primary.main' : 'divider',
        bgcolor: isToday 
          ? alpha('#1976d2', 0.05) 
          : 'background.paper',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          bgcolor: isToday 
            ? alpha('#1976d2', 0.1)
            : 'action.hover',
          elevation: 3,
          transform: 'translateY(-1px)'
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
      <Typography
        variant="body2"
        sx={{
          fontWeight: isToday ? 700 : 500,
          color: isToday ? 'primary.main' : 'text.primary',
          mb: 1,
          fontSize: '0.875rem'
        }}
      >
        {format(date, 'd')}
      </Typography>

      {/* Jobs for this day */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {jobs.slice(0, 2).map((entry) => (
          <Box key={entry.id} sx={{ position: 'relative' }}>
            <Tooltip 
              title={`${entry.job.jobNumber} - ${entry.job.title} | ${entry.job.customer}`}
              placement="top"
            >
              <Chip
                label={`${entry.job.jobNumber.slice(-4)} - ${entry.job.customer.slice(0, 12)}${entry.job.customer.length > 12 ? '...' : ''}`}
                size="small"
                color={getPriorityColor(entry.job.priority) as any}
                onClick={(e) => {
                  e.stopPropagation()
                  onCrewAssignment(entry)
                }}
                sx={{ 
                  fontSize: '0.65rem',
                  height: 20,
                  cursor: 'pointer',
                  bgcolor: '#3f51b5',
                  color: 'white',
                  '&:hover': {
                    bgcolor: '#303f9f',
                    transform: 'scale(1.02)'
                  },
                  '& .MuiChip-label': {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    px: 1
                  }
                }}
              />
            </Tooltip>
            
            {/* Show crew count if assigned */}
            {entry.assignedCrew && entry.assignedCrew.length > 0 && (
              <Box 
                sx={{ 
                  position: 'absolute', 
                  top: -6, 
                  right: -6, 
                  bgcolor: 'success.main',
                  color: 'white',
                  borderRadius: '50%',
                  width: 16,
                  height: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.6rem',
                  fontWeight: 'bold',
                  border: '1px solid white'
                }}
              >
                {entry.assignedCrew.length}
              </Box>
            )}
          </Box>
        ))}
        
        {jobs.length > 2 && (
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'text.secondary',
              fontSize: '0.65rem',
              fontStyle: 'italic',
              textAlign: 'center'
            }}
          >
            +{jobs.length - 2} more jobs
          </Typography>
        )}
      </Box>
    </Paper>
  )
}