'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Grid,
} from '@mui/material'
import {
  Add as AddIcon,
  Search as SearchIcon,
  AttachMoney,
  PendingActions,
  CheckCircle,
  Warning,
  Receipt as ReceiptIcon,
} from '@mui/icons-material'
import ResponsiveLayout from '@/components/layout/ResponsiveLayout'
import ResponsiveContainer from '@/components/layout/ResponsiveContainer'
import InvoiceActionsMenu from '@/components/invoices/InvoiceActionsMenu'
import CreateInvoiceDialog from '@/components/invoices/CreateInvoiceDialog'
import EditInvoiceDialog from '@/components/invoices/EditInvoiceDialog'

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface Customer {
  id: string
  firstName: string
  lastName: string
}

interface Job {
  id: string
  jobNumber: string
  description?: string
  status: string
  customerId: string
}

interface Invoice {
  id: string
  invoiceNumber: string
  job: Job
  customer: Customer
  totalAmount: number
  subtotalAmount: number
  taxAmount: number
  dueDate: string
  sentDate: string | null
  paidDate: string | null
  status: string
  lineItems?: Array<{
    id: string
    type: string
    description: string
    quantity: number
    unitPrice: number
    totalPrice: number
    materialId?: string
    laborRateId?: string
  }>
}

interface Stats {
  title: string
  value: string
  icon: string
  color: string
}

const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  switch (status) {
    case 'Paid':
      return 'success'
    case 'Sent':
      return 'primary'
    case 'Overdue':
      return 'error'
    case 'Draft':
      return 'default'
    default:
      return 'default'
  }
}

export default function InvoicingPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [stats, setStats] = useState<Stats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/login')
      return
    }
    setUser(JSON.parse(storedUser))
    fetchInvoices()
    fetchStats()
  }, [router])

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/invoices')
      if (!response.ok) {
        throw new Error('Failed to fetch invoices')
      }
      const data = await response.json()
      setInvoices(data)
      setError(null)
    } catch (err) {
      setError('Failed to load invoices')
      console.error('Error fetching invoices:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/invoices/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching invoice stats:', error)
    }
  }

  const handleCreateInvoice = () => {
    setCreateDialogOpen(true)
  }

  const handleEditInvoice = async (invoice: Invoice) => {
    try {
      // Fetch full invoice details including line items
      const response = await fetch(`/api/invoices/${invoice.id}`)
      if (response.ok) {
        const fullInvoice = await response.json()
        console.log('Fetched full invoice for editing:', fullInvoice)
        setSelectedInvoice(fullInvoice)
        setEditDialogOpen(true)
      } else {
        console.error('Failed to fetch invoice details')
        alert('Failed to load invoice details')
      }
    } catch (error) {
      console.error('Error fetching invoice for edit:', error)
      alert('Failed to load invoice details')
    }
  }

  const handleDeleteInvoice = async (invoice: Invoice) => {
    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete invoice')
      }

      await fetchInvoices()
      await fetchStats()
    } catch (error) {
      console.error('Error deleting invoice:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete invoice')
    }
  }

  const handleInvoiceCreated = () => {
    fetchInvoices()
    fetchStats()
  }

  const handleInvoiceUpdated = () => {
    fetchInvoices()
    fetchStats()
  }

  const handleStatusUpdated = () => {
    fetchInvoices()
    fetchStats()
  }

  const getStatsIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'attach_money': return AttachMoney
      case 'pending_actions': return PendingActions
      case 'check_circle': return CheckCircle
      case 'warning': return Warning
      default: return AttachMoney
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (!user) return null

  const breadcrumbs = [
    {
      label: 'Dashboard',
      path: '/dashboard',
    },
    {
      label: 'Invoicing',
      icon: <ReceiptIcon fontSize="small" />
    }
  ]

  return (
    <ResponsiveLayout>
      <ResponsiveContainer
        title="Invoicing"
        subtitle="Manage invoices and billing"
        breadcrumbs={breadcrumbs}
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateInvoice}
            sx={{
              backgroundColor: '#e14eca',
              '&:hover': {
                backgroundColor: '#d236b8',
              },
            }}
          >
            Create Invoice
          </Button>
        }
      >
        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {stats.map((stat, index) => {
            const IconComponent = getStatsIconComponent(stat.icon)
            return (
              <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography color="text.secondary" gutterBottom>
                          {stat.title}
                        </Typography>
                        <Typography variant="h4">
                          {stat.value}
                        </Typography>
                      </Box>
                      <IconComponent
                        sx={{
                          fontSize: 40,
                          color: stat.color || 'primary.main',
                          opacity: 0.3,
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>

        {/* Search and Filter */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search by invoice number, job number, or customer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </CardContent>
        </Card>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Invoice #</TableCell>
                  <TableCell>Job #</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Sent Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No invoices found
                    </TableCell>
                  </TableRow>
                ) : invoices
                  .filter(invoice => 
                    invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    invoice.job?.jobNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    `${invoice.customer?.firstName || ''} ${invoice.customer?.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((invoice) => (
                    <TableRow key={invoice.id} hover>
                      <TableCell>{invoice.invoiceNumber}</TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">{invoice.job.jobNumber}</Typography>
                          {invoice.job.description && (
                            <Typography variant="caption" color="text.secondary">
                              {invoice.job.description}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {invoice.customer.firstName} {invoice.customer.lastName}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'medium' }}>
                        ${invoice.totalAmount.toFixed(2)}
                      </TableCell>
                      <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                      <TableCell>
                        {invoice.sentDate ? formatDate(invoice.sentDate) : '-'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={invoice.status}
                          color={getStatusColor(invoice.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <InvoiceActionsMenu
                          invoice={invoice}
                          onEdit={handleEditInvoice}
                          onDelete={handleDeleteInvoice}
                          onStatusUpdated={handleStatusUpdated}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                {invoices.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography color="text.secondary">No invoices found</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <CreateInvoiceDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          onInvoiceCreated={handleInvoiceCreated}
        />

        {selectedInvoice && (
          <EditInvoiceDialog
            open={editDialogOpen}
            onClose={() => {
              setEditDialogOpen(false)
              setSelectedInvoice(null)
            }}
            onInvoiceUpdated={handleInvoiceUpdated}
            invoice={selectedInvoice}
          />
        )}
      </ResponsiveContainer>
    </ResponsiveLayout>
  )
}