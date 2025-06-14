'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as StartIcon,
  CheckCircle as CompleteIcon,
} from '@mui/icons-material'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

interface JobPhase {
  id: string
  name: 'UG' | 'RI' | 'FN'
  description?: string
  estimatedHours?: number
  actualHours?: number
  estimatedCost?: number
  actualCost?: number
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
  startDate?: string
  completedDate?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

interface JobPhasesManagerProps {
  jobId: string
  onPhasesChange?: () => void
}

const phaseSchema = z.object({
  name: z.enum(['UG', 'RI', 'FN']),
  description: z.string().optional(),
  estimatedHours: z.number().positive().optional(),
  estimatedCost: z.number().positive().optional(),
  notes: z.string().optional(),
})

type PhaseFormData = z.infer<typeof phaseSchema>

const getPhaseLabel = (name: string) => {
  switch (name) {
    case 'UG': return 'Underground'
    case 'RI': return 'Rough-in'
    case 'FN': return 'Finish'
    default: return name
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'COMPLETED': return 'success'
    case 'IN_PROGRESS': return 'warning'
    case 'NOT_STARTED': return 'default'
    default: return 'default'
  }
}

export default function JobPhasesManager({ jobId, onPhasesChange }: JobPhasesManagerProps) {
  const [phases, setPhases] = useState<JobPhase[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPhase, setEditingPhase] = useState<JobPhase | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PhaseFormData>({
    resolver: zodResolver(phaseSchema),
  })

  useEffect(() => {
    fetchPhases()
  }, [jobId])

  const fetchPhases = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/jobs/${jobId}/phases`)
      if (!response.ok) throw new Error('Failed to fetch phases')
      const data = await response.json()
      setPhases(data)
    } catch (error) {
      console.error('Error fetching phases:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePhase = () => {
    setEditingPhase(null)
    reset({
      name: 'UG',
      description: '',
      estimatedHours: undefined,
      estimatedCost: undefined,
      notes: '',
    })
    setDialogOpen(true)
  }

  const handleEditPhase = (phase: JobPhase) => {
    setEditingPhase(phase)
    reset({
      name: phase.name,
      description: phase.description || '',
      estimatedHours: phase.estimatedHours || undefined,
      estimatedCost: phase.estimatedCost || undefined,
      notes: phase.notes || '',
    })
    setDialogOpen(true)
  }

  const onSubmit = async (data: PhaseFormData) => {
    try {
      setSubmitting(true)
      
      const url = editingPhase 
        ? `/api/jobs/${jobId}/phases/${editingPhase.id}`
        : `/api/jobs/${jobId}/phases`
      
      const method = editingPhase ? 'PATCH' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save phase')
      }

      await fetchPhases()
      onPhasesChange?.()
      setDialogOpen(false)
    } catch (error) {
      console.error('Error saving phase:', error)
      alert(error instanceof Error ? error.message : 'Failed to save phase')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeletePhase = async (phaseId: string) => {
    if (!window.confirm('Are you sure you want to delete this phase?')) return

    try {
      const response = await fetch(`/api/jobs/${jobId}/phases/${phaseId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete phase')

      await fetchPhases()
      onPhasesChange?.()
    } catch (error) {
      console.error('Error deleting phase:', error)
      alert('Failed to delete phase')
    }
  }

  const handleUpdatePhaseStatus = async (phase: JobPhase, newStatus: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/phases/${phase.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) throw new Error('Failed to update phase status')

      await fetchPhases()
      onPhasesChange?.()
    } catch (error) {
      console.error('Error updating phase status:', error)
      alert('Failed to update phase status')
    }
  }

  const getAvailablePhases = () => {
    const existingPhases = phases.map(p => p.name)
    return ['UG', 'RI', 'FN'].filter(phase => !existingPhases.includes(phase as any))
  }

  if (loading) {
    return <Typography>Loading phases...</Typography>
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Job Phases</Typography>
        <Button
          startIcon={<AddIcon />}
          onClick={handleCreatePhase}
          variant="outlined"
          size="small"
          disabled={getAvailablePhases().length === 0}
        >
          Add Phase
        </Button>
      </Box>

      {phases.length === 0 ? (
        <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
          No phases added yet
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Phase</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Hours</TableCell>
                <TableCell>Cost</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {phases.map((phase) => (
                <TableRow key={phase.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {getPhaseLabel(phase.name)}
                      </Typography>
                      {phase.description && (
                        <Typography variant="caption" color="text.secondary">
                          {phase.description}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={phase.status.replace('_', ' ')}
                      color={getStatusColor(phase.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {phase.actualHours || phase.estimatedHours || '-'} hrs
                      {phase.actualHours && phase.estimatedHours && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Est: {phase.estimatedHours} hrs
                        </Typography>
                      )}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      ${phase.actualCost || phase.estimatedCost || '-'}
                      {phase.actualCost && phase.estimatedCost && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Est: ${phase.estimatedCost}
                        </Typography>
                      )}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {phase.status === 'NOT_STARTED' && (
                        <IconButton
                          size="small"
                          onClick={() => handleUpdatePhaseStatus(phase, 'IN_PROGRESS')}
                          title="Start Phase"
                        >
                          <StartIcon fontSize="small" />
                        </IconButton>
                      )}
                      {phase.status === 'IN_PROGRESS' && (
                        <IconButton
                          size="small"
                          onClick={() => handleUpdatePhaseStatus(phase, 'COMPLETED')}
                          title="Complete Phase"
                        >
                          <CompleteIcon fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        onClick={() => handleEditPhase(phase)}
                        title="Edit Phase"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeletePhase(phase.id)}
                        title="Delete Phase"
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {editingPhase ? 'Edit Phase' : 'Add Phase'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Phase Type</InputLabel>
                      <Select
                        {...field}
                        label="Phase Type"
                        disabled={!!editingPhase}
                      >
                        {(editingPhase ? [editingPhase.name] : getAvailablePhases()).map((phase) => (
                          <MenuItem key={phase} value={phase}>
                            {getPhaseLabel(phase)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Description"
                      fullWidth
                      multiline
                      rows={2}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={6}>
                <Controller
                  name="estimatedHours"
                  control={control}
                  render={({ field: { value, onChange, ...field } }) => (
                    <TextField
                      {...field}
                      value={value || ''}
                      onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      label="Estimated Hours"
                      type="number"
                      fullWidth
                      inputProps={{ min: 0, step: 0.5 }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={6}>
                <Controller
                  name="estimatedCost"
                  control={control}
                  render={({ field: { value, onChange, ...field } }) => (
                    <TextField
                      {...field}
                      value={value || ''}
                      onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      label="Estimated Cost"
                      type="number"
                      fullWidth
                      inputProps={{ min: 0, step: 0.01 }}
                      InputProps={{ startAdornment: '$' }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Notes"
                      fullWidth
                      multiline
                      rows={3}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Saving...' : (editingPhase ? 'Update' : 'Create')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  )
}