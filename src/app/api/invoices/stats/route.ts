import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { startOfMonth, endOfMonth } from 'date-fns'

export async function GET() {
  try {
    const now = new Date()
    const startOfThisMonth = startOfMonth(now)
    const endOfThisMonth = endOfMonth(now)

    // Get invoice statistics with parallel queries
    const [
      outstandingResult,
      pendingResult,
      paidThisMonthResult,
      overdueResult,
      recentInvoicesResult
    ] = await Promise.all([
      // Total outstanding invoices (SENT + OVERDUE)
      query(`
        SELECT 
          COALESCE(SUM("totalAmount"), 0) as total_amount,
          COUNT(*) as count
        FROM "Invoice" 
        WHERE status IN ('SENT', 'OVERDUE')
      `),
      
      // Pending invoices (DRAFT)
      query(`
        SELECT 
          COALESCE(SUM("totalAmount"), 0) as total_amount,
          COUNT(*) as count
        FROM "Invoice" 
        WHERE status = 'DRAFT'
      `),
      
      // Paid invoices this month
      query(`
        SELECT 
          COALESCE(SUM("totalAmount"), 0) as total_amount,
          COUNT(*) as count
        FROM "Invoice" 
        WHERE status = 'PAID' 
        AND "paidDate" >= $1 
        AND "paidDate" <= $2
      `, [startOfThisMonth, endOfThisMonth]),
      
      // Overdue invoices specifically
      query(`
        SELECT 
          COALESCE(SUM("totalAmount"), 0) as total_amount,
          COUNT(*) as count
        FROM "Invoice" 
        WHERE status = 'OVERDUE'
      `),
      
      // Recent invoices
      query(`
        SELECT 
          i.*,
          c."firstName",
          c."lastName",
          c."companyName",
          j."jobNumber"
        FROM "Invoice" i
        INNER JOIN "Customer" c ON i."customerId" = c.id
        INNER JOIN "Job" j ON i."jobId" = j.id
        ORDER BY i."createdAt" DESC
        LIMIT 5
      `)
    ])

    const outstanding = outstandingResult.rows[0]
    const pending = pendingResult.rows[0]
    const paidThisMonth = paidThisMonthResult.rows[0]
    const overdue = overdueResult.rows[0]

    const stats = [
      {
        title: 'Total Outstanding',
        value: `$${parseFloat(outstanding.total_amount).toLocaleString()}`,
        icon: 'attach_money',
        color: '#1d8cf8',
        count: parseInt(outstanding.count)
      },
      {
        title: 'Pending (Draft)',
        value: `${parseInt(pending.count)} invoices`,
        icon: 'pending_actions',
        color: '#fd5d93',
        amount: parseFloat(pending.total_amount)
      },
      {
        title: 'Paid This Month',
        value: `$${parseFloat(paidThisMonth.total_amount).toLocaleString()}`,
        icon: 'check_circle',
        color: '#00bf9a',
        count: parseInt(paidThisMonth.count)
      },
      {
        title: 'Overdue',
        value: `${parseInt(overdue.count)} invoices`,
        icon: 'warning',
        color: '#ff8d72',
        amount: parseFloat(overdue.total_amount)
      }
    ]

    const formattedRecentInvoices = recentInvoicesResult.rows.map(invoice => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      jobNumber: invoice.jobNumber,
      customerName: invoice.companyName || 
        `${invoice.firstName} ${invoice.lastName}`,
      totalAmount: parseFloat(invoice.totalAmount),
      status: invoice.status,
      dueDate: invoice.dueDate,
      createdAt: invoice.createdAt
    }))

    return NextResponse.json({
      stats,
      recentInvoices: formattedRecentInvoices,
      details: {
        outstandingAmount: parseFloat(outstanding.total_amount),
        outstandingCount: parseInt(outstanding.count),
        pendingAmount: parseFloat(pending.total_amount),
        pendingCount: parseInt(pending.count),
        paidThisMonthAmount: parseFloat(paidThisMonth.total_amount),
        paidThisMonthCount: parseInt(paidThisMonth.count),
        overdueAmount: parseFloat(overdue.total_amount),
        overdueCount: parseInt(overdue.count)
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