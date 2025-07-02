'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  IconButton,
  Chip
} from '@mui/material'
import { Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material'

interface CrewMember {
  id: string
  name: string
  role: string
  hoursWorked?: number
  overtimeHours?: number
}

interface HoursTrackingDialogProps {
  open: boolean
  onClose: () => void
  jobId: string
  jobNumber: string
  crewMembers: CrewMember[]
  onSave: (hours: Record<string, { regular: number; overtime: number }>) => Promise<void>
}

export default function HoursTrackingDialog({
  open,
  onClose,
  jobId,
  jobNumber,
  crewMembers,
  onSave
}: HoursTrackingDialogProps) {
  const [hours, setHours] = useState<Record<string, { regular: number; overtime: number }>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [tempHours, setTempHours] = useState({ regular: 0, overtime: 0 })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Initialize hours from crew members
    const initialHours: Record<string, { regular: number; overtime: number }> = {}
    crewMembers.forEach(member => {
      initialHours[member.id] = {
        regular: member.hoursWorked || 0,
        overtime: member.overtimeHours || 0
      }
    })
    setHours(initialHours)
  }, [crewMembers])

  const handleEdit = (memberId: string) => {
    setEditingId(memberId)
    setTempHours(hours[memberId] || { regular: 0, overtime: 0 })
  }

  const handleSaveRow = (memberId: string) => {
    setHours(prev => ({
      ...prev,
      [memberId]: { ...tempHours }
    }))
    setEditingId(null)
  }

  const handleCancel = () => {
    setEditingId(null)
    setTempHours({ regular: 0, overtime: 0 })
  }

  const handleSaveAll = async () => {
    try {
      setSaving(true)
      setError(null)
      await onSave(hours)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save hours')
    } finally {
      setSaving(false)
    }
  }

  const getTotalHours = () => {
    return Object.values(hours).reduce(
      (acc, curr) => ({
        regular: acc.regular + curr.regular,
        overtime: acc.overtime + curr.overtime
      }),
      { regular: 0, overtime: 0 }
    )
  }

  const totals = getTotalHours()

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Track Hours - Job #{jobNumber}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Enter the hours worked by each crew member on this job.
          </Typography>
        </Box>

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Crew Member</TableCell>
                <TableCell>Role</TableCell>
                <TableCell align="center">Regular Hours</TableCell>
                <TableCell align="center">Overtime Hours</TableCell>
                <TableCell align="center">Total</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {crewMembers.map((member) => {
                const memberHours = hours[member.id] || { regular: 0, overtime: 0 }
                const isEditing = editingId === member.id
                
                return (
                  <TableRow key={member.id}>
                    <TableCell>{member.name}</TableCell>
                    <TableCell>
                      <Chip 
                        label={member.role} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      {isEditing ? (
                        <TextField
                          type="number"
                          value={tempHours.regular}
                          onChange={(e) => setTempHours(prev => ({
                            ...prev,
                            regular: parseFloat(e.target.value) || 0
                          }))}
                          size="small"
                          inputProps={{ min: 0, max: 24, step: 0.5 }}
                          sx={{ width: 80 }}
                        />
                      ) : (
                        memberHours.regular || '-'
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {isEditing ? (
                        <TextField
                          type="number"
                          value={tempHours.overtime}
                          onChange={(e) => setTempHours(prev => ({
                            ...prev,
                            overtime: parseFloat(e.target.value) || 0
                          }))}
                          size="small"
                          inputProps={{ min: 0, max: 24, step: 0.5 }}
                          sx={{ width: 80 }}
                        />
                      ) : (
                        memberHours.overtime || '-'
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <strong>
                        {isEditing 
                          ? (tempHours.regular + tempHours.overtime).toFixed(1)
                          : (memberHours.regular + memberHours.overtime).toFixed(1)
                        }
                      </strong>
                    </TableCell>
                    <TableCell align="center">
                      {isEditing ? (
                        <>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleSaveRow(member.id)}
                          >
                            <SaveIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={handleCancel}
                          >
                            <CancelIcon fontSize="small" />
                          </IconButton>
                        </>
                      ) : (
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(member.id)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
              <TableRow>
                <TableCell colSpan={2}>
                  <strong>Total</strong>
                </TableCell>
                <TableCell align="center">
                  <strong>{totals.regular.toFixed(1)}</strong>
                </TableCell>
                <TableCell align="center">
                  <strong>{totals.overtime.toFixed(1)}</strong>
                </TableCell>
                <TableCell align="center">
                  <strong>{(totals.regular + totals.overtime).toFixed(1)}</strong>
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={handleSaveAll}
          variant="contained"
          disabled={saving || editingId !== null}
        >
          {saving ? 'Saving...' : 'Save Hours'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}