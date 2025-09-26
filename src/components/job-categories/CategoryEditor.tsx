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
  ListItem,
  ListItemText,
  Chip,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
  Avatar,
} from '@mui/material'
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  ViewList as ListIcon,
  GridView as GridIcon,
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

interface JobCategory {
  id: string
  categoryCode: string
  categoryName: string
  description?: string
  icon: string
  color: string
  sortOrder: number
  stats?: {
    totalJobs: number
  }
}

interface CategoryEditorProps {
  open: boolean
  onClose: () => void
  onSave?: () => void
}

function SortableCategoryCard({ category, onEdit, onDelete }: {
  category: JobCategory
  onEdit: (category: JobCategory) => void
  onDelete: (category: JobCategory) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Box sx={{ width: { xs: '100%', sm: '50%', md: '33.333%' }, p: 1 }}>
      <Card
        ref={setNodeRef}
        style={style}
        sx={{
          height: '100%',
          cursor: 'grab',
          '&:hover': {
            boxShadow: 3,
          },
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box
              {...attributes}
              {...listeners}
              sx={{ mr: 1, cursor: 'grab', display: 'flex', alignItems: 'center' }}
            >
              <DragIcon />
            </Box>
            <Avatar sx={{ bgcolor: category.color, mr: 2 }}>
              {category.icon}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" sx={{ color: category.color }}>
                {category.categoryName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {category.categoryCode}
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => onEdit(category)}>
              <EditIcon />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => onDelete(category)}
              disabled={category.stats && category.stats.totalJobs > 0}
            >
              <DeleteIcon />
            </IconButton>
          </Box>

          <Stack spacing={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Total Jobs</Typography>
              <Typography variant="body2" fontWeight="bold">
                {category.stats?.totalJobs || 0}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}

function SortableCategoryItem({ category, onEdit, onDelete }: {
  category: JobCategory
  onEdit: (category: JobCategory) => void
  onDelete: (category: JobCategory) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id })

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
      secondaryAction={
        <>
          <IconButton
            edge="end"
            size="small"
            onClick={() => onEdit(category)}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            edge="end"
            size="small"
            onClick={() => onDelete(category)}
            disabled={category.stats && category.stats.totalJobs > 0}
            sx={{ ml: 1 }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </>
      }
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
                bgcolor: category.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
              }}
            >
              {category.icon}
            </Box>
            <Typography fontWeight="medium">{category.categoryName}</Typography>
          </Box>
        }
        secondary={`Code: ${category.categoryCode} • ${category.stats?.totalJobs || 0} jobs`}
      />
    </ListItem>
  )
}

export default function CategoryEditor({ open, onClose, onSave }: CategoryEditorProps) {
  const [categories, setCategories] = useState<JobCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid')

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<JobCategory | null>(null)
  const [editCategoryCode, setEditCategoryCode] = useState('')
  const [editCategoryName, setEditCategoryName] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    if (open) {
      fetchCategories()
    }
  }, [open])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/job-categories?includeStats=true')
      if (!response.ok) {
        throw new Error('Failed to fetch categories')
      }
      const data = await response.json()
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
      setError('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      setCategories((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id)
        const newIndex = items.findIndex(item => item.id === over?.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const handleEditCategory = (category: JobCategory) => {
    setEditingCategory(category)
    setEditCategoryCode(category.categoryCode)
    setEditCategoryName(category.categoryName)
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingCategory) return

    try {
      setSaving(true)
      const response = await fetch(`/api/job-categories/${editingCategory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryCode: editCategoryCode,
          categoryName: editCategoryName
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update category')
      }

      const updatedCategory = await response.json()
      setCategories(categories.map(c => c.id === editingCategory.id ? updatedCategory : c))
      setEditDialogOpen(false)
      setEditingCategory(null)
    } catch (error) {
      console.error('Error updating category:', error)
      setError('Failed to update category')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCategory = async (category: JobCategory) => {
    if (!confirm(`Delete category "${category.categoryName}"? This cannot be undone.`)) return

    try {
      setSaving(true)
      const response = await fetch(`/api/job-categories/${category.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete category')
      }

      setCategories(categories.filter(c => c.id !== category.id))
    } catch (error) {
      console.error('Error deleting category:', error)
      setError('Failed to delete category')
    } finally {
      setSaving(false)
    }
  }


  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      const response = await fetch('/api/job-categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories })
      })

      if (!response.ok) {
        throw new Error('Failed to save categories')
      }

      if (onSave) {
        onSave()
      }
      onClose()
    } catch (error) {
      console.error('Error saving categories:', error)
      setError('Failed to save category changes')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
      >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Edit Job Categories</Typography>
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

            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2">
                Drag categories to reorder them. Categories with existing jobs cannot be deleted.
              </Typography>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(_, newMode) => newMode && setViewMode(newMode)}
                size="small"
              >
                <ToggleButton value="grid">
                  <GridIcon />
                </ToggleButton>
                <ToggleButton value="list">
                  <ListIcon />
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={categories.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                {viewMode === 'grid' ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1 }}>
                    {categories.map((category) => (
                      <SortableCategoryCard
                        key={category.id}
                        category={category}
                        onEdit={handleEditCategory}
                        onDelete={handleDeleteCategory}
                      />
                    ))}
                  </Box>
                ) : (
                  categories.map((category) => (
                    <SortableCategoryItem
                      key={category.id}
                      category={category}
                      onEdit={handleEditCategory}
                      onDelete={handleDeleteCategory}
                    />
                  ))
                )}
              </SortableContext>
            </DndContext>
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

    {/* Edit Category Dialog */}
    <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Category</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Category Code"
            value={editCategoryCode}
            onChange={(e) => setEditCategoryCode(e.target.value.toUpperCase())}
            fullWidth
            helperText="Unique code for the category (e.g., RESIDENTIAL)"
          />
          <TextField
            label="Category Name"
            value={editCategoryName}
            onChange={(e) => setEditCategoryName(e.target.value)}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
        <Button
          onClick={handleSaveEdit}
          variant="contained"
          disabled={!editCategoryCode.trim() || !editCategoryName.trim() || saving}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
    </>
  )
}