import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface JobPerformanceData {
  period: {
    start: string
    end: string
    label: string
  }
  summary: {
    totalJobs: number
    completedJobs: number
    cancelledJobs?: number
    inProgressJobs?: number
    scheduledJobs?: number
    completionRate: number | string
    avgProfitMargin?: number
    avgCostVariance?: number
  }
  jobsByStatus: Array<{
    status: string
    jobCount: number
    avgCompletionDays?: number
    delayedJobs?: number
    onTimeJobs?: number
  }>
  jobsByType: Array<{
    type: string
    jobCount: number
    avgRevenue?: number
    avgCost?: number
    avgCompletionDays?: number
  }>
  weeklyTrend: Array<{
    week: string
    jobCount: number
    completedCount: number
    completionRate: number | string
    avgRevenue?: number
  }>
  topPerformers: Array<{
    id?: string
    name: string
    jobsAssigned?: number
    jobsCompleted: number
    completionRate?: number | string
    avgJobRevenue?: number
  }>
}

export function generateJobPerformanceReportPDF(data: JobPerformanceData) {
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

  const formatPercentage = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    return `${(numValue || 0).toFixed(1)}%`
  }

  // Header
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('{{COMPANY_NAME}}', 105, yPosition, { align: 'center' })
  yPosition += 10

  doc.setFontSize(16)
  doc.text('Job Performance Report', 105, yPosition, { align: 'center' })
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
  doc.text('Performance Summary', 14, yPosition)
  yPosition += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  
  const summaryData = [
    ['Total Jobs:', data.summary.totalJobs.toString()],
    ['Completed Jobs:', data.summary.completedJobs.toString()],
    ['Completion Rate:', formatPercentage(data.summary.completionRate)],
    ['In Progress:', (data.summary.inProgressJobs || 0).toString()],
    ['Scheduled:', (data.summary.scheduledJobs || 0).toString()],
    ['Avg Profit Margin:', formatPercentage(data.summary.avgProfitMargin || 0)]
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

  // Jobs by Status
  if (data.jobsByStatus && data.jobsByStatus.length > 0) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Jobs by Status', 14, yPosition)
    yPosition += 5

    autoTable(doc, {
      startY: yPosition,
      head: [['Status', 'Count', 'Avg Days', 'On Time', 'Delayed']],
      body: data.jobsByStatus.map(item => [
        item.status,
        item.jobCount.toString(),
        `${(item.avgCompletionDays || 0).toFixed(1)}`,
        (item.onTimeJobs || 0).toString(),
        (item.delayedJobs || 0).toString()
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [0, 191, 154],
        fontSize: 10
      },
      styles: {
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 30, halign: 'center' },
        4: { cellWidth: 30, halign: 'center' }
      }
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10
  }

  // Jobs by Type
  if (data.jobsByType && data.jobsByType.length > 0) {
    if (yPosition > 220) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Performance by Job Type', 14, yPosition)
    yPosition += 5

    autoTable(doc, {
      startY: yPosition,
      head: [['Type', 'Jobs', 'Avg Duration', 'Avg Revenue']],
      body: data.jobsByType.map(item => [
        item.type || 'Unspecified',
        item.jobCount.toString(),
        `${(item.avgCompletionDays || 0).toFixed(1)} days`,
        formatCurrency(item.avgRevenue || 0)
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [0, 191, 154],
        fontSize: 10
      },
      styles: {
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 45, halign: 'center' },
        3: { cellWidth: 45, halign: 'right' }
      }
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10
  }

  // Weekly Performance Trend
  if (data.weeklyTrend && data.weeklyTrend.length > 0) {
    if (yPosition > 200) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Weekly Performance Trend', 14, yPosition)
    yPosition += 5

    autoTable(doc, {
      startY: yPosition,
      head: [['Week', 'Total Jobs', 'Completed', 'Completion Rate', 'Avg Revenue']],
      body: data.weeklyTrend.map(item => [
        `Week ${item.week}`,
        item.jobCount.toString(),
        item.completedCount.toString(),
        formatPercentage(item.completionRate),
        formatCurrency(item.avgRevenue || 0)
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [0, 191, 154],
        fontSize: 10
      },
      styles: {
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 35, halign: 'center' },
        2: { cellWidth: 35, halign: 'center' },
        3: { cellWidth: 40, halign: 'center' },
        4: { cellWidth: 35, halign: 'right' }
      }
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10
  }

  // Top Performers
  if (data.topPerformers && data.topPerformers.length > 0) {
    if (yPosition > 200) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Top Performing Employees', 14, yPosition)
    yPosition += 5

    autoTable(doc, {
      startY: yPosition,
      head: [['Employee', 'Jobs Assigned', 'Jobs Completed', 'Completion %', 'Avg Revenue']],
      body: data.topPerformers.map(item => [
        item.name,
        (item.jobsAssigned || 0).toString(),
        item.jobsCompleted.toString(),
        formatPercentage(item.completionRate || 0),
        formatCurrency(item.avgJobRevenue || 0)
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [225, 78, 202],
        fontSize: 10
      },
      styles: {
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 32, halign: 'center' },
        2: { cellWidth: 32, halign: 'center' },
        3: { cellWidth: 30, halign: 'center' },
        4: { cellWidth: 30, halign: 'right' }
      }
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10
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
  const fileName = `job-performance-report-${data.period.label}-${new Date().toISOString().split('T')[0]}.pdf`
  
  // Save the PDF
  doc.save(fileName)
}