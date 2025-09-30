'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material'
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material'
import toast from 'react-hot-toast'

const Grid = ({ children, container, spacing, xs, md, size, alignItems, justifyContent, ...props }: any) => (
  <Box 
    sx={{ 
      display: container ? 'flex' : 'block',
      flexWrap: container ? 'wrap' : undefined,
      gap: container && spacing ? spacing : undefined,
      flex: xs ? '1 1 auto' : undefined,
      width: xs === 12 ? '100%' : undefined,
      alignItems,
      justifyContent,
      ...props.sx
    }}
    {...props}
  >
    {children}
  </Box>
)

interface StorageLocation {
  id: string
  name: string
  code: string
  type: string
}

interface ReceivingItem {
  poItemId: string
  materialId: string
  materialCode: string
  materialName: string
  orderedQty: number
  receivedQty: number
  remainingQty: number
  receivingStatus: 'NOT_RECEIVED' | 'PARTIAL' | 'COMPLETE'
  quantityToReceive: number
  locationId: string
}

interface PurchaseOrderReceivingDialogProps {
  open: boolean
  onClose: () => void
  purchaseOrderId: string
  onReceiptProcessed?: () => void
}

export default function PurchaseOrderReceivingDialog({
  open,
  onClose,
  purchaseOrderId,
  onReceiptProcessed,
}: PurchaseOrderReceivingDialogProps) {
  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [poNumber, setPoNumber] = useState('')
  const [vendorName, setVendorName] = useState('')
  const [orderDate, setOrderDate] = useState('')
  const [items, setItems] = useState<ReceivingItem[]>([])
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([])
  const [defaultLocationId, setDefaultLocationId] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (open && purchaseOrderId) {
      fetchData()
    }
  }, [open, purchaseOrderId])

  const fetchData = async () => {
    setFetchingData(true)
    setError(null)
    try {
      const [receivingResponse, locationsResponse, poResponse] = await Promise.all([
        fetch(`/api/purchase-orders/${purchaseOrderId}/receiving-status`),
        fetch('/api/storage-locations'),
        fetch(`/api/purchase-orders/${purchaseOrderId}`)
      ])

      if (!receivingResponse.ok) {
        throw new Error('Failed to fetch receiving status')
      }

      const receivingData = await receivingResponse.json()
      setPoNumber(receivingData.poNumber)

      let locationsData: StorageLocation[] = []
      if (locationsResponse.ok) {
        locationsData = await locationsResponse.json()
        setStorageLocations(locationsData)
        if (locationsData.length > 0) {
          setDefaultLocationId(locationsData[0].id)
        }
      }

      if (poResponse.ok) {
        const poData = await poResponse.json()
        if (poData.success && poData.data) {
          setVendorName(poData.data.vendorName || 'Unknown Vendor')
          setOrderDate(poData.data.orderDate ? new Date(poData.data.orderDate).toLocaleDateString() : '')
        }
      }

      const defaultLoc = locationsData.length > 0 ? locationsData[0].id : ''
      const receivingItems: ReceivingItem[] = receivingData.items.map((item: any) => ({
        ...item,
        quantityToReceive: 0,
        locationId: defaultLoc
      }))

      setItems(receivingItems)

    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load receiving data')
      toast.error('Failed to load receiving data')
    } finally {
      setFetchingData(false)
    }
  }

  const handleQuantityChange = (poItemId: string, value: string) => {
    const quantity = parseFloat(value) || 0
    setItems(items.map(item => {
      if (item.poItemId === poItemId) {
        const maxQuantity = item.remainingQty
        const validQuantity = Math.min(Math.max(0, quantity), maxQuantity)
        return { ...item, quantityToReceive: validQuantity }
      }
      return item
    }))
  }

  const handleLocationChange = (poItemId: string, locationId: string) => {
    setItems(items.map(item => 
      item.poItemId === poItemId ? { ...item, locationId } : item
    ))
  }

  const handleApplyDefaultLocation = () => {
    if (defaultLocationId) {
      setItems(items.map(item => ({ ...item, locationId: defaultLocationId })))
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETE':
        return 'success'
      case 'PARTIAL':
        return 'warning'
      case 'NOT_RECEIVED':
        return 'default'
      default:
        return 'default'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETE':
        return 'Complete'
      case 'PARTIAL':
        return 'Partial'
      case 'NOT_RECEIVED':
        return 'Pending'
      default:
        return status
    }
  }

  const calculateTotals = () => {
    const totalItems = items.length
    const fullyReceived = items.filter(item => item.receivingStatus === 'COMPLETE').length
    const partiallyReceived = items.filter(item => item.receivingStatus === 'PARTIAL').length
    const pending = items.filter(item => item.receivingStatus === 'NOT_RECEIVED').length
    
    return { totalItems, fullyReceived, partiallyReceived, pending }
  }

  const isSubmitDisabled = () => {
    const hasQuantity = items.some(item => item.quantityToReceive > 0)
    const hasLocation = items.every(item => 
      item.quantityToReceive === 0 || item.locationId !== ''
    )
    return !hasQuantity || !hasLocation || loading
  }

  const handleSubmit = async () => {
    const itemsToReceive = items
      .filter(item => item.quantityToReceive > 0)
      .map(item => ({
        poItemId: item.poItemId,
        quantityReceived: item.quantityToReceive,
        locationId: item.locationId
      }))

    if (itemsToReceive.length === 0) {
      toast.error('Please enter at least one quantity to receive')
      return
    }

    const missingLocation = itemsToReceive.some(item => !item.locationId)
    if (missingLocation) {
      toast.error('Please select a storage location for all items to receive')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/purchase-orders/${purchaseOrderId}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: itemsToReceive,
          notes: notes || undefined,
          receiptDate: new Date().toISOString()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process receipt')
      }

      toast.success(`Receipt processed successfully! Receipt #${data.receipt?.receiptNumber || 'N/A'}`)
      
      if (onReceiptProcessed) {
        onReceiptProcessed()
      }
      
      handleClose()
    } catch (err) {
      console.error('Error processing receipt:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to process receipt'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setItems([])
    setNotes('')
    setError(null)
    setDefaultLocationId('')
    onClose()
  }

  const totals = calculateTotals()

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { height: '90vh' } }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Receive Purchase Order</Typography>
          <Typography variant="h6" color="primary">
            {poNumber}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {fetchingData ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Grid container spacing={3}>
              <Grid xs={12}>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Vendor</Typography>
                    <Typography variant="body1" fontWeight="medium">{vendorName}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Order Date</Typography>
                    <Typography variant="body1" fontWeight="medium">{orderDate}</Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid xs={12}>
                <Box sx={{ 
                  display: 'flex', 
                  gap: 2, 
                  p: 2, 
                  bgcolor: 'grey.50', 
                  borderRadius: 1,
                  flexWrap: 'wrap'
                }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Total Items</Typography>
                    <Typography variant="h6">{totals.totalItems}</Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Fully Received</Typography>
                    <Typography variant="h6" color="success.main">{totals.fullyReceived}</Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Partially Received</Typography>
                    <Typography variant="h6" color="warning.main">{totals.partiallyReceived}</Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Pending</Typography>
                    <Typography variant="h6" color="text.secondary">{totals.pending}</Typography>
                  </Box>
                </Box>
              </Grid>

              {storageLocations.length > 0 && (
                <Grid xs={12}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                    <FormControl sx={{ minWidth: 250 }}>
                      <InputLabel>Default Storage Location</InputLabel>
                      <Select
                        value={defaultLocationId}
                        onChange={(e) => setDefaultLocationId(e.target.value)}
                        label="Default Storage Location"
                      >
                        {storageLocations.map(loc => (
                          <MenuItem key={loc.id} value={loc.id}>
                            {loc.name} ({loc.code})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Button 
                      variant="outlined" 
                      onClick={handleApplyDefaultLocation}
                      disabled={!defaultLocationId}
                    >
                      Apply to All Items
                    </Button>
                  </Box>
                </Grid>
              )}

              <Grid xs={12}>
                <Typography variant="h6" gutterBottom>
                  Line Items
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Material Code</TableCell>
                        <TableCell>Material Name</TableCell>
                        <TableCell align="right">Ordered</TableCell>
                        <TableCell align="right">Received</TableCell>
                        <TableCell align="right">Remaining</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right" sx={{ minWidth: 120 }}>Qty to Receive</TableCell>
                        <TableCell sx={{ minWidth: 200 }}>Storage Location</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.poItemId}>
                          <TableCell>
                            <Chip size="small" label={item.materialCode} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{item.materialName}</Typography>
                          </TableCell>
                          <TableCell align="right">{item.orderedQty}</TableCell>
                          <TableCell align="right">{item.receivedQty}</TableCell>
                          <TableCell align="right">
                            <Typography fontWeight="medium">{item.remainingQty}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              size="small" 
                              label={getStatusLabel(item.receivingStatus)}
                              color={getStatusColor(item.receivingStatus)}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <TextField
                              size="small"
                              type="number"
                              value={item.quantityToReceive || ''}
                              onChange={(e) => handleQuantityChange(item.poItemId, e.target.value)}
                              inputProps={{ 
                                min: 0, 
                                max: item.remainingQty,
                                step: 0.01
                              }}
                              disabled={item.remainingQty === 0}
                              sx={{ width: 100 }}
                            />
                          </TableCell>
                          <TableCell>
                            <FormControl fullWidth size="small">
                              <Select
                                value={item.locationId}
                                onChange={(e) => handleLocationChange(item.poItemId, e.target.value)}
                                disabled={item.quantityToReceive === 0 || storageLocations.length === 0}
                              >
                                {storageLocations.map(loc => (
                                  <MenuItem key={loc.id} value={loc.id}>
                                    {loc.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              <Grid xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Receiving Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this receipt..."
                />
              </Grid>
            </Grid>
          </>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button 
          onClick={handleClose} 
          startIcon={<CancelIcon />}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
          disabled={isSubmitDisabled()}
        >
          {loading ? 'Processing...' : 'Process Receipt'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
