'use client'

import { Box, Card, CardContent, Typography, Chip, Paper } from '@mui/material'
import { Work as WorkIcon } from '@mui/icons-material'
import { alpha } from '@mui/material/styles'

interface Job {
  id: string
  jobNumber: string
  title: string
  customer: string
  customerName: string
  type: 'SERVICE_CALL' | 'INSTALLATION'
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

interface UnscheduledJobsSectionProps {
  jobs: Job[]
  onJobSelect: (job: Job | null) => void
  onDialogOpen: () => void
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'High': return 'error'
    case 'Medium': return 'warning'
    case 'Low': return 'info'
    default: return 'default'
  }
}

export function UnscheduledJobsSection({ 
  jobs, 
  onJobSelect, 
  onDialogOpen 
}: UnscheduledJobsSectionProps) {
  if (jobs.length === 0) return null

  return (
    <Paper 
      elevation={3}
      sx={{ 
        mb: 4,
        borderRadius: 2,
        overflow: 'hidden'
      }}
    >
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}
      >
        <WorkIcon />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Unscheduled Jobs
        </Typography>
        <Chip
          label={jobs.length}
          size="small"
          sx={{
            bgcolor: 'white',
            color: 'primary.main',
            fontWeight: 600
          }}
        />
      </Box>
      
      <CardContent sx={{ p: 3 }}>
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            mb: 3,
            fontStyle: 'italic'
          }}
        >
          Drag and drop jobs onto calendar days or click to schedule
        </Typography>
        
        <Box 
          sx={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 2,
            alignItems: 'flex-start'
          }}
        >
          {jobs.slice(0, 12).map((job) => (
            <Box
              key={job.id}
              component="div"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('job', JSON.stringify(job))
                e.dataTransfer.effectAllowed = 'copy'
                // Add visual feedback
                const target = e.currentTarget as HTMLElement
                target.style.opacity = '0.5'
              }}
              onDragEnd={(e) => {
                // Reset visual feedback
                const target = e.currentTarget as HTMLElement
                target.style.opacity = '1'
              }}
              sx={{
                display: 'inline-block',
                isolation: 'isolate', // This prevents text bleeding
              }}
            >
              <Chip
                label={`${job.jobNumber} - ${job.customer}`}
                color={getPriorityColor(job.priority) as any}
                variant="outlined"
                onClick={() => {
                  onJobSelect(job)
                  onDialogOpen()
                }}
                sx={{
                  cursor: 'move',
                  fontSize: '0.8rem',
                  height: 'auto',
                  py: 1,
                  px: 1.5,
                  bgcolor: '#e8eaf6',
                  borderColor: '#9fa8da',
                  color: '#3f51b5',
                  userSelect: 'none', // Prevents text selection during drag
                  '&:hover': {
                    bgcolor: '#c5cae9',
                    borderColor: '#7986cb',
                    transform: 'translateY(-1px)',
                    boxShadow: 2
                  },
                  '& .MuiChip-label': {
                    fontWeight: 500,
                    maxWidth: 200,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    pointerEvents: 'none', // Prevents label from interfering
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
              />
            </Box>
          ))}
          
          {jobs.length > 12 && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 2,
                py: 1,
                bgcolor: alpha('#666', 0.1),
                borderRadius: 1,
                border: '1px dashed',
                borderColor: 'grey.400'
              }}
            >
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'text.secondary',
                  fontWeight: 500
                }}
              >
                +{jobs.length - 12} more jobs
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Paper>
  )
}