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
  Grid,
  LinearProgress,
  Tooltip,
} from '@mui/material'
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
      case 'ADMIN': return 'primary'
      case 'FIELD_CREW': return 'info'
      case 'OFFICE': return 'warning'
      default: return 'default'
    }
  }

  const getUtilizationPercent = (member: CrewMember) => {
    return Math.min(((member.scheduledHours || 0) / (member.totalCapacity || 40)) * 100, 100)
  }

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            👥 Crew Availability
          </Typography>
          <Typography>Loading crew information...</Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <ScheduleIcon color="primary" />
          <Typography variant="h6">
            Crew Availability
          </Typography>
          <Chip 
            label={`This Week`} 
            size="small" 
            variant="outlined"
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Current week utilization and availability
        </Typography>

        {crewMembers.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No crew members found
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {crewMembers.map((member) => {
              const availability = getAvailabilityStatus(member)
              const utilizationPercent = getUtilizationPercent(member)
              const StatusIcon = availability.icon

              return (
                <Grid key={member.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Stack spacing={2}>
                        {/* Member Info */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ width: 40, height: 40 }}>
                            <PersonIcon />
                          </Avatar>
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography variant="subtitle2" noWrap>
                              {member.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {member.email}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Role and Status */}
                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                          <Chip 
                            label={member.role} 
                            size="small" 
                            color={getRoleColor(member.role) as any}
                          />
                          <Tooltip title={`${availability.status} - ${utilizationPercent.toFixed(0)}% utilized`}>
                            <Chip 
                              icon={<StatusIcon />}
                              label={availability.status}
                              size="small"
                              color={availability.color as any}
                              variant="outlined"
                            />
                          </Tooltip>
                        </Stack>

                        {/* Utilization Bar */}
                        <Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Utilization
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {member.scheduledHours}h / {member.totalCapacity}h
                            </Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={utilizationPercent}
                            color={availability.color as any}
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </Box>

                        {/* Conflicts */}
                        {member.conflicts && member.conflicts > 0 && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <WarningIcon fontSize="small" color="warning" />
                            <Typography variant="caption" color="warning.main">
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