import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth } from 'date-fns'

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

    // Get all customers with their jobs and invoices
    const customers = await prisma.customer.findMany({
      include: {
        jobs: {
          include: {
            invoices: true
          }
        }
      }
    })

    // Calculate customer metrics
    const customerMetrics = customers.map(customer => {
      const customerName = customer.companyName || `${customer.firstName} ${customer.lastName}`
      
      // Jobs in time period
      const jobsInPeriod = customer.jobs.filter(job =>
        job.createdAt >= startDate && job.createdAt <= endDate
      )
      
      // All time stats
      const totalJobs = customer.jobs.length
      const completedJobs = customer.jobs.filter(job => job.status === 'COMPLETED').length
      const totalBilled = customer.jobs.reduce((sum, job) => sum + (job.billedAmount || 0), 0)
      
      // Invoice stats
      const allInvoices = customer.jobs.flatMap(job => job.invoices)
      const paidInvoices = allInvoices.filter(invoice => invoice.status === 'PAID')
      const outstandingInvoices = allInvoices.filter(invoice => 
        ['SENT', 'OVERDUE'].includes(invoice.status)
      )
      
      const totalPaid = paidInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0)
      const totalOutstanding = outstandingInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0)
      
      // Last job date
      const lastJobDate = customer.jobs.length > 0 
        ? new Date(Math.max(...customer.jobs.map(job => job.createdAt.getTime())))
        : null
      
      // Average job value
      const averageJobValue = completedJobs > 0 ? totalBilled / completedJobs : 0
      
      // Customer lifetime value
      const lifetimeValue = totalPaid + totalOutstanding
      
      return {
        customerId: customer.id,
        customerName,
        email: customer.email,
        phone: customer.phone,
        address: `${customer.street || ''} ${customer.city || ''} ${customer.state || ''}`.trim(),
        totalJobs,
        completedJobs,
        jobsInPeriod: jobsInPeriod.length,
        totalBilled,
        totalPaid,
        totalOutstanding,
        averageJobValue,
        lifetimeValue,
        lastJobDate,
        completionRate: totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0,
        outstandingInvoiceCount: outstandingInvoices.length,
        paidInvoiceCount: paidInvoices.length
      }
    })

    // Sort by different criteria
    const topCustomersByRevenue = [...customerMetrics]
      .sort((a, b) => b.lifetimeValue - a.lifetimeValue)
      .slice(0, 10)

    const topCustomersByJobs = [...customerMetrics]
      .sort((a, b) => b.totalJobs - a.totalJobs)
      .slice(0, 10)

    const customersWithOutstanding = customerMetrics
      .filter(customer => customer.totalOutstanding > 0)
      .sort((a, b) => b.totalOutstanding - a.totalOutstanding)
      .slice(0, 10)

    const recentCustomers = customerMetrics
      .filter(customer => customer.lastJobDate)
      .sort((a, b) => (b.lastJobDate?.getTime() || 0) - (a.lastJobDate?.getTime() || 0))
      .slice(0, 10)

    // Customer acquisition in time period
    const newCustomers = customers.filter(customer =>
      customer.createdAt >= startDate && customer.createdAt <= endDate
    ).length

    // Summary statistics
    const totalCustomers = customers.length
    const activeCustomers = customerMetrics.filter(customer => 
      customer.lastJobDate && 
      customer.lastJobDate >= new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) // Active in last 90 days
    ).length

    const totalLifetimeValue = customerMetrics.reduce((sum, customer) => sum + customer.lifetimeValue, 0)
    const averageLifetimeValue = totalCustomers > 0 ? totalLifetimeValue / totalCustomers : 0

    const totalOutstandingAmount = customerMetrics.reduce((sum, customer) => sum + customer.totalOutstanding, 0)
    const customersWithOutstandingCount = customerMetrics.filter(customer => customer.totalOutstanding > 0).length

    // Customer segments
    const customerSegments = {
      high_value: customerMetrics.filter(customer => customer.lifetimeValue >= 10000).length,
      medium_value: customerMetrics.filter(customer => customer.lifetimeValue >= 5000 && customer.lifetimeValue < 10000).length,
      low_value: customerMetrics.filter(customer => customer.lifetimeValue < 5000).length,
      repeat_customers: customerMetrics.filter(customer => customer.totalJobs > 1).length,
      single_job_customers: customerMetrics.filter(customer => customer.totalJobs === 1).length
    }

    return NextResponse.json({
      summary: {
        totalCustomers,
        activeCustomers,
        newCustomers,
        averageLifetimeValue,
        totalOutstandingAmount,
        customersWithOutstandingCount
      },
      customerSegments,
      topCustomersByRevenue,
      topCustomersByJobs,
      customersWithOutstanding,
      recentCustomers,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        range: timeRange
      }
    })
  } catch (error) {
    console.error('Error generating customer report:', error)
    return NextResponse.json(
      { error: 'Failed to generate customer report' },
      { status: 500 }
    )
  }
}