'use client'

import { useState, useCallback } from 'react'
import {
  Box,
  Button,
  Typography,
  Paper,
  IconButton,
  LinearProgress,
  Alert,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Dialog,
  DialogContent,
  CircularProgress,
} from '@mui/material'
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Image as ImageIcon,
  InsertDriveFile as FileIcon,
  ZoomIn as ZoomIcon,
} from '@mui/icons-material'
import { useDropzone } from 'react-dropzone'

interface UploadedFile {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  url: string
  thumbnailUrl?: string
  uploadedAt: string
  uploadedByName?: string
}

interface PhotoUploaderProps {
  jobId: string
  onUploadComplete?: () => void
  existingFiles?: UploadedFile[]
}

export default function PhotoUploader({ jobId, onUploadComplete, existingFiles = [] }: PhotoUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError(null)
    setUploading(true)
    setUploadProgress(0)

    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i]
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', 'photos')

      try {
        const response = await fetch(`/api/jobs/${jobId}/upload`, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Upload failed')
        }

        const result = await response.json()
        setFiles(prev => [...prev, result.file])
        setUploadProgress(((i + 1) / acceptedFiles.length) * 100)
      } catch (err) {
        console.error('Upload error:', err)
        setError(err instanceof Error ? err.message : 'Failed to upload file')
      }
    }

    setUploading(false)
    setUploadProgress(0)
    if (onUploadComplete) {
      onUploadComplete()
    }
  }, [jobId, onUploadComplete])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 10485760, // 10MB
    multiple: true,
  })

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return

    try {
      const response = await fetch(`/api/uploads/${fileId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setFiles(prev => prev.filter(f => f.id !== fileId))
      } else {
        throw new Error('Failed to delete file')
      }
    } catch (err) {
      console.error('Delete error:', err)
      setError('Failed to delete file')
    }
  }

  const fetchExistingFiles = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/jobs/${jobId}/upload`)
      if (response.ok) {
        const result = await response.json()
        setFiles(result.files || [])
      }
    } catch (err) {
      console.error('Error fetching files:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch existing files on mount
  useState(() => {
    if (!existingFiles || existingFiles.length === 0) {
      fetchExistingFiles()
    }
  })

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB'
    return Math.round(bytes / 1048576) + ' MB'
  }

  return (
    <Box>
      {/* Upload Area */}
      <Paper
        {...getRootProps()}
        sx={{
          p: 3,
          mb: 3,
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.400',
          bgcolor: isDragActive ? 'action.hover' : 'background.paper',
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover',
          },
        }}
      >
        <input {...getInputProps()} />
        <Box sx={{ textAlign: 'center' }}>
          <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {isDragActive ? 'Drop files here' : 'Drag & drop files or click to browse'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Supported: Images (JPEG, PNG, GIF, WebP) and PDFs up to 10MB
          </Typography>
        </Box>
      </Paper>

      {/* Upload Progress */}
      {uploading && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress variant="determinate" value={uploadProgress} />
          <Typography variant="body2" sx={{ mt: 1 }}>
            Uploading... {Math.round(uploadProgress)}%
          </Typography>
        </Box>
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Files Grid */}
      {files.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Uploaded Files ({files.length})
          </Typography>

          <ImageList sx={{ width: '100%', height: 'auto' }} cols={4} rowHeight={200}>
            {files.map((file) => (
              <ImageListItem key={file.id}>
                <Box
                  sx={{
                    width: '100%',
                    height: 200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'grey.100',
                    cursor: 'pointer',
                    position: 'relative',
                    '&:hover .actions': {
                      opacity: 1,
                    },
                  }}
                  onClick={() => setSelectedImage(file.url)}
                >
                  {file.fileType.startsWith('image/') ? (
                    <img
                      src={file.thumbnailUrl || file.url}
                      alt={file.fileName}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <FileIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
                  )}

                  <Box
                    className="actions"
                    sx={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      p: 1,
                    }}
                  >
                    <IconButton
                      size="small"
                      sx={{ bgcolor: 'background.paper', mr: 0.5 }}
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(file.url, '_blank')
                      }}
                    >
                      <ZoomIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      sx={{ bgcolor: 'background.paper' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(file.id)
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>

                <ImageListItemBar
                  title={file.fileName}
                  subtitle={`${formatFileSize(file.fileSize)} • ${new Date(file.uploadedAt).toLocaleDateString()}`}
                />
              </ImageListItem>
            ))}
          </ImageList>
        </Box>
      )}

      {/* Image Preview Dialog */}
      <Dialog
        open={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        maxWidth="xl"
        fullWidth
      >
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          <IconButton
            onClick={() => setSelectedImage(null)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              bgcolor: 'background.paper',
              zIndex: 1,
            }}
          >
            <CloseIcon />
          </IconButton>
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Preview"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  )
}