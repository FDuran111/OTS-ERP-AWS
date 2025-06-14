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

    // Revenue this period (from paid invoices)
    const revenueResult = await prisma.invoice.aggregate({
      where: {
        status: 'PAID',
        paidDate: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        totalAmount: true
      },
      _count: {
        id: true
      }
    })

    const revenue = revenueResult._sum.totalAmount || 0
    const paidInvoiceCount = revenueResult._count || 0

    // Jobs completed this period
    const completedJobs = await prisma.job.count({
      where: {
        status: 'COMPLETED',
        completedAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    // Average job value (from completed jobs with billed amounts)
    const completedJobsWithBilling = await prisma.job.aggregate({
      where: {
        status: 'COMPLETED',
        completedAt: {
          gte: startDate,
          lte: endDate
        },
        billedAmount: {
          gt: 0
        }
      },
      _avg: {
        billedAmount: true
      },
      _count: {
        id: true
      }
    })

    const averageJobValue = completedJobsWithBilling._avg.billedAmount || 0

    // Outstanding invoices (not paid)
    const outstandingInvoices = await prisma.invoice.aggregate({
      where: {
        status: {
          in: ['SENT', 'OVERDUE']
        }
      },
      _sum: {
        totalAmount: true
      },
      _count: {
        id: true
      }
    })

    const outstandingAmount = outstandingInvoices._sum.totalAmount || 0
    const outstandingCount = outstandingInvoices._count || 0

    return NextResponse.json({
      revenueThisPeriod: revenue,
      jobsCompleted: completedJobs,
      averageJobValue: averageJobValue,
      outstandingInvoices: outstandingAmount,
      details: {
        paidInvoiceCount,
        outstandingInvoiceCount: outstandingCount,
        completedJobsWithBillingCount: completedJobsWithBilling._count
      },
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        range: timeRange
      }
    })
  } catch (error) {
    console.error('Error generating quick stats:', error)
    return NextResponse.json(
      { error: 'Failed to generate quick stats' },
      { status: 500 }
    )
  }
}