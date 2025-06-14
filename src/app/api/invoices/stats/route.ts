import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth } from 'date-fns'

export async function GET() {
  try {
    const now = new Date()
    const startOfThisMonth = startOfMonth(now)
    const endOfThisMonth = endOfMonth(now)

    // Get total outstanding invoices (SENT + OVERDUE)
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

    // Get pending invoices (DRAFT)
    const pendingInvoices = await prisma.invoice.aggregate({
      where: {
        status: 'DRAFT'
      },
      _sum: {
        totalAmount: true
      },
      _count: {
        id: true
      }
    })

    // Get paid invoices this month
    const paidThisMonth = await prisma.invoice.aggregate({
      where: {
        status: 'PAID',
        paidDate: {
          gte: startOfThisMonth,
          lte: endOfThisMonth
        }
      },
      _sum: {
        totalAmount: true
      },
      _count: {
        id: true
      }
    })

    // Get overdue invoices specifically
    const overdueInvoices = await prisma.invoice.aggregate({
      where: {
        status: 'OVERDUE'
      },
      _sum: {
        totalAmount: true
      },
      _count: {
        id: true
      }
    })

    const stats = [
      {
        title: 'Total Outstanding',
        value: `$${(outstandingInvoices._sum.totalAmount || 0).toLocaleString()}`,
        icon: 'attach_money',
        color: '#1d8cf8',
        count: outstandingInvoices._count || 0
      },
      {
        title: 'Pending (Draft)',
        value: `${pendingInvoices._count || 0} invoices`,
        icon: 'pending_actions',
        color: '#fd5d93',
        amount: pendingInvoices._sum.totalAmount || 0
      },
      {
        title: 'Paid This Month',
        value: `$${(paidThisMonth._sum.totalAmount || 0).toLocaleString()}`,
        icon: 'check_circle',
        color: '#00bf9a',
        count: paidThisMonth._count || 0
      },
      {
        title: 'Overdue',
        value: `${overdueInvoices._count || 0} invoices`,
        icon: 'warning',
        color: '#ff8d72',
        amount: overdueInvoices._sum.totalAmount || 0
      }
    ]

    // Get recent invoices
    const recentInvoices = await prisma.invoice.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            companyName: true
          }
        },
        job: {
          select: {
            jobNumber: true
          }
        }
      }
    })

    const formattedRecentInvoices = recentInvoices.map(invoice => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      jobNumber: invoice.job.jobNumber,
      customerName: invoice.customer.companyName || 
        `${invoice.customer.firstName} ${invoice.customer.lastName}`,
      totalAmount: invoice.totalAmount,
      status: invoice.status,
      dueDate: invoice.dueDate.toISOString(),
      createdAt: invoice.createdAt.toISOString()
    }))

    return NextResponse.json({
      stats,
      recentInvoices: formattedRecentInvoices,
      details: {
        outstandingAmount: outstandingInvoices._sum.totalAmount || 0,
        outstandingCount: outstandingInvoices._count || 0,
        pendingAmount: pendingInvoices._sum.totalAmount || 0,
        pendingCount: pendingInvoices._count || 0,
        paidThisMonthAmount: paidThisMonth._sum.totalAmount || 0,
        paidThisMonthCount: paidThisMonth._count || 0,
        overdueAmount: overdueInvoices._sum.totalAmount || 0,
        overdueCount: overdueInvoices._count || 0
      }
    })
  } catch (error) {
    console.error('Error fetching invoice stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoice statistics' },
      { status: 500 }
    )
  }
}