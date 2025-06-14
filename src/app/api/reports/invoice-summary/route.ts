import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, differenceInDays } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || 'month'
    
    const now = new Date()
    let startDate: Date
    let endDate: Date = now
    
    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default: // month
        startDate = startOfMonth(now)
        endDate = endOfMonth(now)
    }

    // Get all invoices with related data
    const invoices = await prisma.invoice.findMany({
      include: {
        job: {
          select: {
            jobNumber: true,
            description: true,
            jobType: true
          }
        },
        customer: {
          select: {
            firstName: true,
            lastName: true,
            companyName: true,
            email: true
          }
        },
        lineItems: true
      }
    })

    // Filter invoices in time period for some metrics
    const invoicesInPeriod = invoices.filter(invoice =>
      invoice.createdAt >= startDate && invoice.createdAt <= endDate
    )

    // Calculate invoice statistics
    const totalInvoices = invoices.length
    const invoicesThisPeriod = invoicesInPeriod.length

    // Status breakdown
    const invoicesByStatus = {
      DRAFT: invoices.filter(inv => inv.status === 'DRAFT').length,
      SENT: invoices.filter(inv => inv.status === 'SENT').length,
      PAID: invoices.filter(inv => inv.status === 'PAID').length,
      OVERDUE: invoices.filter(inv => inv.status === 'OVERDUE').length,
      CANCELLED: invoices.filter(inv => inv.status === 'CANCELLED').length
    }

    // Financial metrics
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
    const paidAmount = invoices
      .filter(inv => inv.status === 'PAID')
      .reduce((sum, inv) => sum + inv.totalAmount, 0)
    const outstandingAmount = invoices
      .filter(inv => ['SENT', 'OVERDUE'].includes(inv.status))
      .reduce((sum, inv) => sum + inv.totalAmount, 0)
    const overdueAmount = invoices
      .filter(inv => inv.status === 'OVERDUE')
      .reduce((sum, inv) => sum + inv.totalAmount, 0)

    // Payment metrics
    const paidInvoices = invoices.filter(inv => inv.status === 'PAID' && inv.sentDate && inv.paidDate)
    const averagePaymentDays = paidInvoices.length > 0
      ? paidInvoices.reduce((sum, inv) => {
          return sum + differenceInDays(inv.paidDate!, inv.sentDate!)
        }, 0) / paidInvoices.length
      : 0

    // Outstanding invoices detail
    const outstandingInvoices = invoices
      .filter(inv => ['SENT', 'OVERDUE'].includes(inv.status))
      .map(invoice => {
        const customerName = invoice.customer.companyName || 
          `${invoice.customer.firstName} ${invoice.customer.lastName}`
        
        const daysOutstanding = invoice.sentDate 
          ? differenceInDays(now, invoice.sentDate)
          : 0

        return {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customerName,
          customerEmail: invoice.customer.email,
          amount: invoice.totalAmount,
          dueDate: invoice.dueDate,
          sentDate: invoice.sentDate,
          status: invoice.status,
          daysOutstanding,
          jobNumber: invoice.job.jobNumber,
          jobDescription: invoice.job.description
        }
      })
      .sort((a, b) => b.daysOutstanding - a.daysOutstanding)

    // Recent payments
    const recentPayments = invoices
      .filter(inv => inv.status === 'PAID' && inv.paidDate)
      .sort((a, b) => (b.paidDate?.getTime() || 0) - (a.paidDate?.getTime() || 0))
      .slice(0, 10)
      .map(invoice => {
        const customerName = invoice.customer.companyName || 
          `${invoice.customer.firstName} ${invoice.customer.lastName}`

        const paymentDays = invoice.sentDate && invoice.paidDate
          ? differenceInDays(invoice.paidDate, invoice.sentDate)
          : null

        return {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customerName,
          amount: invoice.totalAmount,
          paidDate: invoice.paidDate,
          paymentDays,
          jobNumber: invoice.job.jobNumber
        }
      })

    // Revenue by month (last 12 months)
    const monthlyRevenue = []
    for (let i = 11; i >= 0; i--) {
      const monthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - i, 1))
      const monthEnd = endOfMonth(monthStart)
      
      const monthlyPaidInvoices = invoices.filter(inv =>
        inv.status === 'PAID' && 
        inv.paidDate && 
        inv.paidDate >= monthStart && 
        inv.paidDate <= monthEnd
      )
      
      const monthlyTotal = monthlyPaidInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
      
      monthlyRevenue.push({
        month: monthStart.toISOString().substring(0, 7), // YYYY-MM format
        revenue: monthlyTotal,
        invoiceCount: monthlyPaidInvoices.length
      })
    }

    // Average invoice value
    const averageInvoiceValue = totalInvoices > 0 ? totalAmount / totalInvoices : 0

    // Collection rate
    const sentOrPaidInvoices = invoices.filter(inv => ['SENT', 'PAID', 'OVERDUE'].includes(inv.status))
    const collectionRate = sentOrPaidInvoices.length > 0
      ? (invoicesByStatus.PAID / sentOrPaidInvoices.length) * 100
      : 0

    return NextResponse.json({
      summary: {
        totalInvoices,
        invoicesThisPeriod,
        totalAmount,
        paidAmount,
        outstandingAmount,
        overdueAmount,
        averageInvoiceValue,
        averagePaymentDays,
        collectionRate
      },
      invoicesByStatus,
      outstandingInvoices,
      recentPayments,
      monthlyRevenue,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        range: timeRange
      }
    })
  } catch (error) {
    console.error('Error generating invoice summary report:', error)
    return NextResponse.json(
      { error: 'Failed to generate invoice summary report' },
      { status: 500 }
    )
  }
}