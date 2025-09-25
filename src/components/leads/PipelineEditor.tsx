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
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Alert,
  CircularProgress,
  InputAdornment,
} from '@mui/material'
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Add as AddIcon,
  Close as CloseIcon,
  Save as SaveIcon,
} from '@mui/icons-material'
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface PipelineStage {
  id: string
  name: string
  systemName: string
  position: number
  color: string
  isDefault?: boolean
  leadCount?: number
}

interface PipelineEditorProps {
  open: boolean
  onClose: () => void
  onSave?: () => void
}

function SortableStageItem({ stage, onEdit, onDelete }: {
  stage: PipelineStage
  onEdit: (stage: PipelineStage) => void
  onDelete: (stage: PipelineStage) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        mb: 1,
        cursor: 'grab',
        '&:hover': {
          bgcolor: 'action.hover',
        },
      }}
    >
      <Box
        {...attributes}
        {...listeners}
        sx={{ mr: 2, cursor: 'grab', display: 'flex', alignItems: 'center' }}
      >
        <DragIcon />
      </Box>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 24,
                height: 24,
                borderRadius: 1,
                bgcolor: stage.color,
                border: 1,
                borderColor: 'divider',
              }}
            />
            <Typography fontWeight="medium">{stage.name}</Typography>
            {stage.isDefault && (
              <Chip label="Default" size="small" color="primary" />
            )}
          </Box>
        }
        secondary={`${stage.leadCount || 0} leads`}
      />
      <ListItemSecondaryAction>
        <IconButton
          edge="end"
          size="small"
          onClick={() => onEdit(stage)}
        >
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton
          edge="end"
          size="small"
          onClick={() => onDelete(stage)}
          disabled={stage.leadCount && stage.leadCount > 0}
          sx={{ ml: 1 }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </ListItemSecondaryAction>
    </ListItem>
  )
}

export default function PipelineEditor({ open, onClose, onSave }: PipelineEditorProps) {
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null)
  const [newStageName, setNewStageName] = useState('')
  const [newStageColor, setNewStageColor] = useState('#6B7280')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    if (open) {
      fetchStages()
    }
  }, [open])

  const fetchStages = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/pipeline/stages')
      if (!response.ok) {
        throw new Error('Failed to fetch pipeline stages')
      }
      const data = await response.json()
      setStages(data.stages || [])
    } catch (error) {
      console.error('Error fetching stages:', error)
      setError('Failed to load pipeline stages')
    } finally {
      setLoading(false)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      setStages((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id)
        const newIndex = items.findIndex(item => item.id === over?.id)
        const newItems = arrayMove(items, oldIndex, newIndex)
        // Update positions
        return newItems.map((item, index) => ({
          ...item,
          position: index + 1
        }))
      })
    }
  }

  const handleAddStage = async () => {
    if (!newStageName.trim()) return

    try {
      setSaving(true)
      const newStage = {
        name: newStageName,
        systemName: newStageName.toUpperCase().replace(/\s+/g, '_'),
        position: stages.length + 1,
        color: newStageColor,
      }

      const response = await fetch('/api/pipeline/stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStage)
      })

      if (!response.ok) {
        throw new Error('Failed to add stage')
      }

      const addedStage = await response.json()
      setStages([...stages, addedStage])
      setNewStageName('')
      setNewStageColor('#6B7280')
    } catch (error) {
      console.error('Error adding stage:', error)
      setError('Failed to add stage')
    } finally {
      setSaving(false)
    }
  }

  const handleEditStage = async (stage: PipelineStage) => {
    // For now, just allow editing name and color
    const newName = prompt('Enter new name:', stage.name)
    if (!newName || newName === stage.name) return

    try {
      setSaving(true)
      const response = await fetch(`/api/pipeline/stages/${stage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      })

      if (!response.ok) {
        throw new Error('Failed to update stage')
      }

      const updatedStage = await response.json()
      setStages(stages.map(s => s.id === stage.id ? updatedStage : s))
    } catch (error) {
      console.error('Error updating stage:', error)
      setError('Failed to update stage')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteStage = async (stage: PipelineStage) => {
    const message = stage.isDefault
      ? `Delete default stage "${stage.name}"? This was a pre-configured stage but you can remove it if not needed. This cannot be undone.`
      : `Delete stage "${stage.name}"? This cannot be undone.`

    if (!confirm(message)) return

    try {
      setSaving(true)
      const response = await fetch(`/api/pipeline/stages/${stage.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete stage')
      }

      setStages(stages.filter(s => s.id !== stage.id))
    } catch (error) {
      console.error('Error deleting stage:', error)
      setError('Failed to delete stage')
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      // Save the reordered positions
      const response = await fetch('/api/pipeline/stages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stages })
      })

      if (!response.ok) {
        throw new Error('Failed to save pipeline')
      }

      if (onSave) {
        onSave()
      }
      onClose()
    } catch (error) {
      console.error('Error saving pipeline:', error)
      setError('Failed to save pipeline changes')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Edit Pipeline Stages</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Drag stages to reorder them. Stages with existing leads cannot be deleted.
              </Typography>
            </Box>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={stages.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <List>
                  {stages.map((stage) => (
                    <SortableStageItem
                      key={stage.id}
                      stage={stage}
                      onEdit={handleEditStage}
                      onDelete={handleDeleteStage}
                    />
                  ))}
                </List>
              </SortableContext>
            </DndContext>

            <Box sx={{ mt: 3, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Add New Stage
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                <TextField
                  label="Stage Name"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  size="small"
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Color"
                  type="color"
                  value={newStageColor}
                  onChange={(e) => setNewStageColor(e.target.value)}
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Box
                          sx={{
                            width: 20,
                            height: 20,
                            bgcolor: newStageColor,
                            border: 1,
                            borderColor: 'divider',
                            borderRadius: 0.5,
                          }}
                        />
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddStage}
                  disabled={!newStageName.trim() || saving}
                >
                  Add
                </Button>
              </Box>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={loading || saving}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  )
}