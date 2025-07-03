'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import CreateCustomerDialog from '@/components/customers/CreateCustomerDialog'
import EditCustomerDialog from '@/components/customers/EditCustomerDialog'
import CustomerActionsMenu from '@/components/customers/CustomerActionsMenu'
import ResponsiveLayout from '@/components/layout/ResponsiveLayout'
import ResponsiveContainer from '@/components/layout/ResponsiveContainer'
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
  Stack,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,
  Search as SearchIcon,
  Phone,
  Email,
  LocationOn,
} from '@mui/icons-material'

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface Customer {
  id: string
  name: string
  companyName?: string
  firstName: string
  lastName: string
  type: string
  phone: string
  email?: string
  address: string
  totalJobs: number
  activeJobs: number
  status: string
}

export default function CustomersPage() {
  const router = useRouter()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [user, setUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/login')
      return
    }
    setUser(JSON.parse(storedUser))
    fetchCustomers()
  }, [router])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/customers', {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('Failed to fetch customers')
      }
      const data = await response.json()
      setCustomers(data.customers || [])
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setLoading(false)
    }
  }


  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setEditDialogOpen(true)
  }

  const handleDeleteCustomer = async (customer: Customer) => {
    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete customer')
      }
      
      fetchCustomers() // Refresh the list
    } catch (error) {
      console.error('Error deleting customer:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete customer. Please try again.')
    }
  }

  const handleViewCustomer = (customer: Customer) => {
    // For now, just open edit dialog in view mode
    // Later could be a separate view dialog
    handleEditCustomer(customer)
  }

  if (!user) return null

  // Action buttons for the page header
  const actionButtons = (
    <Stack 
      direction={{ xs: 'column', sm: 'row' }} 
      spacing={1} 
      sx={{ 
        width: { xs: '100%', sm: 'auto' },
        alignItems: { xs: 'stretch', sm: 'center' }
      }}
    >
      <Button
        variant="contained"
        startIcon={<PersonAddIcon />}
        onClick={() => setCreateDialogOpen(true)}
        sx={{
          backgroundColor: '#e14eca',
          '&:hover': {
            backgroundColor: '#d236b8',
          },
          flex: { xs: 1, sm: 'none' },
          minWidth: { xs: 'auto', sm: '140px' }
        }}
        size={isMobile ? 'small' : 'medium'}
      >
        {isMobile ? 'New' : 'New Customer'}
      </Button>
    </Stack>
  )

  // Breadcrumbs for navigation
  const breadcrumbs = [
    {
      label: 'Home',
      path: '/dashboard',
      icon: <DashboardIcon fontSize="small" />
    },
    {
      label: 'Customers',
      path: '/customers',
      icon: <PeopleIcon fontSize="small" />
    }
  ]

  return (
    <ResponsiveLayout>
      <ResponsiveContainer
        title="Customer Management"
        breadcrumbs={breadcrumbs}
        actions={actionButtons}
      >

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <TextField
                fullWidth
                placeholder="Search customers by name, email, or phone..."
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

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell>Total Jobs</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      Loading customers...
                    </TableCell>
                  </TableRow>
                ) : customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No customers found
                    </TableCell>
                  </TableRow>
                ) : (
                  customers
                    .filter(customer => 
                      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (customer.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                      customer.phone.includes(searchTerm)
                    )
                    .map((customer) => (
                      <TableRow key={customer.id} hover>
                        <TableCell>{customer.id.slice(0, 8)}</TableCell>
                        <TableCell>{customer.name}</TableCell>
                        <TableCell>
                          <Chip
                            label={customer.type}
                            color={customer.type === 'Commercial' ? 'primary' : 'default'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Phone sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="body2">{customer.phone}</Typography>
                            </Box>
                            {customer.email && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Email sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2">{customer.email}</Typography>
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2">{customer.address || 'No address'}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{customer.totalJobs}</TableCell>
                        <TableCell>
                          <Chip
                            label={customer.status}
                            color={customer.status === 'active' ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <CustomerActionsMenu
                            customer={customer}
                            onEdit={handleEditCustomer}
                            onDelete={handleDeleteCustomer}
                            onView={handleViewCustomer}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
      </ResponsiveContainer>

      <CreateCustomerDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCustomerCreated={() => {
          fetchCustomers() // Refresh the customers list
          setCreateDialogOpen(false)
        }}
      />

      <EditCustomerDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false)
          setSelectedCustomer(null)
        }}
        onCustomerUpdated={() => {
          fetchCustomers() // Refresh the customers list
          setEditDialogOpen(false)
          setSelectedCustomer(null)
        }}
        customer={selectedCustomer}
      />
    </ResponsiveLayout>
  )
}