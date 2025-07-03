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

  // Mobile CustomerCard component
  const CustomerCard = ({ customer }: { customer: Customer }) => {
    return (
      <Card sx={{ 
        mb: 2,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: 3,
          transform: 'translateY(-2px)',
        },
      }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {customer.name}
              </Typography>
              {customer.companyName && (
                <Typography variant="body2" color="text.secondary">
                  {customer.companyName}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
              <Chip
                label={customer.type}
                color={customer.type === 'Commercial' ? 'primary' : 'default'}
                size="small"
                variant="outlined"
              />
              <Chip
                label={customer.status}
                color={customer.status === 'active' ? 'success' : 'default'}
                size="small"
              />
            </Box>
          </Box>
          
          <Box sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Phone sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2">{customer.phone}</Typography>
            </Box>
            {customer.email && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <Email sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2">{customer.email}</Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2">{customer.address || 'No address'}</Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Total Jobs: <strong>{customer.totalJobs}</strong>
            </Typography>
            <CustomerActionsMenu
              customer={customer}
              onEdit={handleEditCustomer}
              onDelete={handleDeleteCustomer}
              onView={handleViewCustomer}
            />
          </Box>
        </CardContent>
      </Card>
    )
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
      spacing={1.5} 
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


  return (
    <ResponsiveLayout>
      <ResponsiveContainer
        title="Customer Management"
        actions={actionButtons}
      >

          <Card sx={{ 
            mb: 3,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              boxShadow: 3,
            },
          }}>
            <CardContent sx={{ p: 2.5 }}>
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

          {isMobile ? (
            <Box>
              {loading ? (
                <Typography align="center" sx={{ py: 4 }}>
                  Loading customers...
                </Typography>
              ) : customers.length === 0 ? (
                <Typography align="center" sx={{ py: 4 }} color="text.secondary">
                  No customers found
                </Typography>
              ) : (
                customers
                  .filter(customer => 
                    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (customer.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                    customer.phone.includes(searchTerm)
                  )
                  .map((customer) => (
                    <CustomerCard key={customer.id} customer={customer} />
                  ))
              )}
            </Box>
          ) : (
          <TableContainer component={Paper} sx={{
            borderRadius: 2,
            overflow: 'hidden',
            transition: 'box-shadow 0.2s',
            '&:hover': {
              boxShadow: 2,
            },
          }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>Contact</TableCell>
                  <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>Address</TableCell>
                  <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>Total Jobs</TableCell>
                  <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>Actions</TableCell>
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
                      <TableRow key={customer.id} hover sx={{ 
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      }}>
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
          )}
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