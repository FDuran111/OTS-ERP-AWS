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
  Tabs,
  Tab,
} from '@mui/material'
import {
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,
  Search as SearchIcon,
  Phone,
  Email,
  LocationOn,
  CheckCircle as ApproveIcon,
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
  createdBy?: string
  createdAt?: string
}

export default function CustomersPage() {
  const router = useRouter()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [user, setUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [employeeCustomers, setEmployeeCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [currentTab, setCurrentTab] = useState(0)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/login')
      return
    }
    const parsedUser = JSON.parse(storedUser)
    setUser(parsedUser)
    fetchCustomers()
    // If admin or foreman, also fetch employee-created customers
    if (parsedUser.role === 'OWNER_ADMIN' || parsedUser.role === 'FOREMAN') {
      fetchEmployeeCustomers()
    }
  }, [router])

  const fetchCustomers = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      // Add cache-busting to prevent stale data
      const response = await fetch(`/api/customers?_t=${Date.now()}`, {
        credentials: 'include',
        cache: 'no-store'
      })
      if (!response.ok) {
        throw new Error('Failed to fetch customers')
      }
      const data = await response.json()
      setCustomers(data.customers || [])
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const fetchEmployeeCustomers = async () => {
    try {
      // Add cache: 'no-store' to prevent caching issues after approvals
      const response = await fetch(`/api/customers/pending?_t=${Date.now()}`, {
        credentials: 'include',
        cache: 'no-store'
      })
      if (!response.ok) {
        throw new Error('Failed to fetch pending customers')
      }
      const data = await response.json()
      // Transform to match expected format
      const transformedCustomers = data.map((c: any) => ({
        id: c.id,
        name: c.companyName || `${c.firstName} ${c.lastName}`,
        companyName: c.companyName,
        firstName: c.firstName,
        lastName: c.lastName,
        type: c.type || 'Residential',
        phone: c.phone || '',
        email: c.email,
        address: c.address,
        totalJobs: 0,
        activeJobs: 0,
        status: 'Pending',
        createdBy: c.createdByName,
        createdAt: c.createdAt
      }))
      setEmployeeCustomers(transformedCustomers)
    } catch (error) {
      console.error('Error fetching pending customers:', error)
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
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total Jobs: <strong>{customer.totalJobs}</strong>
              </Typography>
              {customer.createdBy && (
                <Typography variant="body2" color="primary">
                  Created by: {customer.createdBy}
                </Typography>
              )}
            </Box>
            <Stack direction="row" spacing={1}>
              {customer.status === 'Pending' && (
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  startIcon={<ApproveIcon />}
                  onClick={() => handleApproveCustomer(customer)}
                >
                  Approve
                </Button>
              )}
              <CustomerActionsMenu
                customer={customer}
                onEdit={handleEditCustomer}
                onDelete={handleDeleteCustomer}
                onView={handleViewCustomer}
              />
            </Stack>
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
    // Store previous state for rollback
    const previousCustomers = [...customers]
    const previousEmployeeCustomers = [...employeeCustomers]

    // Optimistic update - immediately remove from UI
    setCustomers(prev => prev.filter(c => c.id !== customer.id))
    setEmployeeCustomers(prev => prev.filter(c => c.id !== customer.id))

    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete customer')
      }

      // Success - silently refresh in background
      fetchCustomers(false)
    } catch (error) {
      console.error('Error deleting customer:', error)
      // Rollback optimistic update on failure
      setCustomers(previousCustomers)
      setEmployeeCustomers(previousEmployeeCustomers)
      alert(error instanceof Error ? error.message : 'Failed to delete customer. Please try again.')
    }
  }

  const handleViewCustomer = (customer: Customer) => {
    // For now, just open edit dialog in view mode
    // Later could be a separate view dialog
    handleEditCustomer(customer)
  }

  const handleApproveCustomer = async (customer: Customer) => {
    if (!confirm(`Approve customer "${customer.name}"? This will make them an active customer in the system.`)) {
      return
    }

    // Store previous state for rollback if needed
    const previousEmployeeCustomers = [...employeeCustomers]
    const previousCustomers = [...customers]

    // Optimistic update - immediately update UI
    setEmployeeCustomers(prev => prev.filter(c => c.id !== customer.id))

    // Add approved customer to main list with updated status
    const approvedCustomer: Customer = {
      ...customer,
      status: 'active'
    }
    setCustomers(prev => [approvedCustomer, ...prev])

    try {
      const response = await fetch(`/api/customers/${customer.id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to approve customer')
      }

      // Success - fetch fresh data in background silently (no loading state)
      fetchCustomers(false)
      fetchEmployeeCustomers()
    } catch (error) {
      console.error('Error approving customer:', error)
      // Rollback optimistic update on failure
      setEmployeeCustomers(previousEmployeeCustomers)
      setCustomers(previousCustomers)
      alert('Failed to approve customer. Please try again.')
    }
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
        {/* Only show tabs for admin/foreman */}
        {(user?.role === 'OWNER_ADMIN' || user?.role === 'FOREMAN') && (
          <Tabs
            value={currentTab}
            onChange={(_, newValue) => setCurrentTab(newValue)}
            sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="All Customers" />
            <Tab
              label="Pending Customers"
              icon={employeeCustomers.length > 0 ? <Chip label={employeeCustomers.length} size="small" color="warning" /> : undefined}
              iconPosition="end"
            />
          </Tabs>
        )}

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
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }
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
              ) : (
                <>
                  {/* Show different customers based on tab */}
                  {currentTab === 1 && (user?.role === 'OWNER_ADMIN' || user?.role === 'FOREMAN') ? (
                    // Employee Created Customers
                    employeeCustomers.length === 0 ? (
                      <Typography align="center" sx={{ py: 4 }} color="text.secondary">
                        No employee-created customers found
                      </Typography>
                    ) : (
                      employeeCustomers
                        .filter(customer =>
                          customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (customer.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (customer.phone || '').includes(searchTerm)
                        )
                        .map((customer) => (
                          <CustomerCard key={customer.id} customer={customer} />
                        ))
                    )
                  ) : (
                    // All Customers
                    customers.length === 0 ? (
                      <Typography align="center" sx={{ py: 4 }} color="text.secondary">
                        No customers found
                      </Typography>
                    ) : (
                      customers
                        .filter(customer =>
                          customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (customer.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (customer.phone || '').includes(searchTerm)
                        )
                        .map((customer) => (
                          <CustomerCard key={customer.id} customer={customer} />
                        ))
                    )
                  )}
                </>
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
                  {currentTab === 1 && (user?.role === 'OWNER_ADMIN' || user?.role === 'FOREMAN') && (
                    <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>Created By</TableCell>
                  )}
                  <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>Total Jobs</TableCell>
                  <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={currentTab === 1 ? 9 : 8} align="center">
                      Loading customers...
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {/* Show different customers based on tab */}
                    {currentTab === 1 && (user?.role === 'OWNER_ADMIN' || user?.role === 'FOREMAN') ? (
                      // Employee Created Customers
                      employeeCustomers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} align="center">
                            No employee-created customers found
                          </TableCell>
                        </TableRow>
                      ) : (
                        employeeCustomers
                          .filter(customer =>
                            customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (customer.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                            (customer.phone || '').includes(searchTerm)
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
                              <TableCell>
                                <Typography variant="body2" color="primary">
                                  {customer.createdBy || 'Unknown'}
                                </Typography>
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
                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                  <Button
                                    variant="contained"
                                    color="success"
                                    size="small"
                                    startIcon={<ApproveIcon />}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleApproveCustomer(customer)
                                    }}
                                  >
                                    Approve
                                  </Button>
                                  <CustomerActionsMenu
                                    customer={customer}
                                    onEdit={handleEditCustomer}
                                    onDelete={handleDeleteCustomer}
                                    onView={handleViewCustomer}
                                  />
                                </Stack>
                              </TableCell>
                            </TableRow>
                          ))
                      )
                    ) : (
                      // All Customers
                      customers.length === 0 ? (
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
                            (customer.phone || '').includes(searchTerm)
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
                      )
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          )}
      </ResponsiveContainer>

      <CreateCustomerDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCustomerCreated={(newCustomer) => {
          // Optimistically add customer to list immediately
          if (newCustomer) {
            setCustomers(prev => [newCustomer, ...prev])
          }
          // Silent background refresh to ensure data consistency
          fetchCustomers(false)
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