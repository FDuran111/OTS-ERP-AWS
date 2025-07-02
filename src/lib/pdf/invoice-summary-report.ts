import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface InvoiceSummaryData {
  period: {
    start: string
    end: string
    label: string
  }
  summary: {
    totalInvoices: number
    paidCount: number
    sentCount: number
    overdueCount: number
    draftCount: number
    totalAmount: number
    paidAmount: number
    outstandingAmount: number
    avgDaysToPayment: number
    collectionRate: string
  }
  statusBreakdown: Array<{
    status: string
    count: number
    totalAmount: number
    avgAmount: number
  }>
  aging: Array<{
    bucket: string
    count: number
    totalAmount: number
  }>
  unpaidInvoices: Array<{
    id: string
    invoiceNumber: string
    totalAmount: number
    dueDate: string
    status: string
    daysOverdue: number
    customerId: string
    customerName: string
    jobNumber: string
    jobDescription: string
  }>
  paymentTrend: Array<{
    month: string
    paidCount: number
    paidAmount: number
    avgDaysToPayment: number
  }>
  customerPaymentPerformance: Array<{
    id: string
    name: string
    totalInvoices: number
    paidInvoices: number
    totalInvoiced: number
    totalPaid: number
    outstanding: number
    avgPaymentDays: number
    paymentRate: string
  }>
}

export function generateInvoiceSummaryReportPDF(data: InvoiceSummaryData) {
  const doc = new jsPDF()
  let yPosition = 20

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatPercentage = (value: number) => {
    return `${(value || 0).toFixed(1)}%`
  }

  // Header
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Ortmeier Technical Service', 105, yPosition, { align: 'center' })
  yPosition += 10

  doc.setFontSize(16)
  doc.text('Invoice Summary Report', 105, yPosition, { align: 'center' })
  yPosition += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `Period: ${formatDate(data.period.start)} - ${formatDate(data.period.end)}`,
    105,
    yPosition,
    { align: 'center' }
  )
  yPosition += 8

  doc.setFontSize(8)
  doc.text(
    `Generated on: ${new Date().toLocaleString()}`,
    105,
    yPosition,
    { align: 'center' }
  )
  yPosition += 15

  // Summary Section
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Invoice Summary', 14, yPosition)
  yPosition += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  
  const summaryData = [
    ['Total Invoices:', data.summary.totalInvoices.toString()],
    ['Total Amount:', formatCurrency(data.summary.totalAmount || 0)],
    ['Paid Amount:', formatCurrency(data.summary.paidAmount || 0)],
    ['Outstanding:', formatCurrency(data.summary.outstandingAmount || 0)],
    ['Collection Rate:', `${data.summary.collectionRate}%`],
    ['Avg Days to Pay:', data.summary.avgDaysToPayment.toFixed(1)]
  ]

  const leftColumn = summaryData.slice(0, 3)
  const rightColumn = summaryData.slice(3)

  leftColumn.forEach((item, index) => {
    doc.setFont('helvetica', 'bold')
    doc.text(item[0], 14, yPosition + (index * 6))
    doc.setFont('helvetica', 'normal')
    doc.text(item[1], 70, yPosition + (index * 6))
  })

  rightColumn.forEach((item, index) => {
    doc.setFont('helvetica', 'bold')
    doc.text(item[0], 110, yPosition + (index * 6))
    doc.setFont('helvetica', 'normal')
    doc.text(item[1], 165, yPosition + (index * 6))
  })

  yPosition += 25

  // Invoices by Status
  if (data.statusBreakdown && data.statusBreakdown.length > 0) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Invoices by Status', 14, yPosition)
    yPosition += 5

    const totalAmount = data.statusBreakdown.reduce((sum, item) => sum + item.totalAmount, 0)

    autoTable(doc, {
      startY: yPosition,
      head: [['Status', 'Count', 'Amount', 'Avg Amount']],
      body: data.statusBreakdown.map(item => [
        item.status,
        item.count.toString(),
        formatCurrency(item.totalAmount || 0),
        formatCurrency(item.avgAmount || 0)
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [0, 242, 195],
        fontSize: 10
      },
      styles: {
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 50, halign: 'right' },
        3: { cellWidth: 40, halign: 'center' }
      }
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10
  }

  // Aging Report
  if (data.aging && data.aging.length > 0) {
    if (yPosition > 200) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Accounts Receivable Aging', 14, yPosition)
    yPosition += 5

    const totalAging = data.aging.reduce((sum, item) => sum + item.totalAmount, 0)

    autoTable(doc, {
      startY: yPosition,
      head: [['Days Outstanding', 'Count', 'Amount', 'Percentage']],
      body: data.aging.map(item => [
        item.bucket === 'current' ? 'Current' : item.bucket + ' days',
        item.count.toString(),
        formatCurrency(item.totalAmount || 0),
        formatPercentage(totalAging > 0 ? (item.totalAmount / totalAging) * 100 : 0)
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [253, 93, 147],
        fontSize: 10
      },
      styles: {
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 50, halign: 'right' },
        3: { cellWidth: 40, halign: 'center' }
      }
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10
  }

  // Top Outstanding Invoices
  if (data.unpaidInvoices && data.unpaidInvoices.length > 0) {
    if (yPosition > 180) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Outstanding Invoices', 14, yPosition)
    yPosition += 5

    autoTable(doc, {
      startY: yPosition,
      head: [['Invoice #', 'Customer', 'Amount', 'Due Date', 'Days Overdue']],
      body: data.unpaidInvoices.slice(0, 10).map(item => [
        item.invoiceNumber,
        item.customerName,
        formatCurrency(item.totalAmount || 0),
        new Date(item.dueDate).toLocaleDateString(),
        item.daysOverdue > 0 ? `${item.daysOverdue} days` : 'Current'
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [253, 93, 147],
        fontSize: 10
      },
      styles: {
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 53 },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 30 },
        4: { cellWidth: 25, halign: 'center' }
      }
    })

    if (data.unpaidInvoices.length > 10) {
      yPosition = (doc as any).lastAutoTable.finalY + 5
      doc.setFontSize(8)
      doc.setFont('helvetica', 'italic')
      doc.text(`Showing 10 of ${data.unpaidInvoices.length} outstanding invoices`, 14, yPosition)
    }

    yPosition = (doc as any).lastAutoTable.finalY + 10
  }

  // Payment Trend
  if (data.paymentTrend && data.paymentTrend.length > 0) {
    if (yPosition > 180) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Payment Collection Trend', 14, yPosition)
    yPosition += 5

    autoTable(doc, {
      startY: yPosition,
      head: [['Month', 'Paid Invoices', 'Amount Collected', 'Avg Days to Pay']],
      body: data.paymentTrend.map(item => [
        item.month,
        item.paidCount.toString(),
        formatCurrency(item.paidAmount || 0),
        `${item.avgDaysToPayment.toFixed(1)} days`
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [29, 140, 248],
        fontSize: 10
      },
      styles: {
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 50, halign: 'right' },
        3: { cellWidth: 40, halign: 'center' }
      }
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10
  }

  // Customer Payment Performance
  if (data.customerPaymentPerformance && data.customerPaymentPerformance.length > 0) {
    if (yPosition > 180) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Customer Payment Performance', 14, yPosition)
    yPosition += 5

    autoTable(doc, {
      startY: yPosition,
      head: [['Customer', 'Invoices', 'Outstanding', 'Payment Rate']],
      body: data.customerPaymentPerformance.slice(0, 10).map(item => [
        item.name,
        `${item.paidInvoices}/${item.totalInvoices}`,
        formatCurrency(item.outstanding || 0),
        `${item.paymentRate}%`
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [156, 39, 176],
        fontSize: 10
      },
      styles: {
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 35, halign: 'center' },
        2: { cellWidth: 45, halign: 'right' },
        3: { cellWidth: 30, halign: 'center' }
      }
    })

    if (data.customerPaymentPerformance.length > 10) {
      yPosition = (doc as any).lastAutoTable.finalY + 5
      doc.setFontSize(8)
      doc.setFont('helvetica', 'italic')
      doc.text(`Showing 10 of ${data.customerPaymentPerformance.length} customers`, 14, yPosition)
    }
  }

  // Add footer
  const pageCount = (doc as any).getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Page ${i} of ${pageCount}`,
      105,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    )
  }

  // Generate filename
  const fileName = `invoice-summary-report-${data.period.label}-${new Date().toISOString().split('T')[0]}.pdf`
  
  // Save the PDF
  doc.save(fileName)
}