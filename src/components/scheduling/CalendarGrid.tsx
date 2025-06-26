'use client'

import { Box, Paper, Typography, useTheme, useMediaQuery } from '@mui/material'
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
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'))

  // Responsive day names - abbreviated on mobile
  const responsiveWeekDays = isMobile 
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : weekDays

  // Get current month days only for mobile list view
  const currentMonthDays = days.filter(day => isSameMonth(day, currentDate))

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: { xs: 1, sm: 2, md: 3 },
        borderRadius: 2,
        bgcolor: 'background.paper'
      }}
    >
      {isMobile ? (
        // Mobile: Vertical list view
        <Box>
          <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>
            {format(currentDate, 'MMMM yyyy')}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {currentMonthDays.map((day) => {
              const jobsOnDay = getJobsForDate(day)
              const isToday = isSameDay(day, new Date())

              return (
                <Box
                  key={day.toISOString()}
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: isToday ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    bgcolor: isToday ? 'primary.50' : 'background.paper',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'action.hover'
                    }
                  }}
                  onClick={() => onDateClick(day)}
                >
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      fontWeight: isToday ? 600 : 400,
                      color: isToday ? 'primary.main' : 'text.primary',
                      mb: 1
                    }}
                  >
                    {format(day, 'EEEE, MMM d')}
                  </Typography>
                  {jobsOnDay.length > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      {jobsOnDay.length} job{jobsOnDay.length > 1 ? 's' : ''} scheduled
                    </Typography>
                  )}
                </Box>
              )
            })}
          </Box>
        </Box>
      ) : (
        // Desktop/Tablet: Grid view
        <Box>
          {/* Calendar Header with Day Names */}
          <Box 
            sx={{ 
              display: 'grid',
              gridTemplateColumns: isTablet ? 'repeat(7, 1fr)' : 'repeat(7, 1fr)',
              gap: 1,
              mb: 2,
              borderBottom: 1,
              borderColor: 'divider',
              pb: 2
            }}
          >
            {responsiveWeekDays.map((day, index) => (
              <Box key={day} sx={{ textAlign: 'center' }}>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    fontWeight: 600,
                    color: 'text.primary',
                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
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
              minHeight: { xs: '400px', sm: '500px', md: '600px' }
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
        </Box>
      )}
    </Paper>
  )
}