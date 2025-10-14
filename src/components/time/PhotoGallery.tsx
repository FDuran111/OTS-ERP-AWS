'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  IconButton,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  DialogTitle
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ZoomIn as ZoomInIcon,
  Close as CloseIcon,
  CameraAlt as CameraIcon
} from '@mui/icons-material'

// Predefined photo labels
const PHOTO_LABELS = [
  { value: 'Start', label: '🟢 Start - Before Work', color: '#4caf50' },
  { value: 'In Progress', label: '🟡 In Progress - During Work', color: '#ff9800' },
  { value: 'Finished', label: '✅ Finished - After Work', color: '#2196f3' },
  { value: 'Problem', label: '⚠️ Problem - Issue Found', color: '#f44336' },
  { value: 'Material', label: '📦 Material - Material Used', color: '#9c27b0' },
  { value: 'Equipment', label: '🔧 Equipment - Tools/Equipment', color: '#607d8b' },
  { value: 'Safety', label: '🦺 Safety - Safety Concern', color: '#ff5722' },
  { value: 'Other', label: '📝 Other', color: '#757575' }
]

interface Photo {
  id: string
  photoUrl: string
  thumbnailUrl: string | null
  caption: string | null
  fileSize: number
  mimeType: string
  uploadedAt: string
}

interface PhotoGalleryProps {
  timeEntryId: string | null
  userId: string
  editable?: boolean
  onPhotoChange?: () => void
}

export default function PhotoGallery({ timeEntryId, userId, editable = true, onPhotoChange }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [fullSizeUrl, setFullSizeUrl] = useState<string | null>(null)
  const [labelDialogOpen, setLabelDialogOpen] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<FileList | null>(null)
  const [selectedLabel, setSelectedLabel] = useState<string>('')
  const [customCaption, setCustomCaption] = useState<string>('')

  // Load photos when timeEntryId changes
  useEffect(() => {
    if (timeEntryId) {
      loadPhotos()
    }
  }, [timeEntryId])

  const loadPhotos = async () => {
    if (!timeEntryId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/time-entries/${timeEntryId}/photos`)
      if (!response.ok) throw new Error('Failed to load photos')
      
      const data = await response.json()
      setPhotos(data)
    } catch (err: any) {
      console.error('Error loading photos:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0 || !timeEntryId) return

    // Open label selection dialog
    setPendingFiles(files)
    setSelectedLabel('')
    setCustomCaption('')
    setLabelDialogOpen(true)

    // Reset file input
    event.target.value = ''
  }

  const handleLabelSubmit = async () => {
    if (!pendingFiles || !timeEntryId) return

    setLabelDialogOpen(false)
    setUploading(true)
    setError(null)

    try {
      // Build caption from label + custom text
      const caption = selectedLabel + (customCaption ? ` - ${customCaption}` : '')

      // Upload each file
      for (const file of Array.from(pendingFiles)) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('uploadedBy', userId)
        formData.append('caption', caption)

        const response = await fetch(`/api/time-entries/${timeEntryId}/photos`, {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to upload photo')
        }
      }

      // Reload photos
      await loadPhotos()

      if (onPhotoChange) {
        onPhotoChange()
      }
    } catch (err: any) {
      console.error('Error uploading photo:', err)
      setError(err.message)
    } finally {
      setUploading(false)
      setPendingFiles(null)
    }
  }

  const handleLabelCancel = () => {
    setLabelDialogOpen(false)
    setPendingFiles(null)
    setSelectedLabel('')
    setCustomCaption('')
  }

  const handleDelete = async (photoId: string) => {
    if (!confirm('Delete this photo?')) return

    try {
      const response = await fetch(
        `/api/time-entries/${timeEntryId}/photos?photoId=${photoId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        throw new Error('Failed to delete photo')
      }

      // Remove from local state
      setPhotos(photos.filter(p => p.id !== photoId))
      
      if (onPhotoChange) {
        onPhotoChange()
      }
    } catch (err: any) {
      console.error('Error deleting photo:', err)
      setError(err.message)
    }
  }

  const handleView = async (photo: Photo) => {
    setSelectedPhoto(photo)
    setViewerOpen(true)

    // Get full size URL
    try {
      const response = await fetch(`/api/materials/view-packing-slip?key=${encodeURIComponent(photo.photoUrl)}`)
      const data = await response.json()
      if (data.url) {
        setFullSizeUrl(data.url)
      }
    } catch (err) {
      console.error('Error getting photo URL:', err)
    }
  }

  const handleCloseViewer = () => {
    setViewerOpen(false)
    setSelectedPhoto(null)
    setFullSizeUrl(null)
  }

  if (!timeEntryId && editable) {
    return (
      <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Save the time entry first to add photos
        </Typography>
      </Box>
    )
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {editable && (
        <Box sx={{ mb: 2 }}>
          <input
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={handleFileSelect}
            id="photo-upload"
            style={{ display: 'none' }}
          />
          <label htmlFor="photo-upload">
            <Button
              variant="outlined"
              component="span"
              startIcon={uploading ? <CircularProgress size={20} /> : <CameraIcon />}
              disabled={uploading || !timeEntryId}
            >
              {uploading ? 'Uploading...' : 'Add Photos'}
            </Button>
          </label>
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : photos.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          No photos added yet
        </Typography>
      ) : (
        <ImageList cols={3} gap={8} sx={{ maxHeight: 400, overflow: 'auto' }}>
          {photos.map((photo) => (
            <ImageListItem key={photo.id}>
              <img
                src={photo.thumbnailUrl || photo.photoUrl}
                alt={photo.caption || 'Time entry photo'}
                loading="lazy"
                style={{ cursor: 'pointer', objectFit: 'cover', height: 200 }}
                onClick={() => handleView(photo)}
              />
              <ImageListItemBar
                title={photo.caption || ''}
                subtitle={new Date(photo.uploadedAt).toLocaleString()}
                actionIcon={
                  <Box>
                    <IconButton
                      sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
                      onClick={() => handleView(photo)}
                    >
                      <ZoomInIcon />
                    </IconButton>
                    {editable && (
                      <IconButton
                        sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
                        onClick={() => handleDelete(photo.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                }
              />
            </ImageListItem>
          ))}
        </ImageList>
      )}

      {/* Photo Viewer Dialog */}
      <Dialog
        open={viewerOpen}
        onClose={handleCloseViewer}
        maxWidth="lg"
        fullWidth
      >
        <DialogActions sx={{ position: 'absolute', top: 0, right: 0, zIndex: 1 }}>
          <IconButton onClick={handleCloseViewer} sx={{ color: 'white', bgcolor: 'rgba(0,0,0,0.5)' }}>
            <CloseIcon />
          </IconButton>
        </DialogActions>
        <DialogContent sx={{ p: 0, bgcolor: 'black' }}>
          {fullSizeUrl ? (
            <img
              src={fullSizeUrl}
              alt={selectedPhoto?.caption || 'Photo'}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          )}
          {selectedPhoto?.caption && (
            <Box sx={{ p: 2, bgcolor: 'white' }}>
              <Typography variant="body1">{selectedPhoto.caption}</Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Label Selection Dialog */}
      <Dialog
        open={labelDialogOpen}
        onClose={handleLabelCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Tag Your Photo{pendingFiles && pendingFiles.length > 1 ? 's' : ''}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Select Label *</InputLabel>
              <Select
                value={selectedLabel}
                label="Select Label *"
                onChange={(e) => setSelectedLabel(e.target.value)}
              >
                {PHOTO_LABELS.map((label) => (
                  <MenuItem key={label.value} value={label.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: label.color
                        }}
                      />
                      {label.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Additional Notes (Optional)"
              placeholder="Add any additional details..."
              value={customCaption}
              onChange={(e) => setCustomCaption(e.target.value)}
              multiline
              rows={2}
              helperText={`${pendingFiles?.length || 0} photo(s) selected`}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleLabelCancel}>Cancel</Button>
          <Button
            onClick={handleLabelSubmit}
            variant="contained"
            disabled={!selectedLabel}
          >
            Upload {pendingFiles?.length || 0} Photo{(pendingFiles?.length || 0) > 1 ? 's' : ''}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
