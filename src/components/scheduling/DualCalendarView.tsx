'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  Chip,
  Alert,
  useTheme,
  useMediaQuery,
  Stack,
  Divider,
  IconButton,
  Collapse,
} from '@mui/material'
import {
  FlashOn as LineVoltageIcon,
  SettingsInputComponent as LowVoltageIcon,
  ViewModule as DualViewIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks } from 'date-fns'
import { CalendarGrid } from './CalendarGrid'
import { DIVISIONS, divisionConfig, canAccessDivision, getAccessibleDivisions } from '@/lib/divisions'

interface Job {
  id: string
  jobNumber: string
  title: string
  customer: string
  customerName: string
  type: 'SERVICE_CALL' | 'INSTALLATION'
  division?: 'LOW_VOLTAGE' | 'LINE_VOLTAGE'
  status: string
  priority: string
  estimatedHours?: number
  dueDate?: string
  startDate?: string
  endDate?: string
  assignedCrew?: string[]
  address?: string
  description?: string
}

interface ScheduleEntry {
  id: string
  jobId: string
  job: Job
  startDate: string
  endDate?: string
  estimatedHours: number
  assignedCrew: string[]
  notes?: string
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  crew: Array<{
    id: string
    name: string
    role: string
  }>
}

interface DualCalendarViewProps {
  schedules: ScheduleEntry[]
  currentDate: Date
  view: 'month' | 'week'
  onDateClick: (date: Date) => void
  onCrewAssignment: (entry: ScheduleEntry) => void
  onMaterialReservation: (entry: ScheduleEntry) => void
  onWeekChange: (newDate: Date) => void
  onJobDrop?: (job: any, date: Date) => void
}

type ViewMode = 'BOTH' | 'LOW_VOLTAGE' | 'LINE_VOLTAGE'

export default function DualCalendarView({
  schedules,
  currentDate,
  view,
  onDateClick,
  onCrewAssignment,
  onMaterialReservation,
  onWeekChange,
  onJobDrop,
}: DualCalendarViewProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [user, setUser] = useState<{ id: string; name: string; role: string } | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('BOTH')
  const [accessibleDivisions, setAccessibleDivisions] = useState<string[]>([])
  const [lowVoltageExpanded, setLowVoltageExpanded] = useState(true)
  const [lineVoltageExpanded, setLineVoltageExpanded] = useState(true)

  useEffect(() => {
    // Get user from localStorage
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
  }, [])

  useEffect(() => {
    if (user) {
      const divisions = getAccessibleDivisions(user.role as any, user.name)
      setAccessibleDivisions(divisions)
      
      // If user can only access one division, set it as default
      if (divisions.length === 1) {
        setViewMode(divisions[0] as ViewMode)
      }
    }
  }, [user])

  // Filter schedules based on view mode and permissions
  const getFilteredSchedules = (division?: 'LOW_VOLTAGE' | 'LINE_VOLTAGE'): ScheduleEntry[] => {
    if (!user) return []

    return schedules.filter(schedule => {
      const jobDivision = schedule.job.division || 'LINE_VOLTAGE'
      
      // Check division permissions
      if (!canAccessDivision(jobDivision, user.role as any, user.name)) {
        return false
      }

      // Filter by view mode
      if (division) {
        return jobDivision === division
      }
      
      return true
    })
  }

  // Get calendar days based on view mode
  const days = []
  if (view === 'week') {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 })
    for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d))
    }
  } else {
    // Month view
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    
    for (let d = new Date(calendarStart); d <= calendarEnd; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d))
    }
  }

  // Get jobs for a specific date and division
  const getJobsForDate = (date: Date, division?: 'LOW_VOLTAGE' | 'LINE_VOLTAGE') => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const filteredSchedules = getFilteredSchedules(division)
    
    return filteredSchedules.filter(schedule => {
      const scheduleDate = format(new Date(schedule.startDate), 'yyyy-MM-dd')
      return scheduleDate === dateStr
    })
  }

  const handleViewModeChange = (_: React.MouseEvent<HTMLElement>, newMode: ViewMode | null) => {
    if (newMode !== null) {
      setViewMode(newMode)
    }
  }

  // Check if user has access to both divisions
  const canViewBoth = accessibleDivisions.length === 2

  return (
    <Box>
      {/* View Mode Toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Schedule Calendar - {view === 'week' 
            ? `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 0 }), 'MMM d, yyyy')}`
            : format(currentDate, 'MMMM yyyy')
          }
        </Typography>
        
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewModeChange}
          size="small"
        >
          {canViewBoth && (
            <ToggleButton value="BOTH">
              <DualViewIcon sx={{ mr: 1 }} />
              Both
            </ToggleButton>
          )}
          {accessibleDivisions.includes(DIVISIONS.LOW_VOLTAGE) && (
            <ToggleButton value="LOW_VOLTAGE">
              <LowVoltageIcon sx={{ mr: 1 }} />
              Low Voltage
            </ToggleButton>
          )}
          {accessibleDivisions.includes(DIVISIONS.LINE_VOLTAGE) && (
            <ToggleButton value="LINE_VOLTAGE">
              <LineVoltageIcon sx={{ mr: 1 }} />
              Line Voltage
            </ToggleButton>
          )}
        </ToggleButtonGroup>
      </Box>

      {/* Access Warning */}
      {accessibleDivisions.length === 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          You don't have access to view any calendar divisions. Please contact your administrator.
        </Alert>
      )}

      {/* Calendar Display */}
      {viewMode === 'BOTH' && canViewBoth ? (
        // Unified calendar view with color-coded divisions
        <Paper sx={{ p: 2 }}>
          {/* Legend for divisions */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Division Legend:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LowVoltageIcon sx={{ color: divisionConfig.LOW_VOLTAGE.color, fontSize: 20 }} />
              <Typography variant="body2" sx={{ color: divisionConfig.LOW_VOLTAGE.color }}>
                Low Voltage
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LineVoltageIcon sx={{ color: divisionConfig.LINE_VOLTAGE.color, fontSize: 20 }} />
              <Typography variant="body2" sx={{ color: divisionConfig.LINE_VOLTAGE.color }}>
                Line Voltage
              </Typography>
            </Box>
            <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
              <Chip
                label={`${getFilteredSchedules('LOW_VOLTAGE').length} LV Jobs`}
                size="small"
                sx={{ bgcolor: `${divisionConfig.LOW_VOLTAGE.color}20`, color: divisionConfig.LOW_VOLTAGE.color }}
              />
              <Chip
                label={`${getFilteredSchedules('LINE_VOLTAGE').length} HV Jobs`}
                size="small"
                sx={{ bgcolor: `${divisionConfig.LINE_VOLTAGE.color}20`, color: divisionConfig.LINE_VOLTAGE.color }}
              />
            </Box>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <CalendarGrid
            days={days}
            currentDate={currentDate}
            getJobsForDate={(date) => getJobsForDate(date)} // Get all jobs for unified view
            onDateClick={onDateClick}
            onCrewAssignment={onCrewAssignment}
            onMaterialReservation={onMaterialReservation}
            onJobDrop={onJobDrop}
            showDivisionColors={true} // Pass prop to show division colors
          />
        </Paper>
      ) : (
        // Single division view
        <Paper sx={{ p: 2 }}>
          {viewMode !== 'BOTH' && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              {viewMode === 'LOW_VOLTAGE' ? (
                <>
                  <LowVoltageIcon sx={{ mr: 1, color: divisionConfig.LOW_VOLTAGE.color }} />
                  <Typography variant="h6" sx={{ color: divisionConfig.LOW_VOLTAGE.color }}>
                    Low Voltage Division
                  </Typography>
                  <Chip 
                    label={divisionConfig.LOW_VOLTAGE.description} 
                    size="small" 
                    sx={{ ml: 2 }}
                  />
                </>
              ) : (
                <>
                  <LineVoltageIcon sx={{ mr: 1, color: divisionConfig.LINE_VOLTAGE.color }} />
                  <Typography variant="h6" sx={{ color: divisionConfig.LINE_VOLTAGE.color }}>
                    Line Voltage Division
                  </Typography>
                  <Chip 
                    label={divisionConfig.LINE_VOLTAGE.description} 
                    size="small" 
                    sx={{ ml: 2 }}
                  />
                </>
              )}
            </Box>
          )}
          <CalendarGrid
            days={days}
            currentDate={currentDate}
            getJobsForDate={(date) => getJobsForDate(
              date,
              viewMode === 'BOTH' ? undefined : viewMode
            )}
            onDateClick={onDateClick}
            onCrewAssignment={onCrewAssignment}
            onMaterialReservation={onMaterialReservation}
            onJobDrop={onJobDrop}
          />
        </Paper>
      )}
    </Box>
  )
}