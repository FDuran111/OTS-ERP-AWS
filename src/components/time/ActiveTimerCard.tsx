'use client'

import { useState, useEffect } from 'react'
import {
  Paper,
  Box,
  Typography,
  Stack,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material'
import {
  Stop as StopIcon,
  Edit as EditIcon,
} from '@mui/icons-material'

interface ActiveTimer {
  id: string
  userName: string
  jobNumber: string
  jobTitle: string
  customer: string
  phaseName?: string
  startTime: string
  description?: string
}

interface ActiveTimerCardProps {
  timer: ActiveTimer
  onTimerStopped: () => void
}

export default function ActiveTimerCard({ timer, onTimerStopped }: ActiveTimerCardProps) {
  const [elapsed, setElapsed] = useState('')
  const [stopDialogOpen, setStopDialogOpen] = useState(false)
  const [description, setDescription] = useState(timer.description || '')
  const [stopping, setStopping] = useState(false)

  useEffect(() => {
    const updateElapsed = () => {
      const start = new Date(timer.startTime)
      const now = new Date()
      const diff = now.getTime() - start.getTime()
      
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      
      setElapsed(`${hours}h ${minutes}m`)
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [timer.startTime])

  const handleStopTimer = async () => {
    try {
      setStopping(true)
      
      const response = await fetch(`/api/time-entries/${timer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endTime: new Date().toISOString(),
          description: description || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to stop timer')
      }

      onTimerStopped()
      setStopDialogOpen(false)
    } catch (error) {
      console.error('Error stopping timer:', error)
      alert('Failed to stop timer. Please try again.')
    } finally {
      setStopping(false)
    }
  }

  const formatTime = (timeStr: string) => {
    return new Date(timeStr).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <>
      <Paper sx={{ p: 2, backgroundColor: 'background.default' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              {timer.userName}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {timer.jobNumber} - {timer.jobTitle}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              {timer.customer}
            </Typography>
            
            {timer.phaseName && (
              <Chip 
                label={timer.phaseName} 
                size="small" 
                variant="outlined" 
                sx={{ mb: 1 }} 
              />
            )}
            
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Started: {formatTime(timer.startTime)}
              </Typography>
              <Chip 
                label={elapsed} 
                color="success" 
                size="small" 
                sx={{ fontWeight: 'bold' }}
              />
            </Stack>
            
            {timer.description && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                "{timer.description}"
              </Typography>
            )}
          </Box>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <IconButton 
              color="error" 
              onClick={() => setStopDialogOpen(true)}
              size="small"
            >
              <StopIcon />
            </IconButton>
          </Box>
        </Box>
      </Paper>

      <Dialog open={stopDialogOpen} onClose={() => setStopDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Stop Timer</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Stop timer for <strong>{timer.jobNumber}</strong>?
          </Typography>
          <Typography variant="caption" color="text.secondary" gutterBottom display="block">
            Time tracked: {elapsed}
          </Typography>
          
          <TextField
            fullWidth
            label="Description (Optional)"
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add notes about the work completed..."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStopDialogOpen(false)} disabled={stopping}>
            Cancel
          </Button>
          <Button 
            onClick={handleStopTimer}
            variant="contained"
            color="error"
            disabled={stopping}
          >
            {stopping ? 'Stopping...' : 'Stop Timer'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}