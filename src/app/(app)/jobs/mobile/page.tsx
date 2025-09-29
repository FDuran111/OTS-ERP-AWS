'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  IconButton,
  Fab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  TextField,
  InputAdornment,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Avatar,
  Alert,
} from '@mui/material'
import {
  CameraAlt as CameraIcon,
  Note as NoteIcon,
  AccessTime as ClockIcon,
  Info as InfoIcon,
  Navigation as NavigationIcon,
  Phone as PhoneIcon,
  Search as SearchIcon,
  Work as JobIcon,
  CheckCircle as CompleteIcon,
  PlayArrow as StartIcon,
  Close as CloseIcon,
} from '@mui/icons-material'
import MobileLayout from '@/components/layout/MobileLayout'
import FileAttachmentManager from '@/components/FileAttachmentManager'

interface Job {
  id: string
  jobNumber: string
  title: string
  customer: string
  customerId: string
  customerName: string
  type: 'SERVICE_CALL' | 'INSTALLATION'
  status: string
  priority: string
  description?: string
  customerPO?: string
  dueDate: string | null
  completedDate: string | null
  crew: string[]
  estimatedHours?: number
  actualHours?: number
  estimatedCost?: number
  actualCost?: number
  billedAmount?: number
  address?: string
  city?: string
  state?: string
  zip?: string
  customerPhone?: string
  createdAt: string
  updatedAt: string
}

export default function MobileJobsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [quickActionOpen, setQuickActionOpen] = useState(false)
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    fetchJobs()
  }, [user, router])

  const fetchJobs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/jobs', {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('Failed to fetch jobs')
      }
      const data = await response.json()
      
      // Filter jobs to show only assigned jobs for employees
      const filteredJobs = user?.role === 'EMPLOYEE' 
        ? data.filter((job: Job) => 
            job.crew.includes(user.name) && 
            ['SCHEDULED', 'IN_PROGRESS', 'DISPATCHED'].includes(job.status)
          )
        : data.filter((job: Job) => 
            ['SCHEDULED', 'IN_PROGRESS', 'DISPATCHED'].includes(job.status)
          )
      
      setJobs(filteredJobs)
    } catch (error) {
      console.error('Error fetching jobs:', error)
      setJobs([])
    } finally {
      setLoading(false)
    }
  }

  const handleQuickAction = (job: Job, action: string) => {
    setSelectedJob(job)
    
    switch (action) {
      case 'clock':
        // Navigate to time clock with job pre-selected
        router.push(`/time/mobile?jobId=${job.id}`)
        break
      case 'note':
        setNoteDialogOpen(true)
        break
      case 'photo':
        setPhotoDialogOpen(true)
        break
      case 'info':
        router.push(`/jobs/${job.id}`)
        break
      case 'navigate':
        // Open in maps
        if (job.address) {
          const query = encodeURIComponent(`${job.address} ${job.city} ${job.state} ${job.zip}`)
          window.open(`https://maps.google.com?q=${query}`, '_blank')
        }
        break
      case 'call':
        if (job.customerPhone) {
          window.location.href = `tel:${job.customerPhone}`
        }
        break
    }
  }

  const handleSaveNote = async () => {
    if (!selectedJob || !noteText.trim()) return

    setSavingNote(true)
    try {
      // Save note as a job phase note
      const response = await fetch(`/api/jobs/${selectedJob.id}/phases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: noteText,
          author: user?.name || 'Employee',
        }),
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to save note')
      }

      setNoteText('')
      setNoteDialogOpen(false)
      // Show success message
      alert('Note saved successfully!')
    } catch (error) {
      console.error('Error saving note:', error)
      alert('Failed to save note. Please try again.')
    } finally {
      setSavingNote(false)
    }
  }

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = !searchTerm || 
      job.jobNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.address?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })

  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status.toLowerCase()) {
      case 'in_progress':
        return 'success'
      case 'scheduled':
      case 'dispatched':
        return 'warning'
      case 'completed':
        return 'info'
      default:
        return 'default'
    }
  }

  const getPriorityColor = (priority: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (priority) {
      case 'High':
        return 'error'
      case 'Medium':
        return 'warning'
      case 'Low':
        return 'info'
      default:
        return 'default'
    }
  }

  return (
    <MobileLayout>
      <Box sx={{ p: 2, pb: 10 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            {user?.role === 'EMPLOYEE' ? 'My Jobs' : 'Active Jobs'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {filteredJobs.length} active job{filteredJobs.length !== 1 ? 's' : ''}
          </Typography>
        </Box>

        {/* Search */}
        <TextField
          fullWidth
          placeholder="Search jobs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 3 }}
        />

        {/* Jobs List */}
        {loading ? (
          <Typography align="center" sx={{ py: 4 }}>Loading jobs...</Typography>
        ) : filteredJobs.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            {searchTerm ? 'No jobs found matching your search.' : 'No active jobs assigned to you.'}
          </Alert>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filteredJobs.map((job) => (
              <Card 
                key={job.id}
                sx={{ 
                  position: 'relative',
                  overflow: 'visible',
                  '&:hover': {
                    boxShadow: 3,
                  },
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  {/* Job Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {job.jobNumber}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {job.title}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-end' }}>
                      <Chip
                        label={job.status.replace('_', ' ')}
                        color={getStatusColor(job.status)}
                        size="small"
                      />
                      <Chip
                        label={job.priority}
                        color={getPriorityColor(job.priority)}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </Box>

                  {/* Customer Info */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>Customer:</strong> {job.customer}
                    </Typography>
                    {job.address && (
                      <Typography variant="body2" color="text.secondary">
                        📍 {job.address}{job.city && `, ${job.city}`}
                      </Typography>
                    )}
                  </Box>

                  {/* Quick Actions */}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<ClockIcon />}
                      onClick={() => handleQuickAction(job, 'clock')}
                      sx={{ flex: '1 1 auto', minWidth: '100px' }}
                    >
                      Clock In
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<CameraIcon />}
                      onClick={() => handleQuickAction(job, 'photo')}
                      sx={{ flex: '1 1 auto', minWidth: '100px' }}
                    >
                      Photo
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<NoteIcon />}
                      onClick={() => handleQuickAction(job, 'note')}
                      sx={{ flex: '1 1 auto', minWidth: '100px' }}
                    >
                      Note
                    </Button>
                  </Box>

                  {/* Secondary Actions */}
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <IconButton
                      size="small"
                      onClick={() => handleQuickAction(job, 'info')}
                      title="View Details"
                    >
                      <InfoIcon />
                    </IconButton>
                    {job.address && (
                      <IconButton
                        size="small"
                        onClick={() => handleQuickAction(job, 'navigate')}
                        title="Navigate"
                      >
                        <NavigationIcon />
                      </IconButton>
                    )}
                    {job.customerPhone && (
                      <IconButton
                        size="small"
                        onClick={() => handleQuickAction(job, 'call')}
                        title="Call Customer"
                      >
                        <PhoneIcon />
                      </IconButton>
                    )}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {/* Note Dialog */}
        <Dialog
          open={noteDialogOpen}
          onClose={() => setNoteDialogOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            Add Note to Job {selectedJob?.jobNumber}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="Enter your note..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNoteDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveNote} 
              variant="contained"
              disabled={!noteText.trim() || savingNote}
            >
              {savingNote ? 'Saving...' : 'Save Note'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Photo Dialog */}
        <Dialog
          open={photoDialogOpen}
          onClose={() => setPhotoDialogOpen(false)}
          fullWidth
          maxWidth="md"
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                Add Photos to Job {selectedJob?.jobNumber}
              </Typography>
              <IconButton onClick={() => setPhotoDialogOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedJob && (
              <FileAttachmentManager
                entityType="job"
                entityId={selectedJob.id}
                onAttachmentChange={() => {
                  // Optionally refresh job data
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </Box>
    </MobileLayout>
  )
}