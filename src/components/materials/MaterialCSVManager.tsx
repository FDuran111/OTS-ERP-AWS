'use client'

import { useState, useRef } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Stack,
  IconButton,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material'
import {
  Upload as UploadIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  FileUpload as FileUploadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material'
import toast from 'react-hot-toast'

interface MaterialCSVManagerProps {
  open: boolean
  onClose: () => void
  onImportComplete: () => void
}

interface ImportResult {
  successful: number
  failed: number
  errors: Array<{
    row: number
    code: string
    error: string
  }>
}

export default function MaterialCSVManager({
  open,
  onClose,
  onImportComplete,
}: MaterialCSVManagerProps) {
  const [mode, setMode] = useState<'create' | 'update' | 'upsert'>('upsert')
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    try {
      setExporting(true)
      const response = await fetch('/api/materials/export', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to export materials')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `materials-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Materials exported successfully')
    } catch (error) {
      console.error('Error exporting materials:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to export materials')
    } finally {
      setExporting(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast.error('Please select a CSV file')
        return
      }
      setFile(selectedFile)
      setImportResult(null)
    }
  }

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file to import')
      return
    }

    try {
      setImporting(true)
      setImportResult(null)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('mode', mode)

      const response = await fetch('/api/materials/import', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to import materials')
      }

      const result = await response.json()
      setImportResult(result)

      if (result.failed === 0) {
        toast.success(`Successfully imported ${result.successful} material(s)`)
        setTimeout(() => {
          onImportComplete()
          onClose()
        }, 2000)
      } else {
        toast.error(
          `Imported ${result.successful} material(s), ${result.failed} failed. Check details below.`,
          { duration: 5000 }
        )
      }
    } catch (error) {
      console.error('Error importing materials:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to import materials')
    } finally {
      setImporting(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setImportResult(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ 
        bgcolor: 'primary.main', 
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FileUploadIcon />
          CSV Import / Export
        </Box>
        <IconButton onClick={handleClose} sx={{ color: 'white' }} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Stack spacing={3}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <DownloadIcon color="primary" />
                <Typography variant="h6">Export Materials</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Download all active materials as a CSV file. Includes stock levels at each location.
              </Typography>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleExport}
                disabled={exporting}
                sx={{ mt: 2 }}
                fullWidth
              >
                {exporting ? 'Exporting...' : 'Download CSV'}
              </Button>
            </CardContent>
          </Card>

          <Divider />

          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <UploadIcon color="primary" />
                <Typography variant="h6">Import Materials</Typography>
              </Box>

              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="caption" component="div">
                  <strong>CSV Format:</strong> Use the export file as a template. Required columns: Code, Name, Category, Unit
                </Typography>
                <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
                  <strong>Active Column:</strong> Use "Yes"/"No", "True"/"False", or "1"/"0"
                </Typography>
              </Alert>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Import Mode</InputLabel>
                <Select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as any)}
                  label="Import Mode"
                >
                  <MenuItem value="create">
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>Create Only</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Only create new materials, skip existing codes
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="update">
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>Update Only</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Only update existing materials, skip new codes
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="upsert">
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>Create or Update (Recommended)</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Create new materials and update existing ones
                      </Typography>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>

              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                ref={fileInputRef}
                style={{ display: 'none' }}
              />

              <Button
                variant="outlined"
                startIcon={<FileUploadIcon />}
                onClick={() => fileInputRef.current?.click()}
                fullWidth
              >
                Select CSV File
              </Button>

              {file && (
                <Card variant="outlined" sx={{ mt: 2, bgcolor: 'action.hover' }}>
                  <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {file.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(file.size / 1024).toFixed(2)} KB
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setFile(null)
                          setImportResult(null)
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }}
                      >
                        <CloseIcon />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              )}

              <Button
                variant="contained"
                startIcon={<UploadIcon />}
                onClick={handleImport}
                disabled={!file || importing}
                sx={{ mt: 2 }}
                fullWidth
              >
                {importing ? 'Importing...' : 'Import Materials'}
              </Button>

              {importing && <LinearProgress sx={{ mt: 2 }} />}
            </CardContent>
          </Card>

          {importResult && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Import Results</Typography>

                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Chip
                    icon={<CheckCircleIcon />}
                    label={`${importResult.successful} Successful`}
                    color="success"
                    variant="outlined"
                  />
                  {importResult.failed > 0 && (
                    <Chip
                      icon={<ErrorIcon />}
                      label={`${importResult.failed} Failed`}
                      color="error"
                      variant="outlined"
                    />
                  )}
                </Box>

                {importResult.errors.length > 0 && (
                  <>
                    <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 600 }}>
                      Errors:
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>Row</TableCell>
                            <TableCell>Code</TableCell>
                            <TableCell>Error</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {importResult.errors.map((error, index) => (
                            <TableRow key={index}>
                              <TableCell>{error.row}</TableCell>
                              <TableCell sx={{ fontWeight: 500 }}>{error.code}</TableCell>
                              <TableCell>
                                <Typography variant="body2" color="error">
                                  {error.error}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} fullWidth size="large">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}
