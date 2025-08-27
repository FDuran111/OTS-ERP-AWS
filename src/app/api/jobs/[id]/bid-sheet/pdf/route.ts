import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { query } from '@/lib/db'
import { getStorage } from '@/lib/storage'
import { bucketFor, keyFor } from '@/lib/file-keys'
import { urlFor } from '@/lib/file-urls'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let user
    try {
      user = verifyToken(token)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const jobId = resolvedParams.id
    const bidData = await request.json()

    // Create PDF
    const doc = new jsPDF()
    
    // Company Header
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('Ortmeier Electrical', 105, 20, { align: 'center' })
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text('Professional Electrical Services', 105, 30, { align: 'center' })
    
    // Title
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('BID SHEET', 105, 45, { align: 'center' })
    
    // Job Information Section
    let yPos = 60
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Job Information', 20, yPos)
    
    yPos += 10
    doc.setFont('helvetica', 'normal')
    doc.text(`Job Number: ${bidData.jobNumber}`, 20, yPos)
    doc.text(`Date: ${new Date(bidData.bidDate).toLocaleDateString()}`, 120, yPos)
    
    yPos += 8
    doc.text(`Project Type: ${bidData.projectType}`, 20, yPos)
    doc.text(`Priority: ${bidData.priority}`, 120, yPos)
    
    yPos += 8
    doc.text(`Valid Until: ${new Date(bidData.validUntil).toLocaleDateString()}`, 20, yPos)
    
    if (bidData.jobDescription) {
      yPos += 8
      const jobDescLines = doc.splitTextToSize(`Description: ${bidData.jobDescription}`, 170)
      doc.text(jobDescLines, 20, yPos)
      yPos += jobDescLines.length * 5
    }
    
    // Customer Information Section
    yPos += 10
    doc.setFont('helvetica', 'bold')
    doc.text('Customer Information', 20, yPos)
    
    yPos += 10
    doc.setFont('helvetica', 'normal')
    doc.text(`Customer: ${bidData.customerName}`, 20, yPos)
    
    if (bidData.customerAddress) {
      yPos += 8
      const addressLines = doc.splitTextToSize(`Address: ${bidData.customerAddress}`, 170)
      doc.text(addressLines, 20, yPos)
      yPos += addressLines.length * 5
    }
    
    if (bidData.contactPerson || bidData.contactPhone || bidData.contactEmail) {
      yPos += 5
      let contactInfo = []
      if (bidData.contactPerson) contactInfo.push(`Contact: ${bidData.contactPerson}`)
      if (bidData.contactPhone) contactInfo.push(`Phone: ${bidData.contactPhone}`)
      if (bidData.contactEmail) contactInfo.push(`Email: ${bidData.contactEmail}`)
      
      contactInfo.forEach(info => {
        doc.text(info, 20, yPos)
        yPos += 6
      })
    }
    
    // Scope of Work Section
    if (bidData.scopeOfWork) {
      yPos += 10
      doc.setFont('helvetica', 'bold')
      doc.text('Scope of Work', 20, yPos)
      
      yPos += 10
      doc.setFont('helvetica', 'normal')
      const scopeLines = doc.splitTextToSize(bidData.scopeOfWork, 170)
      doc.text(scopeLines, 20, yPos)
      yPos += scopeLines.length * 5
    }
    
    // Labor and Materials Description
    if (bidData.laborDescription || bidData.materialDescription) {
      yPos += 10
      if (bidData.laborDescription) {
        doc.setFont('helvetica', 'bold')
        doc.text('Labor Description:', 20, yPos)
        yPos += 8
        doc.setFont('helvetica', 'normal')
        const laborLines = doc.splitTextToSize(bidData.laborDescription, 170)
        doc.text(laborLines, 20, yPos)
        yPos += laborLines.length * 5 + 5
      }
      
      if (bidData.materialDescription) {
        doc.setFont('helvetica', 'bold')
        doc.text('Material Description:', 20, yPos)
        yPos += 8
        doc.setFont('helvetica', 'normal')
        const materialLines = doc.splitTextToSize(bidData.materialDescription, 170)
        doc.text(materialLines, 20, yPos)
        yPos += materialLines.length * 5
      }
    }
    
    // Check if we need a new page for the line items
    if (yPos > 200) {
      doc.addPage()
      yPos = 20
    }
    
    // Line Items Table
    yPos += 15
    const tableData = bidData.lineItems.map((item: any) => [
      item.description,
      item.quantity.toString(),
      item.unit,
      `$${item.unitPrice.toFixed(2)}`,
      `$${item.totalPrice.toFixed(2)}`
    ])
    
    doc.autoTable({
      head: [['Description', 'Qty', 'Unit', 'Unit Price', 'Total']],
      body: tableData,
      startY: yPos,
      theme: 'striped',
      headStyles: { fillColor: [66, 139, 202] },
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' }
      }
    })
    
    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.setFont('helvetica', 'normal')
    doc.text(`Subtotal: $${bidData.subtotal.toFixed(2)}`, 140, finalY)
    doc.text(`Tax (${bidData.taxRate}%): $${bidData.taxAmount.toFixed(2)}`, 140, finalY + 8)
    
    doc.setFont('helvetica', 'bold')
    doc.text(`Total: $${bidData.totalAmount.toFixed(2)}`, 140, finalY + 16)
    
    // Terms and Conditions
    let termsY = finalY + 30
    if (termsY > 250) {
      doc.addPage()
      termsY = 20
    }
    
    doc.setFont('helvetica', 'bold')
    doc.text('Terms and Conditions', 20, termsY)
    
    termsY += 10
    doc.setFont('helvetica', 'normal')
    doc.text(`Payment Terms: ${bidData.paymentTerms}`, 20, termsY)
    
    termsY += 8
    const warrantyLines = doc.splitTextToSize(`Warranty: ${bidData.warrantyTerms}`, 170)
    doc.text(warrantyLines, 20, termsY)
    termsY += warrantyLines.length * 5
    
    if (bidData.notes) {
      termsY += 10
      doc.setFont('helvetica', 'bold')
      doc.text('Additional Notes:', 20, termsY)
      termsY += 8
      doc.setFont('helvetica', 'normal')
      const notesLines = doc.splitTextToSize(bidData.notes, 170)
      doc.text(notesLines, 20, termsY)
    }
    
    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    
    // Save PDF to storage and create file record
    const fileName = `bid-sheet-${bidData.jobNumber}-${Date.now()}.pdf`
    const storage = getStorage()
    
    // Generate key for the file
    const key = keyFor('jobs', [bidData.jobNumber, fileName])
    const bucket = bucketFor('jobs')
    
    // Upload PDF to storage
    const uploadResult = await storage.upload({
      bucket,
      key,
      contentType: 'application/pdf',
      body: pdfBuffer
    })
    
    // Get URL for the uploaded file
    const fileUrl = await urlFor('jobs', uploadResult.key, { forceSigned: true })
    const filePath = uploadResult.key
    
    // Create file record in database
    const fileResult = await query(`
      INSERT INTO "FileAttachment" (
        "fileName", "originalName", "mimeType", "fileSize", "fileExtension",
        "filePath", "fileUrl", "isImage", "uploadedBy", "category"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      fileName,
      fileName,
      'application/pdf',
      pdfBuffer.length,
      '.pdf',
      filePath,
      fileUrl,
      false,
      user.id,
      'jobs'
    ])
    
    const fileRecord = fileResult.rows[0]
    
    // Attach the PDF to the job
    await query(`
      INSERT INTO "JobAttachment" (
        "jobId", "fileId", "attachmentType", "category", "description", "isPrimary"
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      jobId,
      fileRecord.id,
      'BID_SHEET',
      'DOCUMENTATION',
      'Auto-generated bid sheet PDF',
      false
    ])
    
    // Return the PDF as a download
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    })
    
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}