import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

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

    // Get revenue from paid invoices
    const paidInvoices = await prisma.invoice.findMany({
      where: {
        status: 'PAID',
        paidDate: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        job: {
          select: {
            jobType: true,
            description: true
          }
        },
        customer: {
          select: {
            firstName: true,
            lastName: true,
            companyName: true
          }
        }
      }
    })

    // Calculate total revenue
    const totalRevenue = paidInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0)

    // Revenue by job type
    const revenueByJobType: Record<string, number> = {}
    paidInvoices.forEach(invoice => {
      const jobType = invoice.job.jobType || 'Other'
      revenueByJobType[jobType] = (revenueByJobType[jobType] || 0) + invoice.totalAmount
    })

    // Monthly breakdown (last 12 months)
    const monthlyRevenue = []
    for (let i = 11; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i))
      const monthEnd = endOfMonth(subMonths(now, i))
      
      const monthlyInvoices = await prisma.invoice.findMany({
        where: {
          status: 'PAID',
          paidDate: {
            gte: monthStart,
            lte: monthEnd
          }
        }
      })
      
      const monthlyTotal = monthlyInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0)
      
      monthlyRevenue.push({
        month: format(monthStart, 'MMM yyyy'),
        revenue: monthlyTotal,
        invoiceCount: monthlyInvoices.length
      })
    }

    // Top customers by revenue
    const customerRevenue: Record<string, { revenue: number, invoiceCount: number, name: string }> = {}
    paidInvoices.forEach(invoice => {
      const customerName = invoice.customer.companyName || 
        `${invoice.customer.firstName} ${invoice.customer.lastName}`
      
      if (!customerRevenue[invoice.customerId]) {
        customerRevenue[invoice.customerId] = {
          revenue: 0,
          invoiceCount: 0,
          name: customerName
        }
      }
      
      customerRevenue[invoice.customerId].revenue += invoice.totalAmount
      customerRevenue[invoice.customerId].invoiceCount += 1
    })

    const topCustomers = Object.entries(customerRevenue)
      .map(([customerId, data]) => ({
        customerId,
        ...data
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    return NextResponse.json({
      totalRevenue,
      invoiceCount: paidInvoices.length,
      averageInvoiceValue: paidInvoices.length > 0 ? totalRevenue / paidInvoices.length : 0,
      revenueByJobType,
      monthlyRevenue,
      topCustomers,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        range: timeRange
      }
    })
  } catch (error) {
    console.error('Error generating revenue report:', error)
    return NextResponse.json(
      { error: 'Failed to generate revenue report' },
      { status: 500 }
    )
  }
}