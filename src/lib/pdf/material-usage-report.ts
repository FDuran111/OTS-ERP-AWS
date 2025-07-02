import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface MaterialUsageData {
  period: {
    start: string
    end: string
    label: string
  }
  summary: {
    totalMaterials: number
    materialsUsed: number
    totalCost: number
    jobsWithMaterials: number
    avgCostPerUsage: number
  }
  materials?: Array<{
    id: string
    name: string
    category: string
    unit: string
    unitCost: number
    quantityInStock: number
    reorderLevel: number
    totalUsed: number
    jobsUsedIn: number
    totalCost: number
    avgQuantityPerJob: number
    stockStatus: string
  }>
  usageByCategory: Array<{
    category: string
    materialCount: number
    totalQuantity: number
    totalCost: number
    jobsCount: number
  }>
  usageByJobType: Array<{
    type: string
    materialTypesUsed: number
    totalCost: number
    jobCount: number
    avgMaterialCostPerJob: number
  }>
  topMaterials: Array<{
    id: string
    name: string
    category: string
    unit: string
    totalQuantity: number
    totalCost: number
    usageCount: number
  }>
  monthlyTrend: Array<{
    month: string
    uniqueMaterials: number
    totalCost: number
    jobsCount: number
  }>
  lowStockMaterials: Array<{
    id: string
    name: string
    category: string
    quantityInStock: number
    reorderLevel: number
    unitCost: number
    avgDailyUsage: number
    daysOfStock: number | null
  }>
}

export function generateMaterialUsageReportPDF(data: MaterialUsageData) {
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
  doc.text('Material Usage Report', 105, yPosition, { align: 'center' })
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
  doc.text('Usage Summary', 14, yPosition)
  yPosition += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  
  const summaryData = [
    ['Total Materials:', data.summary.totalMaterials.toString()],
    ['Materials Used:', data.summary.materialsUsed.toString()],
    ['Total Cost:', formatCurrency(data.summary.totalCost || 0)],
    ['Jobs with Materials:', data.summary.jobsWithMaterials.toString()],
    ['Avg Cost per Usage:', formatCurrency(data.summary.avgCostPerUsage || 0)],
    ['Usage Rate:', `${((data.summary.materialsUsed / data.summary.totalMaterials) * 100).toFixed(1)}%`]
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

  // Materials by Category
  if (data.usageByCategory && data.usageByCategory.length > 0) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Usage by Category', 14, yPosition)
    yPosition += 5

    const totalCategoryCost = data.usageByCategory.reduce((sum, cat) => sum + cat.totalCost, 0)

    autoTable(doc, {
      startY: yPosition,
      head: [['Category', 'Materials', 'Quantity', 'Total Cost', 'Percentage']],
      body: data.usageByCategory.map(item => [
        item.category || 'Uncategorized',
        item.materialCount.toString(),
        item.totalQuantity.toFixed(1),
        formatCurrency(item.totalCost || 0),
        formatPercentage(totalCategoryCost > 0 ? (item.totalCost / totalCategoryCost) * 100 : 0)
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
        0: { cellWidth: 50 },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 40, halign: 'right' },
        4: { cellWidth: 30, halign: 'center' }
      }
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10
  }

  // Top Materials
  if (data.topMaterials && data.topMaterials.length > 0) {
    if (yPosition > 200) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Top Materials Used', 14, yPosition)
    yPosition += 5

    autoTable(doc, {
      startY: yPosition,
      head: [['Material', 'Category', 'Quantity', 'Cost']],
      body: data.topMaterials.slice(0, 15).map(item => [
        item.name,
        item.category || 'Uncategorized',
        `${item.totalQuantity.toFixed(1)} ${item.unit}`,
        formatCurrency(item.totalCost || 0)
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
        0: { cellWidth: 70 },
        1: { cellWidth: 40 },
        2: { cellWidth: 35, halign: 'center' },
        3: { cellWidth: 35, halign: 'right' }
      }
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10
  }

  // Usage by Job Type
  if (data.usageByJobType && data.usageByJobType.length > 0) {
    if (yPosition > 200) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Material Usage by Job Type', 14, yPosition)
    yPosition += 5

    autoTable(doc, {
      startY: yPosition,
      head: [['Job Type', 'Materials Used', 'Jobs', 'Total Cost', 'Avg Cost/Job']],
      body: data.usageByJobType.map(item => [
        item.type || 'Unspecified',
        item.materialTypesUsed.toString(),
        item.jobCount.toString(),
        formatCurrency(item.totalCost || 0),
        formatCurrency(item.avgMaterialCostPerJob || 0)
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [255, 141, 114],
        fontSize: 10
      },
      styles: {
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 35, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 35, halign: 'right' }
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
    doc.text('Monthly Usage Trend', 14, yPosition)
    yPosition += 5

    autoTable(doc, {
      startY: yPosition,
      head: [['Month', 'Materials', 'Jobs', 'Total Cost']],
      body: data.monthlyTrend.map(item => [
        item.month,
        item.uniqueMaterials.toString(),
        item.jobsCount.toString(),
        formatCurrency(item.totalCost || 0)
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
        1: { cellWidth: 45, halign: 'right' },
        2: { cellWidth: 35, halign: 'center' },
        3: { cellWidth: 45, halign: 'right' }
      }
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10
  }

  // Low Stock Items
  if (data.lowStockMaterials && data.lowStockMaterials.length > 0) {
    if (yPosition > 200) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Low Stock Alert', 14, yPosition)
    yPosition += 5

    autoTable(doc, {
      startY: yPosition,
      head: [['Material', 'Category', 'Stock', 'Reorder Level', 'Days Left']],
      body: data.lowStockMaterials.map(item => [
        item.name,
        item.category || 'Uncategorized',
        `${item.quantityInStock.toFixed(1)}`,
        `${item.reorderLevel.toFixed(1)}`,
        item.daysOfStock !== null ? `${item.daysOfStock.toFixed(0)} days` : 'N/A'
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
        1: { cellWidth: 40 },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 30, halign: 'center' },
        4: { cellWidth: 25, halign: 'center' }
      }
    })

    if (data.lowStockMaterials.length > 10) {
      yPosition = (doc as any).lastAutoTable.finalY + 5
      doc.setFontSize(8)
      doc.setFont('helvetica', 'italic')
      doc.text(`Showing ${Math.min(10, data.lowStockMaterials.length)} of ${data.lowStockMaterials.length} low stock items`, 14, yPosition)
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
  const fileName = `material-usage-report-${data.period.label}-${new Date().toISOString().split('T')[0]}.pdf`
  
  // Save the PDF
  doc.save(fileName)
}