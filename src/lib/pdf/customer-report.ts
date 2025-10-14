import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface CustomerReportData {
  period: {
    start: string
    end: string
    label: string
  }
  summary: {
    totalCustomers: number
    activeCustomers: number
    totalJobs: number
    totalRevenue: number
    avgJobValue: number
    customerRetentionRate: number | string
  }
  topCustomers: Array<{
    id: string
    name: string
    email?: string
    phone?: string
    jobCount: number
    totalRevenue: number
    avgJobValue: number
    lastJobDate: string
  }>
  customerTypes?: Array<{
    type: string
    customerCount: number
    jobCount: number
    totalRevenue: number
  }>
  monthlyTrend: Array<{
    month: string
    activeCustomers: number
    jobCount: number
    revenue: number
    avgJobValue: number
  }>
  geographic?: Array<{
    city: string
    state: string
    customerCount: number
    jobCount: number
    totalRevenue: number
  }>
}

export function generateCustomerReportPDF(data: CustomerReportData) {
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
  doc.text('{{COMPANY_NAME}}', 105, yPosition, { align: 'center' })
  yPosition += 10

  doc.setFontSize(16)
  doc.text('Customer Report', 105, yPosition, { align: 'center' })
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
  doc.text('Customer Summary', 14, yPosition)
  yPosition += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  
  // Calculate new customers from customerTypes if available
  const newCustomers = data.customerTypes?.find(t => t.type === 'new')?.customerCount || 0
  
  const summaryData = [
    ['Total Customers:', data.summary.totalCustomers.toString()],
    ['Active Customers:', data.summary.activeCustomers.toString()],
    ['New Customers:', newCustomers.toString()],
    ['Total Jobs:', data.summary.totalJobs.toString()],
    ['Total Revenue:', formatCurrency(data.summary.totalRevenue || 0)],
    ['Retention Rate:', typeof data.summary.customerRetentionRate === 'string' 
      ? `${data.summary.customerRetentionRate}%` 
      : formatPercentage(data.summary.customerRetentionRate)]
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

  // Top Customers
  if (data.topCustomers && data.topCustomers.length > 0) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Top Customers', 14, yPosition)
    yPosition += 5

    autoTable(doc, {
      startY: yPosition,
      head: [['Customer', 'Jobs', 'Revenue', 'Avg Job', 'Last Job']],
      body: data.topCustomers.slice(0, 15).map(item => [
        item.name,
        item.jobCount.toString(),
        formatCurrency(item.totalRevenue || 0),
        formatCurrency(item.avgJobValue || 0),
        new Date(item.lastJobDate).toLocaleDateString()
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
        0: { cellWidth: 60 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30 }
      }
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10
  }

  // Monthly Trend
  if (data.monthlyTrend && data.monthlyTrend.length > 0) {
    if (yPosition > 200) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Monthly Customer Activity', 14, yPosition)
    yPosition += 5

    autoTable(doc, {
      startY: yPosition,
      head: [['Month', 'Active Customers', 'Jobs', 'Revenue', 'Avg Job Value']],
      body: data.monthlyTrend.map(item => [
        item.month,
        item.activeCustomers.toString(),
        item.jobCount.toString(),
        formatCurrency(item.revenue || 0),
        formatCurrency(item.avgJobValue || 0)
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
        0: { cellWidth: 40 },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 40, halign: 'right' },
        4: { cellWidth: 35, halign: 'right' }
      }
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10
  }

  // Customer Types
  if (data.customerTypes && data.customerTypes.length > 0) {
    if (yPosition > 200) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Customer Types', 14, yPosition)
    yPosition += 5

    autoTable(doc, {
      startY: yPosition,
      head: [['Type', 'Customers', 'Jobs', 'Revenue']],
      body: data.customerTypes.map(item => [
        item.type.charAt(0).toUpperCase() + item.type.slice(1),
        item.customerCount.toString(),
        item.jobCount.toString(),
        formatCurrency(item.totalRevenue || 0)
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
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 50, halign: 'right' },
        3: { cellWidth: 30, halign: 'center' }
      }
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10
  }

  // Geographic Distribution
  if (data.geographic && data.geographic.length > 0) {
    if (yPosition > 180) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Geographic Distribution', 14, yPosition)
    yPosition += 5

    autoTable(doc, {
      startY: yPosition,
      head: [['City', 'State', 'Customers', 'Jobs', 'Revenue']],
      body: data.geographic.slice(0, 15).map(item => [
        item.city,
        item.state,
        item.customerCount.toString(),
        item.jobCount.toString(),
        formatCurrency(item.totalRevenue || 0)
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [255, 193, 7],
        fontSize: 10
      },
      styles: {
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 30 },
        2: { cellWidth: 35, halign: 'center' },
        3: { cellWidth: 30, halign: 'center' },
        4: { cellWidth: 35, halign: 'right' }
      }
    })

    if (data.geographic.length > 15) {
      yPosition = (doc as any).lastAutoTable.finalY + 5
      doc.setFontSize(8)
      doc.setFont('helvetica', 'italic')
      doc.text(`Showing 15 of ${data.geographic.length} locations`, 14, yPosition)
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
  const fileName = `customer-report-${data.period.label}-${new Date().toISOString().split('T')[0]}.pdf`
  
  // Save the PDF
  doc.save(fileName)
}