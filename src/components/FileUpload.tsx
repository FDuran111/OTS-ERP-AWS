'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Box,
  Button,
  LinearProgress,
  Typography,
  Alert,
  Chip,
  IconButton,
  Card,
  CardContent,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Avatar,
} from '@mui/material'
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
  Description as DocumentIcon,
  Close as CloseIcon,
  Add as AddIcon,
} from '@mui/icons-material'

interface UploadedFile {
  id: string
  fileName: string
  originalName: string
  mimeType: string
  fileSize: number
  fileUrl: string
  isImage: boolean
  thumbnailUrl?: string
  description?: string
  tags: string[]
  uploadedAt: string
}

interface FileUploadProps {
  category?: 'jobs' | 'customers' | 'materials' | 'documents'
  onFilesUploaded?: (files: UploadedFile[]) => void
  onFileDeleted?: (fileId: string) => void
  maxFiles?: number
  acceptedFileTypes?: string[]
  multiple?: boolean
  showPreview?: boolean
}

export default function FileUpload({
  category = 'documents',
  onFilesUploaded,
  onFileDeleted,
  maxFiles = 10,
  acceptedFileTypes = ['image/*', '.pdf', '.doc', '.docx', '.xls', '.xlsx'],
  multiple = true,
  showPreview = true
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null)
  const [descriptionDialog, setDescriptionDialog] = useState<{ open: boolean; file?: File; description: string; tags: string }>({
    open: false,
    description: '',
    tags: ''
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    
    // Show description dialog for first file
    setDescriptionDialog({
      open: true,
      file,
      description: '',
      tags: ''
    })
  }

  const uploadFile = async (file: File, description: string = '', tags: string = '') => {
    setUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', category)
      if (description) formData.append('description', description)
      if (tags) formData.append('tags', tags)

      const response = await fetch('/api/files/upload-handler', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()
      const newFile = result.file

      setUploadedFiles(prev => [...prev, newFile])
      onFilesUploaded?.([newFile])

      setUploadProgress(100)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }

  const handleUploadWithDescription = async () => {
    if (!descriptionDialog.file) return

    await uploadFile(
      descriptionDialog.file,
      descriptionDialog.description,
      descriptionDialog.tags
    )

    setDescriptionDialog({ open: false, description: '', tags: '' })
  }

  const handleDeleteFile = async (fileId: string) => {
    try {
      // Call the API to delete the file
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete file')
      }
      
      // Remove from local state only after successful deletion
      setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
      onFileDeleted?.(fileId)
    } catch (error) {
      console.error('Error deleting file:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete file')
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer.files
    handleFileSelect(files)
  }, [])

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <ImageIcon color="primary" />
    }
    return <DocumentIcon color="action" />
  }

  return (
    <Box>
      {/* Upload Area */}
      <Card
        sx={{
          border: dragOver ? '2px dashed #1976d2' : '2px dashed #e0e0e0',
          backgroundColor: dragOver ? 'rgba(25, 118, 210, 0.04)' : 'transparent',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          mb: 2
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Drag & drop files here or click to browse
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Supported formats: Images, PDF, Documents ({acceptedFileTypes.join(', ')})
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Maximum file size: 10MB
          </Typography>
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={acceptedFileTypes.join(',')}
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {/* Upload Progress */}
      {uploading && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            Uploading... {Math.round(uploadProgress)}%
          </Typography>
          <LinearProgress variant="determinate" value={uploadProgress} />
        </Box>
      )}

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Uploaded Files Preview */}
      {showPreview && uploadedFiles.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Uploaded Files ({uploadedFiles.length})
          </Typography>
          
          <Grid container spacing={2}>
            {uploadedFiles.map((file) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={file.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                      <Avatar sx={{ mr: 2, width: 40, height: 40 }}>
                        {getFileIcon(file.mimeType)}
                      </Avatar>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="body2" noWrap title={file.originalName}>
                          {file.originalName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatFileSize(file.fileSize)}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteFile(file.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    {/* Image Preview */}
                    {file.isImage && file.thumbnailUrl && (
                      <Box
                        component="img"
                        src={file.thumbnailUrl}
                        alt={file.originalName}
                        sx={{
                          width: '100%',
                          height: 120,
                          objectFit: 'cover',
                          borderRadius: 1,
                          mb: 1,
                          cursor: 'pointer'
                        }}
                        onClick={() => setPreviewFile(file)}
                      />
                    )}

                    {/* File Description */}
                    {file.description && (
                      <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                        {file.description}
                      </Typography>
                    )}

                    {/* File Tags */}
                    {file.tags.length > 0 && (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        {file.tags.map((tag, index) => (
                          <Chip key={index} label={tag} size="small" variant="outlined" />
                        ))}
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Description Dialog */}
      <Dialog
        open={descriptionDialog.open}
        onClose={() => setDescriptionDialog({ open: false, description: '', tags: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add File Details</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {descriptionDialog.file && (
              <Box>
                <Typography variant="body2" color="text.secondary">
                  File: {descriptionDialog.file.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Size: {formatFileSize(descriptionDialog.file.size)}
                </Typography>
              </Box>
            )}
            
            <TextField
              label="Description (optional)"
              multiline
              rows={3}
              value={descriptionDialog.description}
              onChange={(e) => setDescriptionDialog(prev => ({ 
                ...prev, 
                description: e.target.value 
              }))}
              fullWidth
              placeholder="Describe what this file contains..."
            />
            
            <TextField
              label="Tags (optional)"
              value={descriptionDialog.tags}
              onChange={(e) => setDescriptionDialog(prev => ({ 
                ...prev, 
                tags: e.target.value 
              }))}
              fullWidth
              placeholder="Enter tags separated by commas (e.g., before, electrical, permit)"
              helperText="Separate multiple tags with commas"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDescriptionDialog({ open: false, description: '', tags: '' })}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUploadWithDescription}
            variant="contained"
            disabled={uploading}
          >
            Upload File
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {previewFile?.originalName}
            </Typography>
            <IconButton onClick={() => setPreviewFile(null)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {previewFile?.isImage && previewFile.fileUrl && (
            <Box
              component="img"
              src={previewFile.fileUrl}
              alt={previewFile.originalName}
              sx={{
                width: '100%',
                height: 'auto',
                maxHeight: '70vh',
                objectFit: 'contain'
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  )
}