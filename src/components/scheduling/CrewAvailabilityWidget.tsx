'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  Stack,
  Chip,
  LinearProgress,
  Tooltip,
} from '@mui/material'

// Temporary Grid component for compatibility
const Grid = ({ children, container, spacing, xs, md, size, ...props }: any) => (
  <Box 
    sx={{ 
      display: container ? 'flex' : 'block',
      flexWrap: container ? 'wrap' : undefined,
      gap: container && spacing ? spacing : undefined,
      flex: size?.xs === 12 ? '1 1 100%' : size?.xs ? `1 1 calc(${(size.xs/12)*100}% - ${spacing || 0}px)` : 
            size?.sm === 6 ? { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)' } :
            size?.lg === 4 ? { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', lg: '1 1 calc(33.333% - 16px)' } : undefined,
      width: size?.xs === 12 ? '100%' : undefined,
      ...props.sx
    }}
    {...props}
  >
    {children}
  </Box>
)
import {
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material'
import { format, startOfWeek, endOfWeek } from 'date-fns'

interface CrewMember {
  id: string
  name: string
  email: string
  role: string
  conflicts?: number
  scheduledHours?: number
  availableHours?: number
  totalCapacity?: number
}

export default function CrewAvailabilityWidget() {
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([])
  const [loading, setLoading] = useState(true)
  const [weekRange, setWeekRange] = useState({ start: '', end: '' })

  useEffect(() => {
    const now = new Date()
    const start = startOfWeek(now, { weekStartsOn: 1 }) // Monday
    const end = endOfWeek(now, { weekStartsOn: 1 }) // Sunday
    
    setWeekRange({
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd')
    })
    
    fetchCrewAvailability(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'))
  }, [])

  const fetchCrewAvailability = async (startDate: string, endDate: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/crew/available?startDate=${startDate}&endDate=${endDate}`)
      
      if (response.ok) {
        const crewData = await response.json()
        // Add mock scheduling data for demonstration
        const enhancedCrew = crewData.map((member: CrewMember) => ({
          ...member,
          scheduledHours: Math.floor(Math.random() * 30) + 10, // Mock data
          totalCapacity: 40, // Standard work week
          availableHours: 40 - (Math.floor(Math.random() * 30) + 10)
        }))
        setCrewMembers(enhancedCrew)
      }
    } catch (error) {
      console.error('Error fetching crew availability:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAvailabilityStatus = (member: CrewMember) => {
    const utilizationPercent = ((member.scheduledHours || 0) / (member.totalCapacity || 40)) * 100
    
    if (utilizationPercent >= 100) return { status: 'overbooked', color: 'error', icon: WarningIcon }
    if (utilizationPercent >= 80) return { status: 'busy', color: 'warning', icon: WarningIcon }
    return { status: 'available', color: 'success', icon: CheckIcon }
  }

  const getRoleColor = (role: string) => {
    switch (role.toUpperCase()) {
      case 'OWNER_ADMIN': return 'primary'
      case 'EMPLOYEE': return 'info'
      case 'FOREMAN': return 'warning'
      default: return 'default'
    }
  }

  const getUtilizationPercent = (member: CrewMember) => {
    return Math.min(((member.scheduledHours || 0) / (member.totalCapacity || 40)) * 100, 100)
  }

  // Hide component when no crew members and not loading
  if (!loading && crewMembers.length === 0) {
    return null
  }

  if (loading) {
    return (
      <Card elevation={2} sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
            👥 Crew Availability
          </Typography>
          <Typography>Loading crew information...</Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card elevation={2} sx={{ borderRadius: 2 }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <ScheduleIcon color="primary" sx={{ fontSize: 28 }} />
          <Typography variant="h5" sx={{ fontWeight: 600, flexGrow: 1 }}>
            Crew Availability
          </Typography>
          <Chip 
            label={`This Week`} 
            size="medium" 
            variant="outlined"
            color="primary"
            sx={{ fontWeight: 500 }}
          />
        </Box>
        
        <Typography 
          variant="body1" 
          sx={{ 
            color: 'text.secondary', 
            mb: 4,
            fontSize: '0.95rem'
          }}
        >
          Current week utilization and availability for all crew members
        </Typography>

        {crewMembers.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <PersonIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Crew Members Available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              There are currently no crew members scheduled for this week.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {crewMembers.map((member) => {
              const availability = getAvailabilityStatus(member)
              const utilizationPercent = getUtilizationPercent(member)
              const StatusIcon = availability.icon

              return (
                <Grid key={member.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                  <Card 
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        boxShadow: 4,
                        transform: 'translateY(-2px)'
                      }
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Stack spacing={2.5}>
                        {/* Member Info */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar 
                            sx={{ 
                              width: 48, 
                              height: 48,
                              bgcolor: 'primary.main'
                            }}
                          >
                            <PersonIcon />
                          </Avatar>
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
                              {member.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {member.email}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Role and Status */}
                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                          <Chip 
                            label={member.role} 
                            size="small" 
                            color={getRoleColor(member.role) as any}
                            sx={{ fontWeight: 500 }}
                          />
                          <Tooltip title={`${availability.status} - ${utilizationPercent.toFixed(0)}% utilized`}>
                            <Chip 
                              icon={<StatusIcon />}
                              label={availability.status}
                              size="small"
                              color={availability.color as any}
                              variant="outlined"
                              sx={{ fontWeight: 500 }}
                            />
                          </Tooltip>
                        </Stack>

                        {/* Utilization Bar */}
                        <Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              Utilization
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {member.scheduledHours}h / {member.totalCapacity}h
                            </Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={utilizationPercent}
                            color={availability.color as any}
                            sx={{ 
                              height: 8, 
                              borderRadius: 4,
                              bgcolor: 'grey.200'
                            }}
                          />
                        </Box>

                        {/* Conflicts */}
                        {member.conflicts && member.conflicts > 0 && (
                          <Box 
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 1,
                              p: 1.5,
                              bgcolor: 'warning.50',
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: 'warning.200'
                            }}
                          >
                            <WarningIcon fontSize="small" color="warning" />
                            <Typography variant="body2" color="warning.main" sx={{ fontWeight: 500 }}>
                              {member.conflicts} scheduling conflict{member.conflicts !== 1 ? 's' : ''}
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        )}
      </CardContent>
    </Card>
  )
}