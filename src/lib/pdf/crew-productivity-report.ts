import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface CrewProductivityData {
  period: {
    start: string
    end: string
    label: string
  }
  metadata?: {
    hasActualHoursData: boolean
    defaultHoursUsed: boolean
    hoursPerAssignment?: number
  }
  summary: {
    totalCrew: number
    totalJobsWorked: number
    totalHoursWorked: number
    avgHoursPerAssignment: number
    completedJobs: number
    totalRevenue: number
    revenuePerHour: number
  }
  crewProductivity: Array<{
    id: string
    name: string
    role: string
    totalJobs: number
    completedJobs: number
    inProgressJobs: number
    scheduledJobs: number
    totalRevenue: number
    totalHours: number
    avgHoursPerJob: number
    daysWorked: number
    revenuePerHour: number
  }>
  crewUtilization: Array<{
    id: string
    name: string
    hoursWorked: number
    daysWorked: number
    utilizationRate: number
  }>
  crewByJobType: Array<{
    id: string
    name: string
    jobTypes: Array<{
      type: string
      jobCount: number
      avgHours: number
      completedCount: number
    }>
  }>
  dailyProductivity: Array<{
    date: string
    crewCount: number
    jobsWorked: number
    totalHours: number
    avgHoursPerAssignment: number
  }>
}

export function generateCrewProductivityReportPDF(data: CrewProductivityData) {
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

  const formatHours = (hours: number) => {
    return `${(hours || 0).toFixed(1)} hrs`
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
  doc.text('Crew Productivity Report', 105, yPosition, { align: 'center' })
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

  // Data Quality Notice
  if (data.metadata?.defaultHoursUsed) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(100, 100, 100)
    doc.text(
      `Note: Hours are estimated at ${data.metadata.hoursPerAssignment || 8} hours per job assignment.`,
      14,
      yPosition
    )
    doc.setTextColor(0, 0, 0)
    yPosition += 10
  }

  // Summary Section
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Productivity Summary', 14, yPosition)
  yPosition += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  
  const summaryData = [
    ['Total Crew Members:', data.summary.totalCrew.toString()],
    ['Total Hours Worked:', formatHours(data.summary.totalHoursWorked)],
    ['Jobs Worked:', data.summary.totalJobsWorked.toString()],
    ['Jobs Completed:', data.summary.completedJobs.toString()],
    ['Total Revenue:', formatCurrency(data.summary.totalRevenue)],
    ['Revenue per Hour:', formatCurrency(data.summary.revenuePerHour)]
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

  // Crew Performance Table
  if (data.crewProductivity && data.crewProductivity.length > 0) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Crew Performance Details', 14, yPosition)
    yPosition += 5

    autoTable(doc, {
      startY: yPosition,
      head: [['Name', 'Total Jobs', 'Completed', 'Hours', 'Revenue', '$/Hour']],
      body: data.crewProductivity.map(item => [
        item.name,
        item.totalJobs.toString(),
        item.completedJobs.toString(),
        formatHours(item.totalHours),
        formatCurrency(item.totalRevenue || 0),
        formatCurrency(item.revenuePerHour || 0)
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
        0: { cellWidth: 50 },
        1: { cellWidth: 28, halign: 'center' },
        2: { cellWidth: 28, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 30, halign: 'right' },
        5: { cellWidth: 25, halign: 'right' }
      }
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10
  }

  // Crew Utilization
  if (data.crewUtilization && data.crewUtilization.length > 0) {
    if (yPosition > 200) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Crew Utilization', 14, yPosition)
    yPosition += 5

    autoTable(doc, {
      startY: yPosition,
      head: [['Employee', 'Hours Worked', 'Days Worked', 'Utilization %']],
      body: data.crewUtilization.map(item => [
        item.name,
        formatHours(item.hoursWorked),
        item.daysWorked.toString(),
        formatPercentage(item.utilizationRate)
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
        0: { cellWidth: 70 },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 35, halign: 'center' },
        3: { cellWidth: 35, halign: 'center' }
      }
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10
  }

  // Daily Productivity Trend
  if (data.dailyProductivity && data.dailyProductivity.length > 0) {
    if (yPosition > 180) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Daily Productivity Summary', 14, yPosition)
    yPosition += 5

    // Show weekly summaries instead of daily to fit on page
    const weeklyData = []
    for (let i = 0; i < data.dailyProductivity.length; i += 7) {
      const weekData = data.dailyProductivity.slice(i, i + 7)
      const totalHours = weekData.reduce((sum, day) => sum + day.totalHours, 0)
      const totalJobs = weekData.reduce((sum, day) => sum + day.jobsWorked, 0)
      const avgCrews = weekData.reduce((sum, day) => sum + day.crewCount, 0) / weekData.length
      weeklyData.push({
        week: `Week of ${new Date(weekData[0].date).toLocaleDateString()}`,
        totalHours,
        totalJobs,
        avgCrews: avgCrews.toFixed(1)
      })
    }

    autoTable(doc, {
      startY: yPosition,
      head: [['Week', 'Total Hours', 'Jobs', 'Avg Crews']],
      body: weeklyData.slice(0, 8).map(item => [
        item.week,
        formatHours(item.totalHours),
        item.totalJobs.toString(),
        item.avgCrews
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
        0: { cellWidth: 80 },
        1: { cellWidth: 35, halign: 'center' },
        2: { cellWidth: 35, halign: 'center' },
        3: { cellWidth: 30, halign: 'center' }
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
  const fileName = `crew-productivity-report-${data.period.label}-${new Date().toISOString().split('T')[0]}.pdf`
  
  // Save the PDF
  doc.save(fileName)
}