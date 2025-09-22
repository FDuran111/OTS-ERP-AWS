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
  onJobDrop?: (job: any, date: Date) => void
  showDivisionColors?: boolean
}

const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function CalendarGrid({
  days,
  currentDate,
  getJobsForDate,
  onDateClick,
  onCrewAssignment,
  onMaterialReservation,
  onJobDrop,
  showDivisionColors = false
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
                    <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {jobsOnDay.slice(0, 3).map((entry) => {
                        const jobTypeColor = entry.job.division === 'LOW_VOLTAGE' 
                          ? { bg: '#e3f2fd', text: '#1565c0', border: '#42a5f5' }
                          : entry.job.type === 'INSTALLATION' 
                            ? { bg: '#e8f5e9', text: '#2e7d32', border: '#66bb6a' }
                            : { bg: '#fff3e0', text: '#e65100', border: '#ff9800' }
                        
                        return (
                          <Paper
                            key={entry.id} 
                            elevation={1}
                            sx={{ 
                              p: 1,
                              borderRadius: 1,
                              bgcolor: jobTypeColor.bg,
                              color: jobTypeColor.text,
                              border: 1,
                              borderColor: jobTypeColor.border,
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              transition: 'all 0.2s',
                              '&:hover': {
                                transform: 'scale(1.02)',
                                boxShadow: 3,
                                borderColor: jobTypeColor.text
                              }
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              onCrewAssignment(entry)
                            }}
                          >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: jobTypeColor.text }}>
                                {entry.job.jobNumber}
                              </Typography>
                              {entry.estimatedHours && (
                                <Typography sx={{ fontSize: '0.7rem', opacity: 0.8 }}>
                                  {entry.estimatedHours}h
                                </Typography>
                              )}
                            </Box>
                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 0.5 }}>
                              {entry.job.customer}
                            </Typography>
                            <Typography sx={{ fontSize: '0.7rem', opacity: 0.8 }}>
                              {entry.job.title || entry.job.description || 'No description'}
                            </Typography>
                          </Paper>
                        )
                      })}
                      {jobsOnDay.length > 3 && (
                        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', mt: 0.5 }}>
                          +{jobsOnDay.length - 3} more job{jobsOnDay.length - 3 > 1 ? 's' : ''}
                        </Typography>
                      )}
                    </Box>
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
              minHeight: { xs: '300px', sm: '400px', md: '500px' }
            }}
          >
            {days.map((day) => {
              const jobsOnDay = getJobsForDate(day)
              const isCurrentMonth = isSameMonth(day, currentDate)
              const isToday = isSameDay(day, new Date())

              return (
                <CalendarDay
                  key={day.toISOString()}
                  date={day}
                  jobs={jobsOnDay}
                  isToday={isToday}
                  isCurrentMonth={isCurrentMonth}
                  onDateClick={onDateClick}
                  onCrewAssignment={onCrewAssignment}
                  onMaterialReservation={onMaterialReservation}
                  onJobDrop={onJobDrop}
                  showDivisionColors={showDivisionColors}
                />
              )
            })}
          </Box>
        </Box>
      )}
    </Paper>
  )
}