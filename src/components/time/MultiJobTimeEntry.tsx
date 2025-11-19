'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Box,
  Chip,
  Alert,
  Autocomplete,
  Stack,
  IconButton,
  Divider,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material'
import { DatePicker } from '@mui/x-date-pickers'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { format } from 'date-fns'
import RejectionNotesThread from './RejectionNotesThread'

interface Job {
  id: string
  jobNumber: string
  title: string
  customer: string
  type: string
  city?: string // Location
  address?: string
  estimatedHours?: number
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface CategoryHours {
  straightTime: string
  straightTimeTravel: string
  overtime: string
  overtimeTravel: string
  doubleTime: string
  doubleTimeTravel: string
}

interface MaterialOption {
  id: string
  code: string
  name: string
  description: string
  unit: string
  category: string
  inStock: number
}

interface Material {
  id: string // Temporary ID for UI tracking
  materialId: string | null // Selected material from database
  material: MaterialOption | null // Full material object
  quantity: string
  notes: string // Optional description/notes
  offTruck: boolean
  packingSlip: File | null
  packingSlipUrl: string | null // URL/filename from database when editing
}

interface JobEntry {
  id: string // Temporary ID for UI tracking
  jobId: string | null
  job: Job | null
  hours: string // Total hours (calculated from categories)
  categoryHours: CategoryHours
  location: string // NEW - Where work was performed
  jobDescription: string // NEW - Specific job/area
  workDescription: string // NEW - Detailed work description
  description: string // Keep for backward compatibility
  materials: Material[] // NEW - Materials used
}

interface MultiJobTimeEntryProps {
  onTimeEntriesCreated: () => void
  preselectedEmployee?: User | null
  preselectedJob?: any
}


export default function MultiJobTimeEntry({ onTimeEntriesCreated, preselectedEmployee, preselectedJob }: MultiJobTimeEntryProps) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [materials, setMaterials] = useState<MaterialOption[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(preselectedEmployee || null)
  const [date, setDate] = useState<Date>(preselectedJob?.date ? new Date(preselectedJob.date + 'T00:00:00') : new Date())
  const [entries, setEntries] = useState<JobEntry[]>([
    {
      id: preselectedJob?.editingEntryId || '1',
      jobId: preselectedJob?.jobId || null,
      job: preselectedJob ? {
        id: preselectedJob.jobId,
        jobNumber: preselectedJob.jobNumber,
        title: preselectedJob.jobTitle,
        customer: '',
        type: ''
      } : null,
      hours: preselectedJob?.hours?.toString() || '',
      categoryHours: {
        straightTime: preselectedJob?.hours?.toString() || '',
        straightTimeTravel: '',
        overtime: '',
        overtimeTravel: '',
        doubleTime: '',
        doubleTimeTravel: ''
      },
      location: preselectedJob?.location || '',
      jobDescription: preselectedJob?.jobDescription || '',
      workDescription: preselectedJob?.workDescription || '',
      description: preselectedJob?.description || '', // Keep for backward compat
      materials: [] // Initialize empty materials array
    }
  ])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [entryStatus, setEntryStatus] = useState<string | null>(null)
  const [hasRejectionNotes, setHasRejectionNotes] = useState(false)

  // Entry mode toggle: 'manual' = existing job, 'new' = create new job
  const [entryMode, setEntryMode] = useState<'manual' | 'new'>('manual')

  // New job creation dialog and state
  const [newJobDialogOpen, setNewJobDialogOpen] = useState(false)
  const [customers, setCustomers] = useState<Array<{id: string, firstName: string, lastName: string, companyName?: string}>>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<{id: string, firstName: string, lastName: string, companyName?: string} | null>(null)
  const [customerSearchInput, setCustomerSearchInput] = useState('')
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false)
  const customerSearchTimeout = useRef<NodeJS.Timeout | null>(null)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomerData, setNewCustomerData] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    phone: ''
  })
  const [newJobCategoryId, setNewJobCategoryId] = useState('')
  const [newJobType, setNewJobType] = useState('SERVICE_CALL')
  const [newJobDivision, setNewJobDivision] = useState('LINE_VOLTAGE')
  const [newJobDescription, setNewJobDescription] = useState('')
  const [newJobCustomerPO, setNewJobCustomerPO] = useState('')
  const [newJobAddress, setNewJobAddress] = useState('')
  const [newJobCity, setNewJobCity] = useState('')
  const [newJobState, setNewJobState] = useState('')
  const [newJobZip, setNewJobZip] = useState('')
  const [jobCategories, setJobCategories] = useState<Array<{id: string, categoryCode: string, categoryName: string, color: string, icon: string}>>([])
  const [creatingJob, setCreatingJob] = useState(false)

  useEffect(() => {
    // Get current user from localStorage
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      const user = JSON.parse(storedUser)
      setCurrentUser(user)
      setIsAdmin(user.role === 'OWNER_ADMIN')
      if (!preselectedEmployee) {
        setSelectedUser(user) // Default to current user if no preselection
      }
    }
  }, [preselectedEmployee])

  useEffect(() => {
    fetchData()
  }, [isAdmin])

  useEffect(() => {
    if (preselectedEmployee) {
      setSelectedUser(preselectedEmployee)
    }
  }, [preselectedEmployee])

  // Fetch customers and categories when dialog opens
  useEffect(() => {
    if (newJobDialogOpen) {
      fetchCustomers()
      fetchJobCategories()
    }
  }, [newJobDialogOpen])

  const fetchCustomers = async (searchQuery?: string) => {
    try {
      const token = localStorage.getItem('auth-token')
      // Build URL with optional search query
      const url = searchQuery && searchQuery.length >= 2
        ? `/api/customers?q=${encodeURIComponent(searchQuery)}`
        : '/api/customers'

      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        const customersList = data.customers || data || []
        setCustomers(Array.isArray(customersList) ? customersList : [])
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
      setCustomers([])
    } finally {
      setCustomerSearchLoading(false)
    }
  }

  // Debounced customer search handler
  const handleCustomerSearchInput = useCallback((searchValue: string) => {
    setCustomerSearchInput(searchValue)

    // Clear any existing timeout
    if (customerSearchTimeout.current) {
      clearTimeout(customerSearchTimeout.current)
    }

    // Only search if 2+ characters, otherwise show default (employee's created customers)
    if (searchValue.length >= 2) {
      setCustomerSearchLoading(true)
      customerSearchTimeout.current = setTimeout(() => {
        fetchCustomers(searchValue)
      }, 300) // 300ms debounce
    } else if (searchValue.length === 0) {
      // Reset to show employee's created customers when input is cleared
      fetchCustomers()
    }
  }, [])

  const fetchJobCategories = async () => {
    try {
      const response = await fetch('/api/job-categories?active=true')
      if (response.ok) {
        const data = await response.json()
        setJobCategories(data || [])
      }
    } catch (error) {
      console.error('Error fetching job categories:', error)
      setJobCategories([])
    }
  }


  useEffect(() => {
    if (preselectedJob && jobs.length > 0 && materials.length > 0) {
      // Find the full job object from the jobs list
      const fullJob = jobs.find(j => j.id === preselectedJob.jobId)
      if (fullJob) {
        // Use categoryHours from preselectedJob if available, otherwise default to empty
        const categoryHours = preselectedJob.categoryHours || {
          straightTime: '',
          straightTimeTravel: '',
          overtime: '',
          overtimeTravel: '',
          doubleTime: '',
          doubleTimeTravel: ''
        }

        // Transform materials from database format to UI format
        const transformedMaterials = (preselectedJob.materials || []).map((dbMaterial: any) => {
          // Find the full material object from the materials list
          let fullMaterial = materials.find(m => m.id === dbMaterial.materialId)

          // If not found in materials list but we have material details from DB, construct it
          if (!fullMaterial && dbMaterial.materialId) {
            fullMaterial = {
              id: dbMaterial.materialId,
              code: dbMaterial.materialCode || '',
              name: dbMaterial.materialName || '',
              description: '',
              unit: dbMaterial.materialUnit || '',
              category: dbMaterial.materialCategory || '',
              inStock: 0
            }
          }

          const transformedMaterial = {
            id: dbMaterial.id || `${Date.now()}-${Math.random()}`,
            materialId: dbMaterial.materialId,
            material: fullMaterial || null,
            quantity: dbMaterial.quantity?.toString() || '',
            notes: dbMaterial.notes || '',
            offTruck: dbMaterial.offTruck ?? false, // Use ?? to preserve boolean false
            packingSlip: null, // Don't load files on edit
            packingSlipUrl: dbMaterial.packingSlipUrl || null // Load filename from DB
          }

          console.log('[EDIT] Transforming material:', {
            dbMaterial,
            fullMaterial,
            materialId: dbMaterial.materialId,
            offTruckFromDB: dbMaterial.offTruck,
            offTruckTransformed: transformedMaterial.offTruck
          })

          return transformedMaterial
        })

        setEntries([{
          id: preselectedJob.editingEntryId || '1',
          jobId: fullJob.id,
          job: fullJob,
          hours: preselectedJob.hours?.toString() || '',
          categoryHours,
          location: preselectedJob.location || '',
          jobDescription: preselectedJob.jobDescription || '',
          workDescription: preselectedJob.workDescription || '',
          description: preselectedJob.description || '',
          materials: transformedMaterials
        }])
        setDate(preselectedJob.date ? new Date(preselectedJob.date + 'T00:00:00') : new Date())
      }

      // Fetch entry status if editing
      if (preselectedJob.editingEntryId) {
        fetchEntryStatus(preselectedJob.editingEntryId)
      }
    }
  }, [preselectedJob, jobs, materials])

  const fetchEntryStatus = async (entryId: string) => {
    try {
      const token = localStorage.getItem('auth-token')
      const response = await fetch(`/api/time-entries/${entryId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include'
      })

      if (response.ok) {
        const entry = await response.json()
        setEntryStatus(entry.status)
        setHasRejectionNotes(entry.hasRejectionNotes || false)
      }
    } catch (error) {
      console.error('Error fetching entry status:', error)
    }
  }

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('auth-token')
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {}

      const requests: Promise<Response>[] = [
        fetch('/api/jobs?status=estimate,scheduled,dispatched,in_progress,pending_approval', {
          headers: authHeaders,
          credentials: 'include'
        }),
        fetch('/api/materials?active=true', {
          headers: authHeaders,
          credentials: 'include'
        })
      ]

      // If admin, fetch all users
      if (isAdmin) {
        requests.push(
          fetch('/api/users', {
            headers: authHeaders,
            credentials: 'include'
          })
        )
      }

      const responses = await Promise.all(requests)
      const [jobsRes, materialsRes, usersRes] = responses

      if (jobsRes.ok) {
        const jobsData = await jobsRes.json()
        setJobs(jobsData)
      }

      if (materialsRes && materialsRes.ok) {
        const materialsData = await materialsRes.json()
        console.log('Fetched materials:', materialsData)
        setMaterials(materialsData)
      } else {
        console.error('Failed to fetch materials:', materialsRes?.status)
      }

      if (usersRes && usersRes.ok) {
        const usersData = await usersRes.json()
        const usersList = Array.isArray(usersData) ? usersData : (usersData.users || [])
        setUsers(usersList)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }


  const addEntry = () => {
    const newEntry: JobEntry = {
      id: Date.now().toString(),
      jobId: null,
      job: null,
      hours: '',
      categoryHours: {
        straightTime: '',
        straightTimeTravel: '',
        overtime: '',
        overtimeTravel: '',
        doubleTime: '',
        doubleTimeTravel: ''
      },
      location: '',
      jobDescription: '',
      workDescription: '',
      description: '',
      materials: []
    }
    setEntries([...entries, newEntry])
  }

  const removeEntry = (entryId: string) => {
    if (entries.length === 1) {
      setError('Must have at least one entry')
      return
    }
    setEntries(entries.filter(e => e.id !== entryId))
  }

  // Calculate total hours from category hours
  const calculateTotalFromCategories = (categoryHours: CategoryHours): number => {
    return (
      (parseFloat(categoryHours.straightTime) || 0) +
      (parseFloat(categoryHours.straightTimeTravel) || 0) +
      (parseFloat(categoryHours.overtime) || 0) +
      (parseFloat(categoryHours.overtimeTravel) || 0) +
      (parseFloat(categoryHours.doubleTime) || 0) +
      (parseFloat(categoryHours.doubleTimeTravel) || 0)
    )
  }

  // Update a specific category hour
  const updateCategoryHours = (entryId: string, category: keyof CategoryHours, value: string) => {
    setEntries(entries.map(entry => {
      if (entry.id === entryId) {
        // Initialize categoryHours if it doesn't exist
        const currentCategories = entry.categoryHours || {
          straightTime: '',
          straightTimeTravel: '',
          overtime: '',
          overtimeTravel: '',
          doubleTime: '',
          doubleTimeTravel: ''
        }
        const updatedCategories = { ...currentCategories, [category]: value }
        const totalHours = calculateTotalFromCategories(updatedCategories)
        return {
          ...entry,
          categoryHours: updatedCategories,
          hours: totalHours.toString()
        }
      }
      return entry
    }))
  }

  const updateEntry = (entryId: string, field: keyof JobEntry, value: any) => {
    setEntries(entries.map(entry => {
      if (entry.id === entryId) {
        if (field === 'job') {
          return { ...entry, job: value, jobId: value?.id || null }
        }
        return { ...entry, [field]: value }
      }
      return entry
    }))
  }

  // Material management functions
  const addMaterial = (entryId: string) => {
    setEntries(entries.map(entry => {
      if (entry.id === entryId) {
        const newMaterial: Material = {
          id: `${Date.now()}-${Math.random()}`,
          materialId: null,
          material: null,
          quantity: '',
          notes: '',
          offTruck: false,
          packingSlip: null,
          packingSlipUrl: null
        }
        return { ...entry, materials: [...entry.materials, newMaterial] }
      }
      return entry
    }))
  }

  const removeMaterial = (entryId: string, materialId: string) => {
    setEntries(entries.map(entry => {
      if (entry.id === entryId) {
        return { ...entry, materials: entry.materials.filter(m => m.id !== materialId) }
      }
      return entry
    }))
  }

  const updateMaterial = (entryId: string, materialId: string, field: keyof Material, value: any) => {
    setEntries(entries.map(entry => {
      if (entry.id === entryId) {
        return {
          ...entry,
          materials: entry.materials.map(material => {
            if (material.id === materialId) {
              // Special handling for material selection
              if (field === 'material') {
                return { ...material, material: value, materialId: value?.id || null }
              }
              return { ...material, [field]: value }
            }
            return material
          })
        }
      }
      return entry
    }))
  }

  const uploadPackingSlip = async (entryId: string, materialId: string, file: File) => {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/materials/upload-packing-slip', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload file')
      }

      const result = await response.json()

      // Update material with uploaded file info
      setEntries(entries.map(entry => {
        if (entry.id === entryId) {
          return {
            ...entry,
            materials: entry.materials.map(material => {
              if (material.id === materialId) {
                return {
                  ...material,
                  packingSlip: file,
                  packingSlipUrl: result.key // Store S3 key
                }
              }
              return material
            })
          }
        }
        return entry
      }))

      return result
    } catch (error: any) {
      console.error('Error uploading packing slip:', error)
      setError(error.message || 'Failed to upload packing slip')
      throw error
    }
  }

  const calculateTotalHours = () => {
    return entries.reduce((sum, entry) => {
      return sum + (parseFloat(entry.hours) || 0)
    }, 0)
  }

  const validateEntries = (): boolean => {
    if (!selectedUser) {
      setError('Please select an employee')
      return false
    }

    if (!date) {
      setError('Please select a date')
      return false
    }

    // Check if all entries have required fields
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      if (!entry.job) {
        setError(`Entry ${i + 1}: Please select a job`)
        return false
      }
      // Check that at least one category has hours
      const totalCategoryHours = calculateTotalFromCategories(entry.categoryHours)
      if (totalCategoryHours <= 0) {
        setError(`Entry ${i + 1}: Please enter hours in at least one category`)
        return false
      }
      // Validate work description field
      if (!entry.workDescription?.trim()) {
        setError(`Entry ${i + 1}: Work description is required`)
        return false
      }
    }

    // Check for duplicate jobs
    const jobIds = entries.map(e => e.jobId).filter(id => id)
    const uniqueJobIds = new Set(jobIds)
    if (jobIds.length !== uniqueJobIds.size) {
      setError('Cannot have duplicate jobs in the same submission')
      return false
    }

    // Check total hours (warning, not error)
    const total = calculateTotalHours()
    if (total > 24) {
      setError('Total hours cannot exceed 24 hours per day')
      return false
    }

    if (total > 12) {
      // Just a warning, still allow submission
      console.warn('Total hours exceed 12 - overtime rates will apply')
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateEntries()) {
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      setSuccess(null)

      // Check if we're editing an existing entry (single entry only)
      if (preselectedJob?.editingEntryId && entries.length === 1) {
        // Update existing entry
        const entry = entries[0]
        console.log('[UPDATE] Updating time entry with materials:', entry.materials)

        const response = await fetch(`/api/time-entries/${preselectedJob.editingEntryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            jobId: entry.jobId!,
            date: format(date, 'yyyy-MM-dd'),
            hours: parseFloat(entry.hours),
            location: entry.job?.city || entry.location || null, // Auto-populate from job
            jobDescription: entry.job?.title || entry.jobDescription || null, // Auto-populate from job
            workDescription: entry.workDescription,
            description: entry.description || `Work performed on ${entry.job!.jobNumber}`, // Keep for backward compat
            materials: entry.materials.map(material => ({
              materialId: material.materialId,
              quantity: material.quantity,
              notes: material.notes,
              offTruck: material.offTruck,
              packingSlipUrl: material.packingSlipUrl || null // Use S3 key from upload
            }))
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to update time entry')
        }

        setSuccess('Time entry updated successfully')
      } else {
        // Create new entries using bulk endpoint
        const timeEntries = entries.map(entry => ({
          userId: selectedUser!.id,
          jobId: entry.jobId!,
          date: format(date, 'yyyy-MM-dd'),
          hours: parseFloat(entry.hours),
          categoryHours: {
            STRAIGHT_TIME: parseFloat(entry.categoryHours.straightTime) || 0,
            STRAIGHT_TIME_TRAVEL: parseFloat(entry.categoryHours.straightTimeTravel) || 0,
            OVERTIME: parseFloat(entry.categoryHours.overtime) || 0,
            OVERTIME_TRAVEL: parseFloat(entry.categoryHours.overtimeTravel) || 0,
            DOUBLE_TIME: parseFloat(entry.categoryHours.doubleTime) || 0,
            DOUBLE_TIME_TRAVEL: parseFloat(entry.categoryHours.doubleTimeTravel) || 0,
          },
          location: entry.job?.city || entry.location || null, // Auto-populate from job
          jobDescription: entry.job?.title || entry.jobDescription || null, // Auto-populate from job
          workDescription: entry.workDescription,
          description: entry.description || `Work performed on ${entry.job!.jobNumber}`, // Keep for backward compat
          materials: entry.materials.map(material => ({
            materialId: material.materialId,
            quantity: material.quantity,
            notes: material.notes,
            offTruck: material.offTruck,
            packingSlip: material.packingSlip
          }))
        }))

        console.log('Submitting time entries with materials:', timeEntries)

        const response = await fetch('/api/time-entries/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            entries: timeEntries,
            userId: selectedUser!.id,
            date: format(date, 'yyyy-MM-dd'),
            currentUserId: currentUser?.id, // Pass the actual logged-in user
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create time entries')
        }

        const result = await response.json()
        setSuccess(`Successfully created ${result.created} time entries totaling ${calculateTotalHours().toFixed(2)} hours`)
      }

      // Reset form to initial state
      setEntries([{
        id: '1',
        jobId: null,
        job: null,
        hours: '',
        categoryHours: {
          straightTime: '',
          straightTimeTravel: '',
          overtime: '',
          overtimeTravel: '',
          doubleTime: '',
          doubleTimeTravel: ''
        },
        location: '',
        jobDescription: '',
        workDescription: '',
        description: '',
        materials: []
      }])
      setDate(new Date())
      if (!preselectedEmployee && !isAdmin) {
        setSelectedUser(currentUser)
      }

      // Call the callback
      onTimeEntriesCreated()

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000)

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create time entries')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Card data-testid="time-entry-form">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📋 Time Entry
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Enter time for one or more jobs. Add multiple jobs with the "Add Another Job" button.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          {/* Employee and Date Selection */}
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {/* Employee Selection (Admin Only) */}
              {isAdmin && users.length > 0 && (
                <Box sx={{ flex: 1, minWidth: 250 }}>
                  <Autocomplete
                    options={users}
                    getOptionLabel={(option) => `${option.name} (${option.email})`}
                    value={selectedUser}
                    onChange={(_, value) => setSelectedUser(value)}
                    disabled={!!preselectedEmployee}
                    renderOption={(props, option) => {
                      const { key, ...otherProps } = props as any
                      return (
                        <li key={key} {...otherProps}>
                          <Box>
                            <Typography variant="body2">
                              {option.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {option.email} • {option.role}
                            </Typography>
                          </Box>
                        </li>
                      )
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Employee"
                        required
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                        }}
                      />
                    )}
                  />
                </Box>
              )}

              {/* Date Selection */}
              <Box sx={{ flex: 1, minWidth: 250 }}>
                <DatePicker
                  label="Date"
                  value={date}
                  onChange={(newValue) => setDate(newValue || new Date())}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                      InputProps: {
                        startAdornment: <CalendarIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                      }
                    }
                  }}
                />
              </Box>
            </Box>
          </Paper>

          {/* Entry Mode Toggle - Only show for employees */}
          {currentUser?.role === 'EMPLOYEE' && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Entry Method
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  variant={entryMode === 'manual' ? 'contained' : 'outlined'}
                  startIcon={<WorkIcon />}
                  onClick={() => setEntryMode('manual')}
                  size="small"
                >
                  Existing Job
                </Button>
                <Button
                  variant={entryMode === 'new' ? 'contained' : 'outlined'}
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setEntryMode('new')
                    setNewJobDialogOpen(true)
                  }}
                  size="small"
                >
                  Create New Job
                </Button>
              </Stack>
            </Box>
          )}

          {/* Job Entries */}
          <Stack spacing={2}>
            {entries.map((entry, index) => (
              <Paper key={entry.id} sx={{ p: 2 }} variant="outlined">
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <Chip
                    label={`Entry ${index + 1}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  {entries.length > 1 && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => removeEntry(entry.id)}
                      sx={{ ml: 'auto' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {/* LEFT COLUMN: Job Selection & Details */}
                  <Box sx={{ flex: 2, minWidth: 250, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Job Selection */}
                    <Autocomplete
                      data-testid="job-select"
                      options={jobs}
                      getOptionLabel={(option) => `${option.jobNumber} - ${option.title}`}
                      value={entry.job}
                      onChange={(_, value) => updateEntry(entry.id, 'job', value)}
                      renderOption={(props, option) => {
                        const { key, ...otherProps} = props as any
                        return (
                          <li key={key} {...otherProps}>
                            <Box>
                              <Typography variant="body2">
                                {option.jobNumber} - {option.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {option.customer} • {option.type}
                              </Typography>
                            </Box>
                          </li>
                        )
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Job"
                          required
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: <WorkIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                          }}
                        />
                      )}
                    />

                    {/* Job Details - Show when job selected */}
                    {entry.job && (
                      <Box sx={{ pl: 1 }}>
                        <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary' }}>
                          📍 {entry.job.city || 'Location not specified'}
                          {entry.job.address && ` - ${entry.job.address}`}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary' }}>
                          👤 {entry.job.customer}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          🏗️ {entry.job.title}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* RIGHT COLUMN: Hour Categories */}
                  <Box sx={{ flex: 3, minWidth: 300 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Hour Categories *
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 1 }}>
                      {/* Straight Time */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Chip label="ST" size="small" color="success" sx={{ minWidth: 40 }} />
                        <TextField
                          data-testid="hours-input"
                          size="small"
                          type="number"
                          value={entry.categoryHours?.straightTime || ''}
                          onChange={(e) => updateCategoryHours(entry.id, 'straightTime', e.target.value)}
                          placeholder="0"
                          inputProps={{ min: 0, step: 0.5, style: { textAlign: 'center' } }}
                          sx={{ width: 60 }}
                        />
                        <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>hrs</Typography>
                      </Box>

                      {/* Straight Time Travel */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Chip label="STT" size="small" color="success" variant="outlined" sx={{ minWidth: 40 }} />
                        <TextField
                          size="small"
                          type="number"
                          value={entry.categoryHours?.straightTimeTravel || ''}
                          onChange={(e) => updateCategoryHours(entry.id, 'straightTimeTravel', e.target.value)}
                          placeholder="0"
                          inputProps={{ min: 0, step: 0.5, style: { textAlign: 'center' } }}
                          sx={{ width: 60 }}
                        />
                        <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>hrs</Typography>
                      </Box>

                      {/* Overtime */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Chip label="OT" size="small" color="warning" sx={{ minWidth: 40 }} />
                        <TextField
                          size="small"
                          type="number"
                          value={entry.categoryHours?.overtime || ''}
                          onChange={(e) => updateCategoryHours(entry.id, 'overtime', e.target.value)}
                          placeholder="0"
                          inputProps={{ min: 0, step: 0.5, style: { textAlign: 'center' } }}
                          sx={{ width: 60 }}
                        />
                        <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>hrs</Typography>
                      </Box>

                      {/* Overtime Travel */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Chip label="OTT" size="small" color="warning" variant="outlined" sx={{ minWidth: 40 }} />
                        <TextField
                          size="small"
                          type="number"
                          value={entry.categoryHours?.overtimeTravel || ''}
                          onChange={(e) => updateCategoryHours(entry.id, 'overtimeTravel', e.target.value)}
                          placeholder="0"
                          inputProps={{ min: 0, step: 0.5, style: { textAlign: 'center' } }}
                          sx={{ width: 60 }}
                        />
                        <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>hrs</Typography>
                      </Box>

                      {/* Double Time */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Chip label="DT" size="small" color="error" sx={{ minWidth: 40 }} />
                        <TextField
                          size="small"
                          type="number"
                          value={entry.categoryHours?.doubleTime || ''}
                          onChange={(e) => updateCategoryHours(entry.id, 'doubleTime', e.target.value)}
                          placeholder="0"
                          inputProps={{ min: 0, step: 0.5, style: { textAlign: 'center' } }}
                          sx={{ width: 60 }}
                        />
                        <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>hrs</Typography>
                      </Box>

                      {/* Double Time Travel */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Chip label="DTT" size="small" color="error" variant="outlined" sx={{ minWidth: 40 }} />
                        <TextField
                          size="small"
                          type="number"
                          value={entry.categoryHours?.doubleTimeTravel || ''}
                          onChange={(e) => updateCategoryHours(entry.id, 'doubleTimeTravel', e.target.value)}
                          placeholder="0"
                          inputProps={{ min: 0, step: 0.5, style: { textAlign: 'center' } }}
                          sx={{ width: 60 }}
                        />
                        <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>hrs</Typography>
                      </Box>
                    </Box>
                    <Typography variant="body2" sx={{ mt: 1, fontWeight: 600 }}>
                      Total: {entry.hours || '0'} hours
                    </Typography>
                  </Box>
                </Box>

                {/* FULL WIDTH: Work Description */}
                <Box sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    required
                    multiline
                    rows={3}
                    label="Work Description"
                    value={entry.workDescription}
                    onChange={(e) => updateEntry(entry.id, 'workDescription', e.target.value)}
                    placeholder="Describe the work you performed in detail..."
                    error={!entry.workDescription}
                    helperText={!entry.workDescription ? "Work description is required" : ""}
                  />
                </Box>

                {/* MATERIALS SECTION */}
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                    Materials Used
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Add any materials used for this job (optional)
                  </Typography>

                  {entry.materials.map((material) => (
                    <Paper key={material.id} sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        {/* Material Selection */}
                        <Autocomplete
                          data-testid="material-select"
                          options={materials}
                          value={material.material}
                          onChange={(_, newValue) => updateMaterial(entry.id, material.id, 'material', newValue)}
                          getOptionLabel={(option) => `${option.code} - ${option.name}`}
                          renderOption={(props, option) => {
                            const { key, ...otherProps } = props as any
                            return (
                              <Box component="li" key={key} {...otherProps}>
                                <Box>
                                  <Typography variant="body2">{option.code} - {option.name}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {option.category} | {option.unit} | In Stock: {option.inStock}
                                  </Typography>
                                </Box>
                              </Box>
                            )
                          }}
                          sx={{ flex: 1, minWidth: 250 }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Material"
                              placeholder="Select material..."
                            />
                          )}
                        />

                        {/* Quantity */}
                        <TextField
                          data-testid="material-quantity"
                          label="Quantity"
                          type="number"
                          value={material.quantity}
                          onChange={(e) => updateMaterial(entry.id, material.id, 'quantity', e.target.value)}
                          sx={{ width: 120 }}
                          inputProps={{ min: 0, step: 0.01 }}
                        />

                        {/* Off Truck Checkbox */}
                        <Box sx={{ display: 'flex', alignItems: 'center', pt: 1 }}>
                          <input
                            type="checkbox"
                            checked={material.offTruck}
                            onChange={(e) => updateMaterial(entry.id, material.id, 'offTruck', e.target.checked)}
                            id={`offTruck-${material.id}`}
                            style={{ marginRight: 8 }}
                          />
                          <label htmlFor={`offTruck-${material.id}`} style={{ cursor: 'pointer' }}>
                            Off Truck
                          </label>
                        </Box>

                        {/* Remove Material Button */}
                        <Button
                          color="error"
                          onClick={() => removeMaterial(entry.id, material.id)}
                          sx={{ mt: 1 }}
                        >
                          Remove
                        </Button>
                      </Box>

                      {/* Notes (Optional) */}
                      <Box sx={{ mt: 2 }}>
                        <TextField
                          fullWidth
                          label="Notes (Optional)"
                          value={material.notes}
                          onChange={(e) => updateMaterial(entry.id, material.id, 'notes', e.target.value)}
                          placeholder="Add any additional notes about this material..."
                          multiline
                          rows={2}
                        />
                      </Box>

                      {/* Packing Slip Upload */}
                      <Box sx={{ mt: 2 }}>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              try {
                                await uploadPackingSlip(entry.id, material.id, file)
                                setSuccess('Packing slip uploaded successfully')
                                setTimeout(() => setSuccess(null), 3000)
                              } catch (error) {
                                // Error is already set in uploadPackingSlip
                              }
                            }
                          }}
                          id={`packingSlip-${material.id}`}
                          style={{ display: 'none' }}
                        />
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => document.getElementById(`packingSlip-${material.id}`)?.click()}
                          >
                            {(material.packingSlip || material.packingSlipUrl) ? 'Change Packing Slip' : 'Upload Packing Slip'}
                          </Button>
                          {(material.packingSlip || material.packingSlipUrl) && (
                            <Typography
                              variant="body2"
                              color="primary"
                              sx={{ cursor: 'pointer', textDecoration: 'underline' }}
                              onClick={async () => {
                                if (material.packingSlipUrl) {
                                  try {
                                    const response = await fetch(`/api/materials/view-packing-slip?key=${encodeURIComponent(material.packingSlipUrl)}`)
                                    const data = await response.json()
                                    if (data.url) {
                                      window.open(data.url, '_blank')
                                    }
                                  } catch (error) {
                                    console.error('Error opening file:', error)
                                    setError('Failed to open file')
                                  }
                                }
                              }}
                            >
                              📎 {material.packingSlip ? material.packingSlip.name : material.packingSlipUrl?.split('/').pop()}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Paper>
                  ))}

                  {/* Add Material Button */}
                  <Button
                    data-testid="add-material-btn"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => addMaterial(entry.id)}
                    sx={{ mt: 1 }}
                  >
                    Add Material
                  </Button>
                </Box>
              </Paper>
            ))}

            {/* Add Entry Button - only show if not editing */}
            {!preselectedJob?.editingEntryId && (
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addEntry}
                sx={{ alignSelf: 'flex-start' }}
              >
                Add Another Job
              </Button>
            )}
          </Stack>

          {/* Rejection Notes Thread - show if entry has rejection notes or is rejected */}
          {preselectedJob?.editingEntryId && (entryStatus === 'rejected' || hasRejectionNotes) && (
            <>
              <Divider sx={{ my: 3 }} />
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  💬 Rejection Discussion
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
                  This time entry was rejected. Review the conversation below and respond if needed.
                </Typography>
                <RejectionNotesThread
                  timeEntryId={preselectedJob.editingEntryId}
                  onNewNote={() => {
                    // Refresh entry status after adding a note
                    fetchEntryStatus(preselectedJob.editingEntryId)
                  }}
                />
              </Box>
            </>
          )}

          <Divider sx={{ my: 3 }} />

          {/* Summary and Submit */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="body1">
                Total Hours:
              </Typography>
              <Chip
                label={`${calculateTotalHours().toFixed(2)}h`}
                color={calculateTotalHours() > 12 ? 'warning' : 'success'}
                sx={{ fontWeight: 'bold' }}
              />
              {calculateTotalHours() > 12 && (
                <Typography variant="caption" color="warning.main">
                  Overtime rates will apply
                </Typography>
              )}
            </Stack>

            <Button
              data-testid="submit-time-entry"
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSubmit}
              disabled={submitting || entries.length === 0}
              size="large"
              sx={{
                backgroundColor: '#00bf9a',
                '&:hover': {
                  backgroundColor: '#00a884',
                },
              }}
            >
              {submitting ? 'Creating Entries...' : `Create ${entries.length} Time Entries`}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Employee Create New Job Dialog */}
      <Dialog
        open={newJobDialogOpen}
        onClose={() => {
          setNewJobDialogOpen(false)
          setSelectedCustomerId('')
          setSelectedCustomer(null)
          setCustomerSearchInput('')
          setShowNewCustomer(false)
          setNewCustomerData({ firstName: '', lastName: '', companyName: '', email: '', phone: '' })
          setNewJobCategoryId('')
          setNewJobType('SERVICE_CALL')
          setNewJobDivision('LINE_VOLTAGE')
          setNewJobDescription('')
          setNewJobCustomerPO('')
          setNewJobAddress('')
          setNewJobCity('')
          setNewJobState('')
          setNewJobZip('')
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Job</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3, mt: 2 }}>
            Create job details below. After saving, you can continue entering hours, materials, and photos.
          </Alert>

          <Grid container spacing={3}>
            {/* Customer Selection - Search-based Autocomplete */}
            <Grid size={{ xs: 12 }}>
              <Autocomplete
                options={customers}
                value={selectedCustomer}
                inputValue={customerSearchInput}
                onInputChange={(_, newValue, reason) => {
                  // Always update input value, but only search on typing
                  if (reason === 'input') {
                    handleCustomerSearchInput(newValue)
                  } else if (reason === 'reset' || reason === 'clear') {
                    // When selecting or clearing, just update the input without searching
                    setCustomerSearchInput(newValue)
                  }
                }}
                onChange={(_, newValue) => {
                  if (newValue) {
                    setSelectedCustomer(newValue)
                    setSelectedCustomerId(newValue.id)
                    // Update input to show selected customer's name
                    setCustomerSearchInput(newValue.companyName || `${newValue.firstName} ${newValue.lastName}`)
                    setShowNewCustomer(false)
                  } else {
                    setSelectedCustomer(null)
                    setSelectedCustomerId('')
                    setCustomerSearchInput('')
                  }
                }}
                getOptionLabel={(option) => option.companyName || `${option.firstName} ${option.lastName}`}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                loading={customerSearchLoading}
                filterOptions={(x) => x} // Disable client-side filtering since API handles it
                noOptionsText={
                  customerSearchInput.length < 2
                    ? "Type 2+ characters to search customers..."
                    : customerSearchLoading
                    ? "Searching..."
                    : "No customers found"
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Customer *"
                    placeholder="Type to search customers..."
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {customerSearchLoading && <CircularProgress color="inherit" size={20} />}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props as any
                  return (
                    <li key={option.id} {...otherProps}>
                      <Typography>
                        {option.companyName || `${option.firstName} ${option.lastName}`}
                      </Typography>
                    </li>
                  )
                }}
              />
              {/* Add New Customer button */}
              <Button
                startIcon={<AddIcon />}
                onClick={() => setShowNewCustomer(true)}
                sx={{ mt: 1 }}
                size="small"
                variant="text"
              >
                Add New Customer
              </Button>
            </Grid>

            {/* New Customer Form */}
            {showNewCustomer && (
              <>
                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 1 }}>
                    <Typography variant="subtitle2" color="primary">New Customer</Typography>
                  </Divider>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="First Name *"
                    value={newCustomerData.firstName}
                    onChange={(e) => setNewCustomerData({...newCustomerData, firstName: e.target.value})}
                    fullWidth
                    required
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Last Name *"
                    value={newCustomerData.lastName}
                    onChange={(e) => setNewCustomerData({...newCustomerData, lastName: e.target.value})}
                    fullWidth
                    required
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Company Name"
                    value={newCustomerData.companyName}
                    onChange={(e) => setNewCustomerData({...newCustomerData, companyName: e.target.value})}
                    fullWidth
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Email"
                    type="email"
                    value={newCustomerData.email}
                    onChange={(e) => setNewCustomerData({...newCustomerData, email: e.target.value})}
                    fullWidth
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Phone"
                    value={newCustomerData.phone}
                    onChange={(e) => setNewCustomerData({...newCustomerData, phone: e.target.value})}
                    fullWidth
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 1 }} />
                </Grid>
              </>
            )}

            {/* Job Category */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Job Category</InputLabel>
                <Select
                  value={newJobCategoryId}
                  label="Job Category"
                  onChange={(e) => setNewJobCategoryId(e.target.value)}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {jobCategories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: 1,
                            bgcolor: category.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1rem',
                          }}
                        >
                          {category.icon}
                        </Box>
                        <Typography>{category.categoryName}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Job Type */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Job Type *</InputLabel>
                <Select
                  value={newJobType}
                  label="Job Type *"
                  onChange={(e) => setNewJobType(e.target.value)}
                >
                  <MenuItem value="SERVICE_CALL">Service Call</MenuItem>
                  <MenuItem value="INSTALLATION">Installation</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Division */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Division *</InputLabel>
                <Select
                  value={newJobDivision}
                  label="Division *"
                  onChange={(e) => setNewJobDivision(e.target.value)}
                >
                  <MenuItem value="LINE_VOLTAGE">Line Voltage (120V/240V)</MenuItem>
                  <MenuItem value="LOW_VOLTAGE">Low Voltage (Security/Data)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Customer PO */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                value={newJobCustomerPO}
                onChange={(e) => setNewJobCustomerPO(e.target.value)}
                label="Customer PO Number"
                fullWidth
              />
            </Grid>

            {/* Description */}
            <Grid size={{ xs: 12 }}>
              <TextField
                value={newJobDescription}
                onChange={(e) => setNewJobDescription(e.target.value)}
                label="Job Description *"
                multiline
                rows={3}
                fullWidth
                required
              />
            </Grid>

            {/* Address Fields */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" gutterBottom>
                Job Address
              </Typography>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                value={newJobAddress}
                onChange={(e) => setNewJobAddress(e.target.value)}
                label="Street Address"
                fullWidth
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                value={newJobCity}
                onChange={(e) => setNewJobCity(e.target.value)}
                label="City"
                fullWidth
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                value={newJobState}
                onChange={(e) => setNewJobState(e.target.value)}
                label="State"
                fullWidth
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                value={newJobZip}
                onChange={(e) => setNewJobZip(e.target.value)}
                label="ZIP Code"
                fullWidth
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setNewJobDialogOpen(false)
            setSelectedCustomerId('')
            setShowNewCustomer(false)
            setNewCustomerData({ firstName: '', lastName: '', companyName: '', email: '', phone: '' })
          }}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              // Validate
              if (showNewCustomer && (!newCustomerData.firstName || !newCustomerData.lastName)) {
                setError('Please enter customer first and last name')
                return
              }
              if (!showNewCustomer && !selectedCustomerId) {
                setError('Please select a customer')
                return
              }
              if (!newJobDescription) {
                setError('Please enter job description')
                return
              }

              setCreatingJob(true)
              try {
                let customerId = selectedCustomerId

                // Create customer if needed
                if (showNewCustomer) {
                  const customerResponse = await fetch('/api/customers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                      ...newCustomerData,
                      createdByEmployee: true,
                    }),
                  })

                  if (!customerResponse.ok) {
                    throw new Error('Failed to create customer')
                  }

                  const newCustomer = await customerResponse.json()
                  customerId = newCustomer.id
                }

                // Create job with PENDING_APPROVAL status
                const jobResponse = await fetch('/api/jobs', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({
                    customerId,
                    categoryId: newJobCategoryId || undefined,
                    type: newJobType,
                    division: newJobDivision,
                    description: newJobDescription,
                    customerPO: newJobCustomerPO || undefined,
                    address: newJobAddress || undefined,
                    city: newJobCity || undefined,
                    state: newJobState || undefined,
                    zip: newJobZip || undefined,
                    status: 'PENDING_APPROVAL',
                    scheduledDate: new Date().toISOString(),
                  }),
                })

                if (!jobResponse.ok) {
                  throw new Error('Failed to create job')
                }

                const newJob = await jobResponse.json()

                // Refresh jobs list
                await fetchData()

                // Auto-select the new job
                const fullJob = {
                  id: newJob.id,
                  jobNumber: newJob.jobNumber,
                  title: newJob.description || 'New Job',
                  customer: showNewCustomer ? (newCustomerData.companyName || `${newCustomerData.firstName} ${newCustomerData.lastName}`) : '',
                  type: newJob.type,
                  city: newJob.city,
                  address: newJob.address
                }

                updateEntry(entries[0].id, 'job', fullJob)

                setSuccess(`Job ${newJob.jobNumber} created! Now enter hours, materials, and photos.`)
                setNewJobDialogOpen(false)

                // Reset form
                setSelectedCustomerId('')
                setShowNewCustomer(false)
                setNewCustomerData({ firstName: '', lastName: '', companyName: '', email: '', phone: '' })
                setNewJobCategoryId('')
                setNewJobDescription('')
                setNewJobCustomerPO('')
                setNewJobAddress('')
                setNewJobCity('')
                setNewJobState('')
                setNewJobZip('')

              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to create job')
              } finally {
                setCreatingJob(false)
              }
            }}
            variant="contained"
            disabled={creatingJob}
          >
            {creatingJob ? 'Creating...' : 'Create Job'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  )
}