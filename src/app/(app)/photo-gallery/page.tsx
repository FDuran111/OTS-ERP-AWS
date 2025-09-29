'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Avatar,
  Pagination,
  CircularProgress,
  Alert,
} from '@mui/material'
import ResponsiveLayout from '@/components/layout/ResponsiveLayout'
import ResponsiveContainer from '@/components/layout/ResponsiveContainer'
import {
  PhotoLibrary as GalleryIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
  Fullscreen as FullscreenIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  RotateRight as RotateIcon,
  Business as BusinessIcon,
  Home as HomeIcon,
  Person as PersonIcon,
  Inventory as MaterialIcon,
} from '@mui/icons-material'

interface PhotoGalleryItem {
  jobId: string
  jobNumber: string
  jobDescription: string
  jobStatus: string
  attachmentId: string
  attachmentType: string
  category?: string
  phase?: string
  attachmentDescription?: string
  isPrimary: boolean
  sortOrder?: number
  attachedAt: string
  fileId: string
  fileName: string
  originalName: string
  fileUrl: string
  thumbnailUrl?: string
  imageWidth?: number
  imageHeight?: number
  tags: string[]
  customerName?: string
  uploadedAt: string
}

const FILTER_OPTIONS = {
  categories: ['ELECTRICAL', 'PERMITS', 'SAFETY', 'DOCUMENTATION', 'BILLING'],
  phases: ['PLANNING', 'INSTALLATION', 'TESTING', 'COMPLETION', 'FOLLOW_UP'],
  attachmentTypes: ['BEFORE_PHOTO', 'AFTER_PHOTO', 'PROGRESS_PHOTO', 'PROBLEM_PHOTO', 'SOLUTION_PHOTO']
}

export default function PhotoGalleryPage() {
  const [photos, setPhotos] = useState<PhotoGalleryItem[]>([])
  const [filteredPhotos, setFilteredPhotos] = useState<PhotoGalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoGalleryItem | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    phase: '',
    attachmentType: '',
    jobStatus: ''
  })

  const photosPerPage = 12

  useEffect(() => {
    fetchPhotos()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [photos, filters])

  const fetchPhotos = async () => {
    try {
      setLoading(true)
      // Fetch job photos using the JobPhotoView
      const response = await fetch('/api/job-classification?limit=100', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })

      if (!response.ok) throw new Error('Failed to fetch photos')

      const data = await response.json()
      
      // Filter to only include jobs with images
      const photosData = data.filter((item: any) => 
        item.category?.id || item.subCategory?.id || item.serviceType?.id
      )

      setPhotos(photosData)
    } catch (error) {
      console.error('Error fetching photos:', error)
      setError('Failed to load photo gallery')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...photos]

    // Text search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(photo =>
        photo.jobDescription?.toLowerCase().includes(searchLower) ||
        photo.jobNumber?.toLowerCase().includes(searchLower) ||
        photo.customerName?.toLowerCase().includes(searchLower) ||
        photo.attachmentDescription?.toLowerCase().includes(searchLower) ||
        photo.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      )
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter(photo => photo.category === filters.category)
    }

    // Phase filter
    if (filters.phase) {
      filtered = filtered.filter(photo => photo.phase === filters.phase)
    }

    // Attachment type filter
    if (filters.attachmentType) {
      filtered = filtered.filter(photo => photo.attachmentType === filters.attachmentType)
    }

    // Job status filter
    if (filters.jobStatus) {
      filtered = filtered.filter(photo => photo.jobStatus === filters.jobStatus)
    }

    setFilteredPhotos(filtered)
    setCurrentPage(1)
  }

  const handlePhotoClick = (photo: PhotoGalleryItem) => {
    setSelectedPhoto(photo)
    setZoom(1)
    setRotation(0)
  }

  const handleClosePreview = () => {
    setSelectedPhoto(null)
    setZoom(1)
    setRotation(0)
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5))
  }

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getAttachmentTypeColor = (type: string) => {
    switch (type) {
      case 'BEFORE_PHOTO': return 'info'
      case 'AFTER_PHOTO': return 'success'
      case 'PROGRESS_PHOTO': return 'warning'
      case 'PROBLEM_PHOTO': return 'error'
      case 'SOLUTION_PHOTO': return 'primary'
      default: return 'default'
    }
  }

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'ELECTRICAL': return <BusinessIcon />
      case 'PERMITS': return <HomeIcon />
      default: return <GalleryIcon />
    }
  }

  // Pagination
  const totalPages = Math.ceil(filteredPhotos.length / photosPerPage)
  const paginatedPhotos = filteredPhotos.slice(
    (currentPage - 1) * photosPerPage,
    currentPage * photosPerPage
  )

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <ResponsiveLayout>
      <ResponsiveContainer
        title="📸 Photo Gallery"
      >

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                label="Search"
                placeholder="Job number, description, customer..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {FILTER_OPTIONS.categories.map((cat) => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Phase</InputLabel>
                <Select
                  value={filters.phase}
                  onChange={(e) => setFilters(prev => ({ ...prev, phase: e.target.value }))}
                >
                  <MenuItem value="">All Phases</MenuItem>
                  {FILTER_OPTIONS.phases.map((phase) => (
                    <MenuItem key={phase} value={phase}>{phase}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Photo Type</InputLabel>
                <Select
                  value={filters.attachmentType}
                  onChange={(e) => setFilters(prev => ({ ...prev, attachmentType: e.target.value }))}
                >
                  <MenuItem value="">All Types</MenuItem>
                  {FILTER_OPTIONS.attachmentTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type.replace('_', ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Job Status</InputLabel>
                <Select
                  value={filters.jobStatus}
                  onChange={(e) => setFilters(prev => ({ ...prev, jobStatus: e.target.value }))}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="SCHEDULED">Scheduled</MenuItem>
                  <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                  <MenuItem value="COMPLETED">Completed</MenuItem>
                  <MenuItem value="CANCELLED">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Showing {paginatedPhotos.length} of {filteredPhotos.length} photos
        </Typography>
        
        {totalPages > 1 && (
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(_, page) => setCurrentPage(page)}
            color="primary"
            size="small"
          />
        )}
      </Box>

      {/* Photo Grid */}
      <Grid container spacing={2}>
        {paginatedPhotos.map((photo) => (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={`${photo.jobId}-${photo.attachmentId}`}>
            <Card sx={{ cursor: 'pointer' }} onClick={() => handlePhotoClick(photo)}>
              <CardMedia
                component="img"
                height="200"
                image={photo.thumbnailUrl || photo.fileUrl}
                alt={photo.originalName}
                sx={{ objectFit: 'cover' }}
              />
              <CardContent sx={{ p: 2 }}>
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 24, height: 24 }}>
                      {getCategoryIcon(photo.category)}
                    </Avatar>
                    <Typography variant="body2" fontWeight="bold" noWrap>
                      {photo.jobNumber}
                    </Typography>
                  </Box>
                  
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {photo.customerName}
                  </Typography>
                  
                  <Chip
                    label={photo.attachmentType.replace('_', ' ')}
                    size="small"
                    color={getAttachmentTypeColor(photo.attachmentType) as any}
                    variant="outlined"
                  />

                  {photo.attachmentDescription && (
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {photo.attachmentDescription}
                    </Typography>
                  )}

                  <Typography variant="caption" color="text.secondary">
                    {formatDate(photo.uploadedAt)}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Empty State */}
      {filteredPhotos.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <GalleryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No photos found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your filters or upload some job photos
          </Typography>
        </Box>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(_, page) => setCurrentPage(page)}
            color="primary"
          />
        </Box>
      )}

      {/* Photo Preview Dialog */}
      <Dialog
        open={!!selectedPhoto}
        onClose={handleClosePreview}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { height: '90vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6">
                {selectedPhoto?.jobNumber} - {selectedPhoto?.originalName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {selectedPhoto?.customerName} • {selectedPhoto && formatDate(selectedPhoto.uploadedAt)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton onClick={handleZoomOut} disabled={zoom <= 0.5}>
                <ZoomOutIcon />
              </IconButton>
              <Typography variant="body2" sx={{ alignSelf: 'center', minWidth: '50px' }}>
                {Math.round(zoom * 100)}%
              </Typography>
              <IconButton onClick={handleZoomIn} disabled={zoom >= 3}>
                <ZoomInIcon />
              </IconButton>
              <IconButton onClick={handleRotate}>
                <RotateIcon />
              </IconButton>
              <IconButton onClick={handleClosePreview}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'auto' }}>
          {selectedPhoto && (
            <Box
              component="img"
              src={selectedPhoto.fileUrl}
              alt={selectedPhoto.originalName}
              sx={{
                maxWidth: '100%',
                maxHeight: '100%',
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: 'transform 0.3s ease',
                objectFit: 'contain'
              }}
            />
          )}
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'space-between', px: 3 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip
              label={selectedPhoto?.attachmentType.replace('_', ' ')}
              color={getAttachmentTypeColor(selectedPhoto?.attachmentType || '') as any}
              variant="outlined"
            />
            {selectedPhoto?.category && (
              <Chip label={selectedPhoto.category} size="small" />
            )}
            {selectedPhoto?.phase && (
              <Chip label={selectedPhoto.phase} size="small" variant="outlined" />
            )}
          </Box>
          
          <Box>
            <Button
              startIcon={<DownloadIcon />}
              onClick={() => selectedPhoto && window.open(selectedPhoto.fileUrl, '_blank')}
            >
              Download
            </Button>
            <Button onClick={handleClosePreview}>
              Close
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
      </ResponsiveContainer>
    </ResponsiveLayout>
  )
}