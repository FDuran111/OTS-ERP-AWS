'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Chip,
  Avatar,
  Stack,
  Alert,
  Divider,
  Tabs,
  Tab,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Image as ImageIcon,
  Description as DocumentIcon,
  Attachment as AttachmentIcon,
  Close as CloseIcon,
  RequestQuote as BidIcon,
} from '@mui/icons-material'
import FileUpload from './FileUpload'
import BidSheetForm from './jobs/BidSheetForm'

interface FileAttachment {
  attachmentId: string
  attachmentType: string
  category?: string
  phase?: string
  attachmentDescription?: string
  isPrimary: boolean
  sortOrder?: number
  attachedAt: string
  file: {
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
}

interface FileAttachmentManagerProps {
  entityType: 'job' | 'customer' | 'material'
  entityId: string
  onAttachmentChange?: () => void
}

const ATTACHMENT_TYPES = {
  job: [
    { value: 'BEFORE_PHOTO', label: 'Before Photo' },
    { value: 'AFTER_PHOTO', label: 'After Photo' },
    { value: 'PROGRESS_PHOTO', label: 'Progress Photo' },
    { value: 'PROBLEM_PHOTO', label: 'Problem Photo' },
    { value: 'SOLUTION_PHOTO', label: 'Solution Photo' },
    { value: 'PERMIT', label: 'Permit' },
    { value: 'INVOICE', label: 'Invoice' },
    { value: 'CONTRACT', label: 'Contract' },
    { value: 'SPEC_SHEET', label: 'Specification Sheet' },
    { value: 'DIAGRAM', label: 'Diagram' },
    { value: 'RECEIPT', label: 'Receipt' },
  ],
  customer: [
    { value: 'PROFILE_PHOTO', label: 'Profile Photo' },
    { value: 'ID_DOCUMENT', label: 'ID Document' },
    { value: 'CONTRACT', label: 'Contract' },
    { value: 'AGREEMENT', label: 'Agreement' },
    { value: 'SIGNATURE', label: 'Signature' },
  ],
  material: [
    { value: 'PRODUCT_PHOTO', label: 'Product Photo' },
    { value: 'SPEC_SHEET', label: 'Specification Sheet' },
    { value: 'WARRANTY', label: 'Warranty' },
    { value: 'MANUAL', label: 'Manual' },
    { value: 'CERTIFICATE', label: 'Certificate' },
    { value: 'INVOICE', label: 'Invoice' },
  ]
}

const JOB_CATEGORIES = [
  'ELECTRICAL',
  'PERMITS',
  'SAFETY',
  'DOCUMENTATION',
  'BILLING'
]

const JOB_PHASES = [
  'PLANNING',
  'INSTALLATION',
  'TESTING',
  'COMPLETION',
  'FOLLOW_UP'
]

export default function FileAttachmentManager({
  entityType,
  entityId,
  onAttachmentChange
}: FileAttachmentManagerProps) {
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedAttachment, setSelectedAttachment] = useState<FileAttachment | null>(null)
  const [previewFile, setPreviewFile] = useState<FileAttachment | null>(null)
  const [bidSheetOpen, setBidSheetOpen] = useState(false)
  const [tabValue, setTabValue] = useState(0)

  // Form state for attaching uploaded files
  const [attachmentForm, setAttachmentForm] = useState({
    fileId: '',
    attachmentType: '',
    category: '',
    phase: '',
    description: '',
    isPrimary: false
  })

  useEffect(() => {
    fetchAttachments()
  }, [entityId])

  const fetchAttachments = async () => {
    try {
      setLoading(true)
      const queryParam = `${entityType}Id=${entityId}`
      const response = await fetch(`/api/files/attachments?${queryParam}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })

      if (!response.ok) throw new Error('Failed to fetch attachments')

      const data = await response.json()
      setAttachments(data)
    } catch (error) {
      console.error('Error fetching attachments:', error)
      setError('Failed to load attachments')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUploaded = async (uploadedFiles: any[]) => {
    if (uploadedFiles.length === 0) return

    const file = uploadedFiles[0]
    
    // Show attachment form for the uploaded file
    setAttachmentForm({
      fileId: file.id,
      attachmentType: ATTACHMENT_TYPES[entityType][0]?.value || '',
      category: entityType === 'job' ? JOB_CATEGORIES[0] : '',
      phase: entityType === 'job' ? JOB_PHASES[0] : '',
      description: '',
      isPrimary: false
    })
    setEditDialogOpen(true)
  }

  const handleAttachFile = async () => {
    try {
      const payload: any = {
        [`${entityType}Id`]: entityId,
        fileId: attachmentForm.fileId,
        attachmentType: attachmentForm.attachmentType,
        description: attachmentForm.description,
        isPrimary: attachmentForm.isPrimary
      }

      if (entityType === 'job') {
        payload.category = attachmentForm.category
        payload.phase = attachmentForm.phase
      }

      const response = await fetch('/api/files/attachments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) throw new Error('Failed to attach file')

      await fetchAttachments()
      onAttachmentChange?.()
      setEditDialogOpen(false)
      setUploadDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error attaching file:', error)
      setError('Failed to attach file')
    }
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) {
      return
    }
    
    try {
      // Find the attachment to get the file ID
      const attachment = attachments.find(a => a.attachmentId === attachmentId)
      if (!attachment) return
      
      // First delete the attachment record
      const attachmentResponse = await fetch(`/api/files/attachments?attachmentId=${attachmentId}`, {
        method: 'DELETE'
      })
      
      if (!attachmentResponse.ok) {
        throw new Error('Failed to delete attachment record')
      }
      
      // Then delete the actual file
      const fileResponse = await fetch(`/api/files/${attachment.file.id}`, {
        method: 'DELETE'
      })
      
      if (!fileResponse.ok) {
        console.error('Failed to delete file from storage')
      }
      
      // Update UI
      setAttachments(prev => prev.filter(a => a.attachmentId !== attachmentId))
      onAttachmentChange?.()
    } catch (error) {
      console.error('Error deleting attachment:', error)
      setError('Failed to delete attachment')
    }
  }

  const resetForm = () => {
    setAttachmentForm({
      fileId: '',
      attachmentType: '',
      category: '',
      phase: '',
      description: '',
      isPrimary: false
    })
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <ImageIcon color="primary" />
    }
    return <DocumentIcon color="action" />
  }

  const filterAttachmentsByTab = (attachments: FileAttachment[]) => {
    if (tabValue === 0) return attachments // All
    if (tabValue === 1) return attachments.filter(a => a.file.isImage) // Images
    return attachments.filter(a => !a.file.isImage) // Documents
  }

  if (loading) {
    return <Typography>Loading attachments...</Typography>
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          📎 File Attachments ({attachments.length})
        </Typography>
        <Stack direction="row" spacing={1}>
          {entityType === 'job' && (
            <Button
              variant="outlined"
              startIcon={<BidIcon />}
              onClick={() => setBidSheetOpen(true)}
            >
              Create Bid Sheet
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setUploadDialogOpen(true)}
          >
            Add Files
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filter Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label={`All (${attachments.length})`} />
          <Tab label={`Images (${attachments.filter(a => a.file.isImage).length})`} />
          <Tab label={`Documents (${attachments.filter(a => !a.file.isImage).length})`} />
        </Tabs>
      </Box>

      {/* Attachments Grid */}
      <Grid container spacing={2}>
        {filterAttachmentsByTab(attachments).map((attachment) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={attachment.attachmentId}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <Avatar sx={{ mr: 2, width: 40, height: 40 }}>
                    {getFileIcon(attachment.file.mimeType)}
                  </Avatar>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight="bold" noWrap title={attachment.file.originalName}>
                      {attachment.file.originalName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatFileSize(attachment.file.fileSize)}
                    </Typography>
                    {attachment.isPrimary && (
                      <Chip label="Primary" size="small" color="primary" sx={{ ml: 1 }} />
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton size="small" onClick={() => window.open(attachment.file.fileUrl, '_blank')}>
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteAttachment(attachment.attachmentId)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                {/* Image Thumbnail */}
                {attachment.file.isImage && attachment.file.thumbnailUrl && (
                  <CardMedia
                    component="img"
                    image={attachment.file.thumbnailUrl}
                    alt={attachment.file.originalName}
                    sx={{
                      height: 120,
                      objectFit: 'cover',
                      borderRadius: 1,
                      mb: 1,
                      cursor: 'pointer'
                    }}
                    onClick={() => setPreviewFile(attachment)}
                  />
                )}

                {/* Attachment Info */}
                <Stack spacing={1}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Type:
                    </Typography>
                    <Typography variant="body2">
                      {ATTACHMENT_TYPES[entityType].find(t => t.value === attachment.attachmentType)?.label || attachment.attachmentType}
                    </Typography>
                  </Box>

                  {entityType === 'job' && attachment.category && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Category:
                      </Typography>
                      <Typography variant="body2">
                        {attachment.category}
                      </Typography>
                    </Box>
                  )}

                  {entityType === 'job' && attachment.phase && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Phase:
                      </Typography>
                      <Typography variant="body2">
                        {attachment.phase}
                      </Typography>
                    </Box>
                  )}

                  {attachment.attachmentDescription && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Description:
                      </Typography>
                      <Typography variant="body2">
                        {attachment.attachmentDescription}
                      </Typography>
                    </Box>
                  )}

                  {attachment.file.tags.length > 0 && (
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                      {attachment.file.tags.map((tag, index) => (
                        <Chip key={index} label={tag} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {attachments.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <AttachmentIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            No files attached yet
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setUploadDialogOpen(true)}
            sx={{ mt: 2 }}
          >
            Add First File
          </Button>
        </Box>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Upload Files</DialogTitle>
        <DialogContent>
          <FileUpload
            category={entityType === 'job' ? 'jobs' : entityType === 'customer' ? 'customers' : 'materials'}
            onFilesUploaded={handleFileUploaded}
            showPreview={false}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Attachment Details Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Attach File</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Attachment Type</InputLabel>
              <Select
                value={attachmentForm.attachmentType}
                onChange={(e) => setAttachmentForm(prev => ({ ...prev, attachmentType: e.target.value }))}
              >
                {ATTACHMENT_TYPES[entityType].map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {entityType === 'job' && (
              <>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={attachmentForm.category}
                    onChange={(e) => setAttachmentForm(prev => ({ ...prev, category: e.target.value }))}
                  >
                    {JOB_CATEGORIES.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Phase</InputLabel>
                  <Select
                    value={attachmentForm.phase}
                    onChange={(e) => setAttachmentForm(prev => ({ ...prev, phase: e.target.value }))}
                  >
                    {JOB_PHASES.map((phase) => (
                      <MenuItem key={phase} value={phase}>
                        {phase}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}

            <TextField
              label="Description"
              multiline
              rows={3}
              value={attachmentForm.description}
              onChange={(e) => setAttachmentForm(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAttachFile} variant="contained">
            Attach File
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
              {previewFile?.file.originalName}
            </Typography>
            <IconButton onClick={() => setPreviewFile(null)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {previewFile?.file.isImage && previewFile.file.fileUrl && (
            <Box
              component="img"
              src={previewFile.file.fileUrl}
              alt={previewFile.file.originalName}
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

      {/* Bid Sheet Dialog */}
      {entityType === 'job' && (
        <BidSheetForm
          open={bidSheetOpen}
          onClose={() => setBidSheetOpen(false)}
          jobId={entityId}
          onBidSheetCreated={(bidSheet) => {
            // Refresh attachments after bid sheet is created
            fetchAttachments()
            setBidSheetOpen(false)
          }}
        />
      )}
    </Box>
  )
}