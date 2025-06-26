'use client'

import { Box, Paper, Typography } from '@mui/material'
import { format, isSameDay, isSameMonth } from 'date-fns'
import { CalendarDay } from './CalendarDay'

interface CalendarGridProps {
  days: Date[]
  currentDate: Date
  getJobsForDate: (date: Date) => any[]
  onDateClick: (date: Date) => void
  onCrewAssignment: (entry: any) => void
  onMaterialReservation: (entry: any) => void
}

const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function CalendarGrid({
  days,
  currentDate,
  getJobsForDate,
  onDateClick,
  onCrewAssignment,
  onMaterialReservation
}: CalendarGridProps) {
  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 3,
        borderRadius: 2,
        bgcolor: 'background.paper'
      }}
    >
      {/* Calendar Header with Day Names */}
      <Box 
        sx={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 1,
          mb: 2,
          borderBottom: 1,
          borderColor: 'divider',
          pb: 2
        }}
      >
        {weekDays.map((day) => (
          <Box key={day} sx={{ textAlign: 'center' }}>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                fontWeight: 600,
                color: 'text.primary',
                fontSize: '0.875rem'
              }}
            >
              {day}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Calendar Days Grid */}
      <Box 
        sx={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 1,
          minHeight: '600px'
        }}
      >
        {days.map((day) => {
          const jobsOnDay = getJobsForDate(day)
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isToday = isSameDay(day, new Date())

          // Skip days from other months to show only current month
          if (!isCurrentMonth) {
            return null
          }

          return (
            <CalendarDay
              key={day.toISOString()}
              date={day}
              jobs={jobsOnDay}
              isToday={isToday}
              onDateClick={onDateClick}
              onCrewAssignment={onCrewAssignment}
              onMaterialReservation={onMaterialReservation}
            />
          )
        })}
      </Box>
    </Paper>
  )
}