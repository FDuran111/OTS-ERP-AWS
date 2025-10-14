import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface RevenueReportData {
  period: {
    start: string
    end: string
    label: string
  }
  summary: {
    totalJobs: number
    totalCustomers: number
    totalBilled: number
    totalEstimated: number
    totalCost: number
    avgJobValue: number
    profitMargin: number
  }
  revenueByStatus: Array<{
    status: string
    jobCount: number
    totalRevenue: number
  }>
  revenueByType: Array<{
    type: string
    jobCount: number
    totalRevenue: number
  }>
  monthlyTrend: Array<{
    month: string
    jobCount: number
    revenue: number
  }>
  topCustomers: Array<{
    customerName: string
    jobCount: number
    totalRevenue: number
  }>
  invoiceStatus: Array<{
    status: string
    count: number
    totalAmount: number
  }>
}

export function generateRevenueReportPDF(data: RevenueReportData) {
  const doc = new jsPDF()
  let yPosition = 20

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Helper function to format dates
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Add company header
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('{{COMPANY_NAME}}', 105, yPosition, { align: 'center' })
  yPosition += 10

  // Add report title
  doc.setFontSize(16)
  doc.text('Revenue Report', 105, yPosition, { align: 'center' })
  yPosition += 8

  // Add report period
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `Period: ${formatDate(data.period.start)} - ${formatDate(data.period.end)}`,
    105,
    yPosition,
    { align: 'center' }
  )
  yPosition += 8

  // Add generation date
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
  doc.text('Summary', 14, yPosition)
  yPosition += 8

  // Summary data in two columns
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  
  const summaryLeft = [
    ['Total Jobs:', data.summary.totalJobs.toString()],
    ['Total Customers:', data.summary.totalCustomers.toString()],
    ['Total Billed:', formatCurrency(data.summary.totalBilled)]
  ]
  
  const summaryRight = [
    ['Total Estimated:', formatCurrency(data.summary.totalEstimated || 0)],
    ['Average Job Value:', formatCurrency(data.summary.avgJobValue || 0)],
    ['Profit Margin:', data.summary.profitMargin !== undefined ? `${data.summary.profitMargin.toFixed(1)}%` : 'N/A']
  ]

  // Left column
  summaryLeft.forEach((item, index) => {
    doc.setFont('helvetica', 'bold')
    doc.text(item[0], 14, yPosition + (index * 6))
    doc.setFont('helvetica', 'normal')
    doc.text(item[1], 60, yPosition + (index * 6))
  })

  // Right column
  summaryRight.forEach((item, index) => {
    doc.setFont('helvetica', 'bold')
    doc.text(item[0], 110, yPosition + (index * 6))
    doc.setFont('helvetica', 'normal')
    doc.text(item[1], 160, yPosition + (index * 6))
  })

  yPosition += 25

  // Revenue by Status Table
  if (data.revenueByStatus.length > 0) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Revenue by Job Status', 14, yPosition)
    yPosition += 5

    autoTable(doc, {
      startY: yPosition,
      head: [['Status', 'Job Count', 'Revenue']],
      body: data.revenueByStatus.map(item => [
        item.status,
        item.jobCount.toString(),
        formatCurrency(item.totalRevenue)
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [33, 150, 243],
        fontSize: 10
      },
      styles: {
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 60, halign: 'right' }
      }
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10
  }

  // Top Customers Table
  if (data.topCustomers.length > 0) {
    // Check if we need a new page
    if (yPosition > 220) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Top Customers', 14, yPosition)
    yPosition += 5

    autoTable(doc, {
      startY: yPosition,
      head: [['Customer', 'Jobs', 'Revenue']],
      body: data.topCustomers.map(item => [
        item.customerName,
        item.jobCount.toString(),
        formatCurrency(item.totalRevenue)
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [33, 150, 243],
        fontSize: 10
      },
      styles: {
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 50, halign: 'right' }
      }
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10
  }

  // Monthly Trend Table
  if (data.monthlyTrend.length > 0) {
    // Check if we need a new page
    if (yPosition > 200) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Monthly Revenue Trend', 14, yPosition)
    yPosition += 5

    autoTable(doc, {
      startY: yPosition,
      head: [['Month', 'Job Count', 'Revenue']],
      body: data.monthlyTrend.map(item => [
        item.month,
        item.jobCount.toString(),
        formatCurrency(item.revenue)
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [33, 150, 243],
        fontSize: 10
      },
      styles: {
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 60, halign: 'right' }
      }
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10
  }

  // Invoice Status
  if (data.invoiceStatus.length > 0) {
    // Check if we need a new page
    if (yPosition > 200) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Invoice Status Summary', 14, yPosition)
    yPosition += 5

    autoTable(doc, {
      startY: yPosition,
      head: [['Status', 'Count', 'Amount']],
      body: data.invoiceStatus.map(item => [
        item.status,
        item.count.toString(),
        formatCurrency(item.totalAmount)
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
        0: { cellWidth: 80 },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 60, halign: 'right' }
      }
    })
  }

  // Add footer on last page
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

  // Generate filename with date
  const fileName = `revenue-report-${data.period.label}-${new Date().toISOString().split('T')[0]}.pdf`
  
  // Save the PDF
  doc.save(fileName)
}