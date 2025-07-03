'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
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
} from '@mui/material'
import ResponsiveLayout from '@/components/layout/ResponsiveLayout'
import ResponsiveContainer from '@/components/layout/ResponsiveContainer'
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Work as WorkIcon,
  Schedule as ScheduleIcon,
  Inventory as InventoryIcon,
  Assessment as AssessmentIcon,
  AttachMoney as MoneyIcon,
  PhotoLibrary as PhotoIcon,
} from '@mui/icons-material'
import JobMaterialReservations from '@/components/jobs/JobMaterialReservations'
import JobPhasesManager from '@/components/jobs/JobPhasesManager'
import MaterialUsageTracker from '@/components/jobs/MaterialUsageTracker'
import RealTimeJobCosts from '@/components/job-costing/RealTimeJobCosts'
import JobLaborRateOverrides from '@/components/jobs/JobLaborRateOverrides'
import FileAttachmentManager from '@/components/FileAttachmentManager'
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
        title={`${job.jobNumber} - ${job.title}`}
        subtitle={job.customerName || job.customer}
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
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flex: '1 1 calc(66.67% - 12px)', minWidth: '400px' }}>
                <Typography variant="h5" gutterBottom>
                  {job.title}
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  {job.description || 'No description provided'}
                </Typography>
                
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
                  <Typography variant="body2" color="text.secondary">
                    📍 {job.address}
                    {job.city && `, ${job.city}`}
                    {job.state && `, ${job.state}`}
                    {job.zip && ` ${job.zip}`}
                  </Typography>
                )}
              </Box>

              <Box sx={{ flex: '1 1 calc(33.33% - 12px)', minWidth: '300px' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {job.dueDate && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Due Date
                      </Typography>
                      <Typography variant="body2">
                        {new Date(job.dueDate).toLocaleDateString()}
                      </Typography>
                    </Box>
                  )}

                  {job.customerPO && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Customer PO
                      </Typography>
                      <Typography variant="body2">
                        {job.customerPO}
                      </Typography>
                    </Box>
                  )}

                  {job.estimatedHours && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Estimated Hours
                      </Typography>
                      <Typography variant="body2">
                        {job.estimatedHours} hours
                      </Typography>
                    </Box>
                  )}

                  {job.estimatedCost && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Estimated Cost
                      </Typography>
                      <Typography variant="body2">
                        ${job.estimatedCost.toLocaleString()}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={(_, newValue) => setActiveTab(newValue)}
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab 
              icon={<WorkIcon />} 
              label="Phases" 
              iconPosition="start"
            />
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
            <Tab 
              icon={<ScheduleIcon />} 
              label="Real-Time Costs" 
              iconPosition="start"
            />
            <Tab 
              icon={<MoneyIcon />} 
              label="Billing" 
              iconPosition="start"
            />
            <Tab 
              icon={<PhotoIcon />} 
              label="Photos & Files" 
              iconPosition="start"
            />
          </Tabs>
        </Paper>

        {/* Tab Panels */}
        <TabPanel value={activeTab} index={0}>
          <JobPhasesManager jobId={job.id} />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <JobMaterialReservations 
            jobId={job.id} 
            jobTitle={job.title}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <MaterialUsageTracker 
            jobId={job.id}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <RealTimeJobCosts 
            jobId={job.id}
            jobNumber={job.jobNumber}
            autoRefresh={true}
            refreshInterval={30000}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
          <JobLaborRateOverrides jobId={job.id} />
        </TabPanel>

        <TabPanel value={activeTab} index={5}>
          <FileAttachmentManager 
            entityType="job"
            entityId={job.id}
            onAttachmentChange={() => {
              // Optionally refresh job data
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