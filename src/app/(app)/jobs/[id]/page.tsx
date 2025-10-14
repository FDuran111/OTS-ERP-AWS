'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { permissions } from '@/lib/permissions'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Tab,
  Tabs,
  Paper,
  IconButton,
  Button,
  Divider,
  Stack,
} from '@mui/material'
import ResponsiveLayout from '@/components/layout/ResponsiveLayout'
import ResponsiveContainer from '@/components/layout/ResponsiveContainer'
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Inventory as InventoryIcon,
  Assessment as AssessmentIcon,
  AttachMoney as MoneyIcon,
  PhotoLibrary as PhotoIcon,
} from '@mui/icons-material'
import JobMaterialReservations from '@/components/jobs/JobMaterialReservations'
import MaterialUsageTracker from '@/components/jobs/MaterialUsageTracker'
import JobLaborRateOverrides from '@/components/jobs/JobLaborRateOverrides'
import PhotoUploader from '@/components/files/PhotoUploader'
import EditJobDialog from '@/components/jobs/EditJobDialog'

interface Job {
  id: string
  jobNumber: string
  title: string
  customer: string
  customerId: string
  customerName: string
  type: 'SERVICE_CALL' | 'INSTALLATION'
  status: string
  priority: string
  description?: string
  customerPO?: string
  dueDate: string | null
  completedDate: string | null
  crew: string[]
  estimatedHours?: number
  actualHours?: number
  estimatedCost?: number
  actualCost?: number
  billedAmount?: number
  address?: string
  city?: string
  state?: string
  zip?: string
  createdAt: string
  updatedAt: string
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`job-tabpanel-${index}`}
      aria-labelledby={`job-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

export default function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null)
  const router = useRouter()
  const { user } = useAuth()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(0)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  useEffect(() => {
    params.then(setResolvedParams)
  }, [params])

  useEffect(() => {
    if (resolvedParams?.id) {
      fetchJob()
    }
  }, [resolvedParams])

  const fetchJob = async () => {
    if (!resolvedParams?.id) return

    try {
      setLoading(true)
      const response = await fetch(`/api/jobs/${resolvedParams.id}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Job not found')
        } else {
          throw new Error('Failed to fetch job')
        }
        return
      }
      
      const data = await response.json()
      setJob(data)
    } catch (error) {
      console.error('Error fetching job:', error)
      setError('Failed to load job details')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status.toLowerCase()) {
      case 'in_progress':
        return 'success'
      case 'scheduled':
      case 'dispatched':
        return 'warning'
      case 'completed':
      case 'billed':
        return 'info'
      case 'cancelled':
        return 'error'
      default:
        return 'default'
    }
  }

  const getPriorityColor = (priority: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (priority) {
      case 'High':
        return 'error'
      case 'Medium':
        return 'warning'
      case 'Low':
        return 'info'
      default:
        return 'default'
    }
  }

  if (loading) {
    return (
      <ResponsiveLayout>
        <ResponsiveContainer>
          <Typography align="center">Loading job details...</Typography>
        </ResponsiveContainer>
      </ResponsiveLayout>
    )
  }

  if (error || !job) {
    return (
      <ResponsiveLayout>
        <ResponsiveContainer>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="error" gutterBottom>
              {error || 'Job not found'}
            </Typography>
            <Button onClick={() => router.push('/jobs')} startIcon={<ArrowBackIcon />}>
              Back to Jobs
            </Button>
          </Box>
        </ResponsiveContainer>
      </ResponsiveLayout>
    )
  }

  return (
    <ResponsiveLayout>
      <ResponsiveContainer
        title={`${job.jobNumber} - ${job.customerName || job.customer}`}
        subtitle=""
        actions={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/jobs')}
              variant="outlined"
            >
              Back to Jobs
            </Button>
            {user?.role === 'OWNER_ADMIN' && (
              <Button
                startIcon={<EditIcon />}
                onClick={() => setEditDialogOpen(true)}
                variant="contained"
              >
                Edit Job
              </Button>
            )}
          </Box>
        }
      >
        {/* Job Summary Card */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            {/* Description and Basic Info */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" color="text.secondary" paragraph>
                {job.description || 'No description provided'}
              </Typography>

              {job.customerPO && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  📋 <strong>Customer PO:</strong> {job.customerPO}
                </Typography>
              )}

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                <Chip
                  label={job.status.replace('_', ' ')}
                  color={getStatusColor(job.status)}
                />
                <Chip
                  label={job.priority}
                  color={getPriorityColor(job.priority)}
                  variant="outlined"
                />
                <Chip
                  label={job.type === 'SERVICE_CALL' ? 'Service Call' : 'Installation'}
                  variant="outlined"
                />
              </Box>

              {job.address && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  📍 {job.address}
                  {job.city && `, ${job.city}`}
                  {job.state && `, ${job.state}`}
                  {job.zip && ` ${job.zip}`}
                </Typography>
              )}

              {job.crew && job.crew.length > 0 && (
                <Typography variant="body2" color="text.secondary">
                  👥 Crew: {job.crew.join(', ')}
                </Typography>
              )}
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Metrics Grid */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
              {/* Financial Section - Admin & Foreman */}
              {user && permissions.canViewJobCosts(user.role) && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                    💰 FINANCIALS
                  </Typography>
                  <Stack spacing={1.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Estimated:</Typography>
                      <Typography variant="body2" fontWeight={500}>
                        ${job.estimatedCost?.toLocaleString() || '0'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Actual:</Typography>
                      <Typography variant="body2" fontWeight={500}>
                        ${job.actualCost?.toLocaleString() || '0'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Variance:</Typography>
                      <Typography
                        variant="body2"
                        fontWeight={500}
                        color={(job.actualCost || 0) > (job.estimatedCost || 0) ? 'error.main' : 'success.main'}
                      >
                        ${((job.estimatedCost || 0) - (job.actualCost || 0)).toLocaleString()}
                      </Typography>
                    </Box>
                    <Divider />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Billed:</Typography>
                      <Typography variant="body2" fontWeight={500}>
                        ${job.billedAmount?.toLocaleString() || '0'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Margin:</Typography>
                      <Typography
                        variant="body2"
                        fontWeight={500}
                        color={((job.billedAmount || 0) - (job.actualCost || 0)) > 0 ? 'success.main' : 'error.main'}
                      >
                        {job.billedAmount && job.actualCost
                          ? `${Math.round(((job.billedAmount - job.actualCost) / job.billedAmount) * 100)}%`
                          : 'N/A'}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              )}

              {/* Labor Section */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                  ⏱️ LABOR
                </Typography>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Estimated:</Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {job.estimatedHours || 0} hrs
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Actual:</Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {job.actualHours || 0} hrs
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Remaining:</Typography>
                    <Typography
                      variant="body2"
                      fontWeight={500}
                      color={(job.actualHours || 0) > (job.estimatedHours || 0) ? 'error.main' : 'text.primary'}
                    >
                      {Math.max(0, (job.estimatedHours || 0) - (job.actualHours || 0))} hrs
                    </Typography>
                  </Box>
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Efficiency:</Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {job.estimatedHours && job.actualHours
                        ? `${Math.round((job.actualHours / job.estimatedHours) * 100)}%`
                        : 'N/A'}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              {/* Schedule Section */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                  📊 SCHEDULE
                </Typography>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Start:</Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'N/A'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Due:</Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {job.dueDate ? new Date(job.dueDate).toLocaleDateString() : 'N/A'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Days Left:</Typography>
                    <Typography
                      variant="body2"
                      fontWeight={500}
                      color={job.dueDate && new Date(job.dueDate) < new Date() ? 'error.main' : 'text.primary'}
                    >
                      {job.dueDate
                        ? Math.ceil((new Date(job.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                        : 'N/A'} days
                    </Typography>
                  </Box>
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Status:</Typography>
                    <Chip
                      label={
                        job.status === 'COMPLETED' ? '🟢 Complete' :
                        job.dueDate && new Date(job.dueDate) < new Date() ? '🔴 Overdue' :
                        job.actualHours && job.estimatedHours && job.actualHours > job.estimatedHours * 0.8 ? '🟡 At Risk' :
                        '🟢 On Track'
                      }
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                </Stack>
              </Box>
            </Box>

            {/* Customer PO if exists */}
            {job.customerPO && (
              <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary">
                  Customer PO: <strong>{job.customerPO}</strong>
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                minWidth: 0,
                padding: { xs: '6px 8px', sm: '6px 16px' },
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                '& .MuiTab-iconWrapper': {
                  marginRight: { xs: '4px', sm: '8px' },
                },
                '& .MuiSvgIcon-root': {
                  fontSize: { xs: '1rem', sm: '1.25rem' },
                }
              }
            }}
          >
            <Tab
              icon={<InventoryIcon />}
              label="Material Reservations"
              iconPosition="start"
            />
            <Tab
              icon={<AssessmentIcon />}
              label="Material Usage"
              iconPosition="start"
            />
            {user && permissions.canViewLaborRates(user.role) && (
              <Tab
                icon={<MoneyIcon />}
                label="Billing"
                iconPosition="start"
              />
            )}
            <Tab
              icon={<PhotoIcon />}
              label="Photos & Files"
              iconPosition="start"
            />
          </Tabs>
        </Paper>

        {/* Tab Panels */}
        <TabPanel value={activeTab} index={0}>
          <JobMaterialReservations
            jobId={job.id}
            jobTitle={job.title}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <MaterialUsageTracker
            jobId={job.id}
          />
        </TabPanel>

        {user && permissions.canViewLaborRates(user.role) && (
          <TabPanel value={activeTab} index={2}>
            <JobLaborRateOverrides jobId={job.id} />
          </TabPanel>
        )}

        <TabPanel value={activeTab} index={user && permissions.canViewLaborRates(user.role) ? 3 : 2}>
          <PhotoUploader
            jobId={job.id}
            onUploadComplete={() => {
              // Optionally refresh the page or show a success message
              console.log('Files uploaded successfully')
            }}
          />
        </TabPanel>

        {/* Edit Job Dialog */}
        <EditJobDialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          onJobUpdated={() => {
            setEditDialogOpen(false)
            fetchJob() // Refresh job data after update
          }}
          job={job}
        />
      </ResponsiveContainer>
    </ResponsiveLayout>
  )
}