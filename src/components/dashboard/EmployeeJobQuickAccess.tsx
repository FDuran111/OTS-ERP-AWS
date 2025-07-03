'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Badge,
  Skeleton,
} from '@mui/material'
import {
  Work as JobIcon,
  CameraAlt as CameraIcon,
  AccessTime as ClockIcon,
  NavigateBefore,
  NavigateNext,
  ArrowForward,
} from '@mui/icons-material'

interface Job {
  id: string
  jobNumber: string
  title: string
  customer: string
  status: string
  priority: string
  address?: string
  city?: string
  crew: string[]
}

interface EmployeeJobQuickAccessProps {
  userName: string
}

export default function EmployeeJobQuickAccess({ userName }: EmployeeJobQuickAccessProps) {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [currentJobIndex, setCurrentJobIndex] = useState(0)

  useEffect(() => {
    fetchMyJobs()
  }, [userName])

  const fetchMyJobs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/jobs', {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('Failed to fetch jobs')
      }
      const data = await response.json()
      
      // Filter jobs assigned to this employee
      const myJobs = data.filter((job: Job) => 
        job.crew.includes(userName) && 
        ['SCHEDULED', 'IN_PROGRESS', 'DISPATCHED'].includes(job.status)
      )
      
      setJobs(myJobs)
    } catch (error) {
      console.error('Error fetching jobs:', error)
      setJobs([])
    } finally {
      setLoading(false)
    }
  }

  const handlePrevJob = () => {
    setCurrentJobIndex((prev) => (prev > 0 ? prev - 1 : jobs.length - 1))
  }

  const handleNextJob = () => {
    setCurrentJobIndex((prev) => (prev < jobs.length - 1 ? prev + 1 : 0))
  }

  const currentJob = jobs[currentJobIndex]

  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status.toLowerCase()) {
      case 'in_progress':
        return 'success'
      case 'scheduled':
      case 'dispatched':
        return 'warning'
      default:
        return 'default'
    }
  }

  if (loading) {
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Skeleton variant="text" width="40%" height={32} />
          <Skeleton variant="rectangular" width="100%" height={100} sx={{ mt: 2 }} />
        </CardContent>
      </Card>
    )
  }

  if (jobs.length === 0) {
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Quick Job Access
          </Typography>
          <Typography color="text.secondary">
            No active jobs assigned to you
          </Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Quick Job Access
          </Typography>
          <Badge badgeContent={jobs.length} color="primary">
            <JobIcon />
          </Badge>
        </Box>

        {currentJob && (
          <>
            {/* Job Navigation */}
            {jobs.length > 1 && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                <IconButton onClick={handlePrevJob} size="small">
                  <NavigateBefore />
                </IconButton>
                <Typography variant="caption" sx={{ mx: 2 }}>
                  {currentJobIndex + 1} of {jobs.length}
                </Typography>
                <IconButton onClick={handleNextJob} size="small">
                  <NavigateNext />
                </IconButton>
              </Box>
            )}

            {/* Current Job Card */}
            <Box 
              sx={{ 
                p: 2, 
                bgcolor: 'background.default', 
                borderRadius: 1,
                mb: 2,
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'action.hover',
                }
              }}
              onClick={() => router.push(`/jobs/${currentJob.id}`)}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {currentJob.jobNumber}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {currentJob.title}
                  </Typography>
                </Box>
                <Chip
                  label={currentJob.status.replace('_', ' ')}
                  color={getStatusColor(currentJob.status)}
                  size="small"
                />
              </Box>
              
              <Typography variant="body2">
                <strong>Customer:</strong> {currentJob.customer}
              </Typography>
              {currentJob.address && (
                <Typography variant="body2" color="text.secondary">
                  📍 {currentJob.address}{currentJob.city && `, ${currentJob.city}`}
                </Typography>
              )}
            </Box>

            {/* Quick Actions */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<ClockIcon />}
                onClick={() => router.push(`/time/mobile?jobId=${currentJob.id}`)}
                size="small"
              >
                Clock In
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<CameraIcon />}
                onClick={() => router.push(`/jobs/${currentJob.id}#photos`)}
                size="small"
              >
                Add Photo
              </Button>
            </Box>
          </>
        )}

        {/* View All Jobs Link */}
        <Button
          fullWidth
          endIcon={<ArrowForward />}
          onClick={() => router.push('/jobs/mobile')}
          sx={{ mt: 2 }}
          size="small"
        >
          View All My Jobs ({jobs.length})
        </Button>
      </CardContent>
    </Card>
  )
}