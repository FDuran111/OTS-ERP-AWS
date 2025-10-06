'use client'

import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  Chip,
  IconButton,
  CircularProgress,
  Divider,
  Stack,
} from '@mui/material'
import {
  Close as CloseIcon,
  ErrorOutline as ErrorIcon,
  Edit as EditIcon,
} from '@mui/icons-material'
import { format } from 'date-fns'
import RejectionFixDialog from '@/components/time/RejectionFixDialog'

interface RejectedEntry {
  id: string
  date: string
  hours: number
  description: string
  jobNumber?: string
  job_description?: string
  rejectionReason?: string
}

export default function RejectedEntriesCard() {
  const [entries, setEntries] = useState<RejectedEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [listDialogOpen, setListDialogOpen] = useState(false)
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const [fixDialogOpen, setFixDialogOpen] = useState(false)

  useEffect(() => {
    fetchRejectedEntries()
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchRejectedEntries, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchRejectedEntries = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/time-entries/rejected', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setEntries(data.entries || [])
      }
    } catch (error) {
      console.error('Error fetching rejected entries:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFixEntry = (entryId: string) => {
    setSelectedEntryId(entryId)
    setFixDialogOpen(true)
    setListDialogOpen(false)
  }

  const handleFixDialogClose = () => {
    setFixDialogOpen(false)
    setSelectedEntryId(null)
    // Refresh entries after fixing
    fetchRejectedEntries()
  }

  if (loading) {
    return (
      <Card sx={{
        height: '100%',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: 3,
          transform: 'translateY(-2px)',
        },
      }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 120 }}>
            <CircularProgress size={24} />
          </Box>
        </CardContent>
      </Card>
    )
  }

  // Don't show card if no rejected entries
  if (entries.length === 0) {
    return null
  }

  return (
    <>
      <Card
        onClick={() => setListDialogOpen(true)}
        sx={{
          height: '100%',
          transition: 'all 0.2s ease-in-out',
          cursor: 'pointer',
          '&:hover': {
            boxShadow: 3,
            transform: 'translateY(-2px)',
          },
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{
            display: 'flex',
            flexDirection: { xs: 'row', sm: 'column', md: 'row' },
            alignItems: { xs: 'center', sm: 'flex-start', md: 'center' },
            mb: 2
          }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: { xs: 40, sm: 48 },
                height: { xs: 40, sm: 48 },
                borderRadius: '12px',
                backgroundColor: '#E5383820',
                mr: { xs: 2, sm: 0, md: 2 },
                mb: { xs: 0, sm: 2, md: 0 },
                flexShrink: 0,
              }}
            >
              <ErrorIcon sx={{
                color: '#E53838',
                fontSize: { xs: '1.25rem', sm: '1.5rem' }
              }} />
            </Box>
            <Box sx={{ flexGrow: 1, textAlign: { xs: 'left', sm: 'center', md: 'left' } }}>
              <Typography
                color="text.secondary"
                variant="caption"
                sx={{
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  display: 'block',
                  mb: 0.5
                }}
              >
                Rejected Entries
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.875rem' },
                  fontWeight: 600,
                  lineHeight: 1.2
                }}
              >
                {entries.length}
              </Typography>
            </Box>
          </Box>
          <Typography
            variant="caption"
            color="error.main"
            sx={{
              fontSize: { xs: '0.7rem', sm: '0.75rem' },
              display: 'block'
            }}
          >
            Need to be fixed
          </Typography>
        </CardContent>
      </Card>

      {/* List Dialog */}
      <Dialog
        open={listDialogOpen}
        onClose={() => setListDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">Rejected Time Entries</Typography>
            <Chip label={entries.length} color="error" size="small" />
          </Box>
          <IconButton onClick={() => setListDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 0 }}>
          <List sx={{ p: 0 }}>
            {entries.map((entry, index) => (
              <React.Fragment key={entry.id}>
                <ListItem
                  sx={{
                    px: 3,
                    py: 2,
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight="medium" sx={{ mb: 0.5 }}>
                        {entry.jobNumber && entry.job_description
                          ? `${entry.jobNumber} - ${entry.job_description}`
                          : entry.jobNumber || 'No job info'}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                        <Chip
                          label={format(new Date(entry.date), 'MMM d, yyyy')}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={`${entry.hours} hrs`}
                          size="small"
                          color="primary"
                        />
                      </Stack>
                      {entry.rejectionReason && (
                        <Typography variant="caption" color="error.main" sx={{ display: 'block' }}>
                          Reason: {entry.rejectionReason}
                        </Typography>
                      )}
                    </Box>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleFixEntry(entry.id)}
                      sx={{
                        backgroundColor: 'primary.lighter',
                        '&:hover': {
                          backgroundColor: 'primary.light',
                        },
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </ListItem>
                {index < entries.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </DialogContent>
      </Dialog>

      {/* Rejection Fix Dialog */}
      <RejectionFixDialog
        open={fixDialogOpen}
        onClose={handleFixDialogClose}
        timeEntryId={selectedEntryId}
      />
    </>
  )
}
