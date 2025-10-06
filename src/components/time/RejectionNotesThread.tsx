'use client'

import React, { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  Stack,
  Divider,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material'
import {
  Send as SendIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
} from '@mui/icons-material'
import { formatDistanceToNow } from 'date-fns'

interface RejectionNote {
  id: string
  userId: string
  userName: string
  userRole: string
  note: string
  isAdminNote: boolean
  createdAt: string
}

interface RejectionNotesThreadProps {
  timeEntryId: string
  onNewNote?: () => void
}

export default function RejectionNotesThread({
  timeEntryId,
  onNewNote
}: RejectionNotesThreadProps) {
  const [notes, setNotes] = useState<RejectionNote[]>([])
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser))
    }
  }, [])

  useEffect(() => {
    if (timeEntryId) {
      fetchNotes()
    }
  }, [timeEntryId])

  const fetchNotes = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/time-entries/${timeEntryId}/rejection-notes`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setNotes(data.notes || [])
      }
    } catch (err) {
      console.error('Error fetching notes:', err)
      setError('Failed to load notes')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitNote = async () => {
    if (!newNote.trim()) return

    try {
      setSubmitting(true)
      setError(null)

      const response = await fetch(`/api/time-entries/${timeEntryId}/rejection-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ note: newNote })
      })

      if (response.ok) {
        setNewNote('')
        await fetchNotes()
        if (onNewNote) onNewNote()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to add note')
      }
    } catch (err) {
      console.error('Error adding note:', err)
      setError('Failed to add note')
    } finally {
      setSubmitting(false)
    }
  }

  const getTimeAgo = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    } catch {
      return 'recently'
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={24} />
      </Box>
    )
  }

  if (notes.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          No notes yet. Add a note to start the conversation.
        </Alert>

        {/* Add note form */}
        <Stack spacing={2}>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Add a note or response..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            disabled={submitting}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              startIcon={submitting ? <CircularProgress size={16} /> : <SendIcon />}
              onClick={handleSubmitNote}
              disabled={!newNote.trim() || submitting}
            >
              {submitting ? 'Sending...' : 'Send'}
            </Button>
          </Box>
        </Stack>
      </Box>
    )
  }

  return (
    <Box sx={{ maxHeight: 400, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Notes thread */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <Stack spacing={2}>
          {notes.map((note, index) => (
            <Paper
              key={note.id}
              elevation={0}
              sx={{
                p: 2,
                bgcolor: note.isAdminNote ? 'rgba(211, 47, 47, 0.08)' : 'rgba(25, 118, 210, 0.08)',
                borderLeft: 4,
                borderColor: note.isAdminNote ? 'error.main' : 'primary.main',
              }}
            >
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Avatar
                  sx={{
                    bgcolor: note.isAdminNote ? 'error.main' : 'primary.main',
                    width: 32,
                    height: 32,
                  }}
                >
                  {note.isAdminNote ? (
                    <AdminIcon sx={{ fontSize: 18 }} />
                  ) : (
                    <PersonIcon sx={{ fontSize: 18 }} />
                  )}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {note.userName || 'Unknown'}
                    </Typography>
                    {note.isAdminNote && (
                      <Chip
                        label="Admin"
                        size="small"
                        color="error"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {getTimeAgo(note.createdAt)}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {note.note}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Box>

      <Divider />

      {/* Add new note form */}
      <Box sx={{ p: 2, bgcolor: 'background.default' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Stack spacing={2}>
          <TextField
            fullWidth
            multiline
            rows={2}
            placeholder={
              currentUser?.role === 'OWNER_ADMIN' || currentUser?.role === 'FOREMAN'
                ? 'Add a response to the employee...'
                : 'Add a note or question for the admin...'
            }
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            disabled={submitting}
            variant="outlined"
            size="small"
            sx={{
              bgcolor: 'background.paper',
              '& .MuiOutlinedInput-root': {
                bgcolor: 'background.paper'
              }
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              size="small"
              startIcon={submitting ? <CircularProgress size={16} /> : <SendIcon />}
              onClick={handleSubmitNote}
              disabled={!newNote.trim() || submitting}
            >
              {submitting ? 'Sending...' : 'Send'}
            </Button>
          </Box>
        </Stack>
      </Box>
    </Box>
  )
}
