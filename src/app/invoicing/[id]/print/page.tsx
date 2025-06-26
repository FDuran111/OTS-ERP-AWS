'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
} from '@mui/material'
import {
  Print as PrintIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material'

interface LineItem {
  id: string
  type: 'LABOR' | 'MATERIAL' | 'OTHER'
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
  materialId?: string
  laborRateId?: string
}

interface Customer {
  firstName: string
  lastName: string
  email: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip?: string
}

interface Job {
  jobNumber: string
  description: string
  address?: string
}

interface Invoice {
  id: string
  invoiceNumber: string
  status: string
  totalAmount: number
  subtotalAmount: number
  taxAmount: number
  dueDate: string
  sentDate?: string
  paidDate?: string
  notes?: string
  createdAt: string
  job: Job
  customer: Customer
  lineItems: LineItem[]
}

interface CompanySettings {
  company_name: string
  business_address?: string
  phone_number?: string
  email?: string
  license_number?: string
  tax_id?: string
}

export default function InvoicePrintPage() {
  const router = useRouter()
  const params = useParams()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [printCount, setPrintCount] = useState(0)
  
  // Refs for state debugging and preservation
  const layoutStateRef = useRef({
    hasInvoice: false,
    hasCompanySettings: false,
    lastRenderTime: Date.now()
  })
  const printInProgressRef = useRef(false)

  const invoiceId = params.id as string

  // Debug function to log state changes
  const debugState = useCallback((action: string, details?: any) => {
    const timestamp = new Date().toISOString()
    console.log(`[Invoice Print Debug] ${timestamp} - ${action}`, {
      invoiceId,
      hasInvoice: !!invoice,
      hasCompanySettings: !!companySettings,
      loading,
      error,
      isPrinting,
      printCount,
      printInProgress: printInProgressRef.current,
      ...details
    })
  }, [invoiceId, invoice, companySettings, loading, error, isPrinting, printCount])

  // Update layout state ref whenever data changes
  useEffect(() => {
    layoutStateRef.current = {
      hasInvoice: !!invoice,
      hasCompanySettings: !!companySettings,
      lastRenderTime: Date.now()
    }
    debugState('State Updated', { layoutState: layoutStateRef.current })
  }, [invoice, companySettings, debugState])

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        // Fetch invoice data
        const invoiceResponse = await fetch(`/api/invoices/${invoiceId}`)
        if (!invoiceResponse.ok) {
          if (invoiceResponse.status === 404) {
            throw new Error('Invoice not found')
          }
          throw new Error('Failed to load invoice')
        }
        const invoiceData = await invoiceResponse.json()
        setInvoice(invoiceData)

        // Fetch company settings
        try {
          const settingsResponse = await fetch('/api/settings')
          if (settingsResponse.ok) {
            const settings = await settingsResponse.json()
            setCompanySettings(settings.company)
          }
        } catch (settingsError) {
          console.warn('Could not load company settings:', settingsError)
          // Use fallback company data
          setCompanySettings({
            company_name: 'Ortmeier Technical Service',
            business_address: '123 Electric Ave, Anytown, ST 12345',
            phone_number: '(555) 123-4567',
            email: 'info@ortmeiertech.com',
            license_number: 'EC-123456',
          })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invoice')
      } finally {
        setLoading(false)
      }
    }

    if (invoiceId) {
      loadData()
    }
  }, [invoiceId])

  // Add print event listeners for better tracking
  useEffect(() => {
    const handleBeforePrint = () => {
      debugState('Print Dialog Opened')
    }

    const handleAfterPrint = () => {
      debugState('Print Dialog Closed')
      
      // Ensure state is consistent after print
      setTimeout(() => {
        if (printInProgressRef.current) {
          debugState('Cleaning up print state after dialog close')
          setIsPrinting(false)
          printInProgressRef.current = false
        }
      }, 100)
    }

    // Add event listeners
    window.addEventListener('beforeprint', handleBeforePrint)
    window.addEventListener('afterprint', handleAfterPrint)

    // Cleanup on unmount
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint)
      window.removeEventListener('afterprint', handleAfterPrint)
    }
  }, [debugState])

  const handlePrint = useCallback(async () => {
    // Prevent multiple simultaneous print operations
    if (printInProgressRef.current) {
      debugState('Print Blocked - Already in progress')
      return
    }

    try {
      printInProgressRef.current = true
      setIsPrinting(true)
      debugState('Print Started')

      // Store current state before printing
      const preInvoiceState = !!invoice
      const preCompanyState = !!companySettings
      const preErrorState = error
      const preLoadingState = loading

      debugState('Pre-Print State Captured', {
        preInvoiceState,
        preCompanyState,
        preErrorState,
        preLoadingState
      })

      // Small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100))

      // Trigger the print dialog
      window.print()

      // Post-print verification (after a short delay)
      setTimeout(() => {
        const postInvoiceState = !!invoice
        const postCompanyState = !!companySettings
        const postErrorState = error
        const postLoadingState = loading

        debugState('Post-Print State Verification', {
          statePreserved: {
            invoice: preInvoiceState === postInvoiceState,
            company: preCompanyState === postCompanyState,
            error: preErrorState === postErrorState,
            loading: preLoadingState === postLoadingState
          },
          postInvoiceState,
          postCompanyState,
          postErrorState,
          postLoadingState
        })

        // Update print count
        setPrintCount(prev => prev + 1)
        setIsPrinting(false)
        printInProgressRef.current = false
        
        debugState('Print Completed Successfully')
      }, 500)

    } catch (printError) {
      console.error('Print operation failed:', printError)
      debugState('Print Failed', { error: printError })
      
      setIsPrinting(false)
      printInProgressRef.current = false
      
      // Optionally show user-friendly error
      alert('Printing failed. Please try again.')
    }
  }, [invoice, companySettings, error, loading, debugState])

  const handleBack = () => {
    router.back()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  // Calculate correct financial totals from line items
  const calculateFinancials = (lineItems: LineItem[]) => {
    // Calculate subtotal: sum of all line items (quantity × unitPrice for each)
    const calculatedSubtotal = lineItems.reduce((total, item) => {
      const lineTotal = item.quantity * item.unitPrice
      console.log(`Line item ${item.id}: ${item.quantity} × ${formatCurrency(item.unitPrice)} = ${formatCurrency(lineTotal)}`)
      return total + lineTotal
    }, 0)

    console.log(`Calculated subtotal: ${formatCurrency(calculatedSubtotal)}`)
    console.log(`API subtotal: ${formatCurrency(invoice?.subtotalAmount || 0)}`)

    // Use the calculated subtotal instead of API value
    const subtotal = calculatedSubtotal

    // Calculate tax from the corrected subtotal
    // If API provides taxAmount, check if it's consistent with subtotal
    let tax = invoice?.taxAmount || 0
    const expectedTaxRate = subtotal > 0 ? tax / subtotal : 0
    
    // If tax rate seems reasonable (0-15%), use it; otherwise recalculate
    if (expectedTaxRate < 0 || expectedTaxRate > 0.15) {
      // Default to 8% tax rate if API tax seems incorrect
      tax = subtotal * 0.08
      console.log(`Tax rate seemed incorrect (${(expectedTaxRate * 100).toFixed(2)}%), using 8% default`)
    }

    console.log(`Tax: ${formatCurrency(tax)} (${(expectedTaxRate * 100).toFixed(2)}% of subtotal)`)

    // Calculate total
    const total = subtotal + tax
    console.log(`Total: ${formatCurrency(subtotal)} + ${formatCurrency(tax)} = ${formatCurrency(total)}`)

    return {
      subtotal: subtotal,
      tax: tax,
      total: total
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return '#4caf50'
      case 'SENT':
        return '#2196f3'
      case 'OVERDUE':
        return '#f44336'
      case 'CANCELLED':
        return '#9e9e9e'
      default:
        return '#ff9800'
    }
  }

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading invoice...
        </Typography>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{
            backgroundColor: '#e14eca',
            '&:hover': {
              backgroundColor: '#d236b8',
            },
          }}
        >
          Go Back
        </Button>
      </Container>
    )
  }

  if (!invoice) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">
          Invoice not found
        </Alert>
      </Container>
    )
  }

  // Calculate correct financial totals
  const financials = calculateFinancials(invoice.lineItems)

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Print Controls - Hidden when printing */}
      <Box 
        data-print-hide
        sx={{ 
          p: 2, 
          backgroundColor: 'white',
          borderBottom: '1px solid #e0e0e0'
        }}
      >
        <Container maxWidth="md">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={handleBack}
            >
              Back to Invoices
            </Button>
            <Button
              variant="contained"
              startIcon={isPrinting ? <CircularProgress size={20} /> : <PrintIcon />}
              onClick={handlePrint}
              disabled={isPrinting || loading || !invoice}
              sx={{
                backgroundColor: '#e14eca',
                '&:hover': {
                  backgroundColor: '#d236b8',
                },
                '&:disabled': {
                  backgroundColor: '#cccccc',
                },
              }}
            >
              {isPrinting ? `Printing... (${printCount > 0 ? `#${printCount + 1}` : ''})` : 'Print Invoice'}
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Invoice Content */}
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4,
            '@media print': {
              elevation: 0,
              boxShadow: 'none',
              p: 2,
            }
          }}
        >
          {/* Header Section */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
            <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '300px' }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#e14eca', mb: 1 }}>
                {companySettings?.company_name || 'Ortmeier Technical Services'}
              </Typography>
              {companySettings?.business_address && (
                <Typography variant="body2" color="text.secondary">
                  {companySettings.business_address}
                </Typography>
              )}
              {companySettings?.phone_number && (
                <Typography variant="body2" color="text.secondary">
                  Phone: {companySettings.phone_number}
                </Typography>
              )}
              {companySettings?.email && (
                <Typography variant="body2" color="text.secondary">
                  Email: {companySettings.email}
                </Typography>
              )}
              {companySettings?.license_number && (
                <Typography variant="body2" color="text.secondary">
                  License: {companySettings.license_number}
                </Typography>
              )}
            </Box>
            <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '300px', textAlign: { xs: 'left', md: 'right' } }}>
              <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 2 }}>
                INVOICE
              </Typography>
              <Box sx={{ mb: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  Invoice #: {invoice.invoiceNumber}
                </Typography>
              </Box>
              <Box sx={{ mb: 1 }}>
                <Typography variant="body1">
                  Date: {formatDate(invoice.createdAt)}
                </Typography>
              </Box>
              <Box sx={{ mb: 1 }}>
                <Typography variant="body1">
                  Due Date: {formatDate(invoice.dueDate)}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    fontWeight: 'bold',
                    color: getStatusColor(invoice.status),
                    textTransform: 'uppercase'
                  }}
                >
                  Status: {invoice.status}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Customer and Job Information */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
            <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '300px' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                Bill To:
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                {invoice.customer.firstName} {invoice.customer.lastName}
              </Typography>
              {invoice.customer.address && (
                <Typography variant="body2" color="text.secondary">
                  {invoice.customer.address}
                </Typography>
              )}
              {(invoice.customer.city || invoice.customer.state || invoice.customer.zip) && (
                <Typography variant="body2" color="text.secondary">
                  {[invoice.customer.city, invoice.customer.state, invoice.customer.zip]
                    .filter(Boolean)
                    .join(', ')}
                </Typography>
              )}
              {invoice.customer.email && (
                <Typography variant="body2" color="text.secondary">
                  {invoice.customer.email}
                </Typography>
              )}
              {invoice.customer.phone && (
                <Typography variant="body2" color="text.secondary">
                  {invoice.customer.phone}
                </Typography>
              )}
            </Box>
            <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '300px' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                Job Details:
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                Job #{invoice.job.jobNumber}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {invoice.job.description}
              </Typography>
              {invoice.job.address && (
                <Typography variant="body2" color="text.secondary">
                  Location: {invoice.job.address}
                </Typography>
              )}
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Line Items */}
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
            Services & Materials
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Type</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Qty</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Unit Price</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoice.lineItems.map((item) => {
                  // Ensure correct calculation: quantity × unitPrice
                  const calculatedTotal = item.quantity * item.unitPrice
                  return (
                    <TableRow key={item.id}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell align="center">
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            px: 1, 
                            py: 0.5, 
                            borderRadius: 1,
                            backgroundColor: item.type === 'LABOR' ? '#e3f2fd' : item.type === 'MATERIAL' ? '#f3e5f5' : '#fff3e0',
                            color: item.type === 'LABOR' ? '#1976d2' : item.type === 'MATERIAL' ? '#7b1fa2' : '#f57c00',
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                          }}
                        >
                          {item.type}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">{item.quantity}</TableCell>
                      <TableCell align="right">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        {/* Use calculated total to ensure accuracy: quantity × unitPrice */}
                        {formatCurrency(calculatedTotal)}
                        {/* Show warning if API totalPrice doesn't match calculation */}
                        {Math.abs(calculatedTotal - item.totalPrice) > 0.01 && (
                          <Typography variant="caption" color="error" display="block">
                            (API: {formatCurrency(item.totalPrice)})
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Totals Section */}
          <Box className="invoice-totals" sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
            <Box sx={{ minWidth: 300 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1">Subtotal:</Typography>
                <Typography variant="body1">{formatCurrency(financials.subtotal)}</Typography>
              </Box>
              {financials.tax > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1">Tax:</Typography>
                  <Typography variant="body1">{formatCurrency(financials.tax)}</Typography>
                </Box>
              )}
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Total:</Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#e14eca' }}>
                  {formatCurrency(financials.total)}
                </Typography>
              </Box>
              
              {/* Show calculation details in development */}
              {process.env.NODE_ENV === 'development' && (
                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #eee' }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Calculation Details:
                  </Typography>
                  {invoice.lineItems.map((item, index) => (
                    <Typography key={item.id} variant="caption" color="text.secondary" display="block">
                      Item {index + 1}: {item.quantity} × {formatCurrency(item.unitPrice)} = {formatCurrency(item.quantity * item.unitPrice)}
                    </Typography>
                  ))}
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 'bold' }}>
                    Subtotal: {formatCurrency(financials.subtotal)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Tax: {formatCurrency(financials.tax)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 'bold' }}>
                    Total: {formatCurrency(financials.total)}
                  </Typography>
                  {Math.abs(financials.subtotal - invoice.subtotalAmount) > 0.01 && (
                    <Typography variant="caption" color="error" display="block">
                      ⚠️ API subtotal was {formatCurrency(invoice.subtotalAmount)} (corrected)
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          </Box>

          {/* Notes Section */}
          {invoice.notes && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                Notes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {invoice.notes}
              </Typography>
            </>
          )}

          {/* Footer */}
          <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #e0e0e0' }}>
            <Typography variant="body2" color="text.secondary" align="center">
              Thank you for your business! If you have any questions about this invoice, 
              please contact us at {companySettings?.email || 'info@ortmeiertech.com'} 
              or {companySettings?.phone_number || '(555) 123-4567'}.
            </Typography>
          </Box>
        </Paper>
      </Container>

      {/* Print Styles - Improved to prevent state loss */}
      <style jsx global>{`
        @media print {
          /* Preserve all colors and styles for printing */
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Hide print controls but preserve all other content */
          [data-print-hide] {
            display: none !important;
          }
          
          /* Optimize page layout for printing */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            font-size: 12pt !important;
            line-height: 1.4 !important;
          }
          
          @page {
            margin: 0.5in;
            size: letter;
          }
          
          /* Ensure containers don't break */
          .MuiContainer-root {
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          /* Clean paper appearance */
          .MuiPaper-root {
            box-shadow: none !important;
            background: white !important;
            border: none !important;
            margin: 0 !important;
            padding: 20px !important;
          }
          
          /* Table styling for clarity */
          .MuiTableContainer-root {
            box-shadow: none !important;
            border: 1px solid #333 !important;
            border-radius: 0 !important;
          }
          
          .MuiTableCell-root {
            border-bottom: 1px solid #333 !important;
            padding: 8px !important;
            font-size: 11pt !important;
          }
          
          .MuiTableHead-root .MuiTableCell-root {
            background-color: #f0f0f0 !important;
            font-weight: bold !important;
            border-bottom: 2px solid #333 !important;
          }
          
          /* Typography adjustments */
          .MuiTypography-h3 {
            font-size: 24pt !important;
            margin-bottom: 10px !important;
          }
          
          .MuiTypography-h4 {
            font-size: 18pt !important;
            margin-bottom: 8px !important;
          }
          
          .MuiTypography-h6 {
            font-size: 14pt !important;
            margin-bottom: 6px !important;
          }
          
          /* Ensure no content is clipped */
          .MuiBox-root {
            page-break-inside: avoid;
          }
          
          /* Force specific elements to stay together */
          .invoice-totals {
            page-break-inside: avoid !important;
          }
        }
        
        /* Screen-only styles to ensure proper display */
        @media screen {
          [data-print-hide] {
            display: block !important;
          }
        }
      `}</style>
    </Box>
  )
}