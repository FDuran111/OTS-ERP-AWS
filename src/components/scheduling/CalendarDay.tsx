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
        minHeight: 140,
        height: '100%',
        p: 1,
        cursor: 'pointer',
        position: 'relative',
        border: 1,
        borderColor: isToday ? 'primary.main' : 'divider',
        bgcolor: isToday 
          ? alpha('#1976d2', 0.05) 
          : 'background.paper',
        transition: 'all 0.2s ease-in-out',
        display: 'flex',
        flexDirection: 'column',
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
          mb: 0.5,
          fontSize: '0.875rem',
          lineHeight: 1
        }}
      >
        {format(date, 'd')}
      </Typography>

      {/* Jobs for this day */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 0.5, 
        flexGrow: 1, 
        overflow: 'auto',
        '&::-webkit-scrollbar': {
          width: '4px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '2px',
        }
      }}>
        {jobs.slice(0, 2).map((entry) => (
          <Box 
            key={entry.id} 
            sx={{ 
              p: 0.75,
              borderRadius: 1,
              bgcolor: entry.job.type === 'INSTALLATION' ? '#4caf50' : '#2196f3',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                transform: 'scale(1.02)',
                boxShadow: 2
              }
            }}
            onClick={(e) => {
              e.stopPropagation()
              onCrewAssignment(entry)
            }}
          >
            {/* Job Number and Type Badge */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 600 }}>
                {entry.job.jobNumber}
              </Typography>
              <Box sx={{
                bgcolor: 'rgba(255,255,255,0.3)',
                px: 0.5,
                py: 0.25,
                borderRadius: 0.5,
                fontSize: '0.6rem',
                fontWeight: 500
              }}>
                {entry.job.type === 'INSTALLATION' ? 'INST' : 'SVC'}
              </Box>
            </Box>
            
            {/* Customer Name */}
            <Typography sx={{ 
              fontSize: '0.75rem', 
              fontWeight: 500,
              lineHeight: 1.2,
              mb: 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}>
              {entry.job.customer}
            </Typography>
            
            {/* Job Title/Description */}
            <Typography sx={{ 
              fontSize: '0.65rem', 
              opacity: 0.9,
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {entry.job.title || entry.job.description || 'No description'}
            </Typography>
            
            {/* Bottom Info: Time and Crew */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              mt: 0.5,
              fontSize: '0.6rem'
            }}>
              {/* Estimated Hours */}
              {entry.estimatedHours && (
                <Box sx={{ opacity: 0.8 }}>
                  {entry.estimatedHours}h
                </Box>
              )}
              
              {/* Crew Assignment Badge */}
              {entry.assignedCrew && entry.assignedCrew.length > 0 && (
                <Box sx={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.25,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  px: 0.5,
                  py: 0.25,
                  borderRadius: 0.5
                }}>
                  <Typography sx={{ fontSize: '0.6rem' }}>👷</Typography>
                  <Typography sx={{ fontSize: '0.6rem', fontWeight: 600 }}>
                    {entry.assignedCrew.length}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        ))}
        
        {jobs.length > 2 && (
          <Box sx={{
            textAlign: 'center',
            py: 0.5,
            bgcolor: 'action.hover',
            borderRadius: 0.5,
            cursor: 'pointer',
            '&:hover': {
              bgcolor: 'action.selected'
            }
          }}>
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'text.secondary',
                fontSize: '0.65rem',
                fontWeight: 500
              }}
            >
              +{jobs.length - 2} more job{jobs.length - 2 > 1 ? 's' : ''}
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  )
}