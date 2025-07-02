import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { startOfMonth, endOfMonth, subMonths, differenceInDays } from 'date-fns'
import { withRBAC } from '@/lib/rbac-middleware'

export const GET = withRBAC({ requiredRoles: ['OWNER_ADMIN', 'FOREMAN'] })(
async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month' // month, quarter, year
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    // Calculate date range based on period
    let dateStart: Date
    let dateEnd: Date
    
    if (startDate && endDate) {
      dateStart = new Date(startDate)
      dateEnd = new Date(endDate)
    } else {
      const now = new Date()
      switch (period) {
        case 'year':
          dateStart = new Date(now.getFullYear(), 0, 1)
          dateEnd = new Date(now.getFullYear(), 11, 31)
          break
        case 'quarter':
          const currentQuarter = Math.floor(now.getMonth() / 3)
          dateStart = new Date(now.getFullYear(), currentQuarter * 3, 1)
          dateEnd = endOfMonth(new Date(now.getFullYear(), currentQuarter * 3 + 2, 1))
          break
        case 'month':
        default:
          dateStart = startOfMonth(now)
          dateEnd = endOfMonth(now)
      }
    }

    const today = new Date()

    // Get invoice summary by status
    const invoiceSummaryResult = await query(`
      SELECT 
        i.status,
        COUNT(*) as count,
        SUM(i."totalAmount") as total_amount,
        AVG(i."totalAmount") as avg_amount
      FROM "Invoice" i
      WHERE i."createdAt" >= $1 AND i."createdAt" <= $2
      GROUP BY i.status
    `, [dateStart, dateEnd])

    // Get aging report for unpaid invoices
    const agingResult = await query(`
      SELECT 
        age_bucket,
        COUNT(*) as count,
        SUM(total_amount) as total_amount
      FROM (
        SELECT 
          i."totalAmount" as total_amount,
          CASE 
            WHEN CURRENT_DATE - i."dueDate"::date <= 0 THEN 'current'
            WHEN CURRENT_DATE - i."dueDate"::date BETWEEN 1 AND 30 THEN '1-30'
            WHEN CURRENT_DATE - i."dueDate"::date BETWEEN 31 AND 60 THEN '31-60'
            WHEN CURRENT_DATE - i."dueDate"::date BETWEEN 61 AND 90 THEN '61-90'
            ELSE '90+'
          END as age_bucket
        FROM "Invoice" i
        WHERE i.status IN ('SENT', 'OVERDUE')
          AND i."createdAt" >= $1 AND i."createdAt" <= $2
      ) as aged_invoices
      GROUP BY age_bucket
      ORDER BY 
        CASE age_bucket
          WHEN 'current' THEN 1
          WHEN '1-30' THEN 2
          WHEN '31-60' THEN 3
          WHEN '61-90' THEN 4
          ELSE 5
        END
    `, [dateStart, dateEnd])

    // Get top unpaid invoices
    const unpaidInvoicesResult = await query(`
      SELECT 
        i.id,
        i."invoiceNumber",
        i."totalAmount",
        i."dueDate",
        i.status,
        CURRENT_DATE - i."dueDate"::date as days_overdue,
        c.id as customer_id,
        COALESCE(c."companyName", CONCAT(c."firstName", ' ', c."lastName")) as customer_name,
        j."jobNumber",
        j.description as job_description
      FROM "Invoice" i
      INNER JOIN "Customer" c ON i."customerId" = c.id
      INNER JOIN "Job" j ON i."jobId" = j.id
      WHERE i.status IN ('SENT', 'OVERDUE')
        AND i."createdAt" >= $1 AND i."createdAt" <= $2
      ORDER BY i."totalAmount" DESC
      LIMIT 20
    `, [dateStart, dateEnd])

    // Get payment history trends
    const paymentTrendResult = await query(`
      SELECT 
        TO_CHAR(i."paidDate", 'YYYY-MM') as month,
        COUNT(*) as paid_count,
        SUM(i."totalAmount") as paid_amount,
        AVG(EXTRACT(EPOCH FROM (i."paidDate" - i."createdAt"))/86400) as avg_days_to_payment
      FROM "Invoice" i
      WHERE i.status = 'PAID'
        AND i."paidDate" >= $1
      GROUP BY TO_CHAR(i."paidDate", 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 12
    `, [subMonths(new Date(), 11)])

    // Get invoice statistics
    const invoiceStatsResult = await query(`
      SELECT 
        COUNT(*) as total_invoices,
        COUNT(CASE WHEN i.status = 'PAID' THEN 1 END) as paid_count,
        COUNT(CASE WHEN i.status = 'SENT' THEN 1 END) as sent_count,
        COUNT(CASE WHEN i.status = 'OVERDUE' THEN 1 END) as overdue_count,
        COUNT(CASE WHEN i.status = 'DRAFT' THEN 1 END) as draft_count,
        SUM(i."totalAmount") as total_amount,
        SUM(CASE WHEN i.status = 'PAID' THEN i."totalAmount" ELSE 0 END) as paid_amount,
        SUM(CASE WHEN i.status IN ('SENT', 'OVERDUE') THEN i."totalAmount" ELSE 0 END) as outstanding_amount,
        AVG(CASE WHEN i.status = 'PAID' THEN EXTRACT(EPOCH FROM (i."paidDate" - i."createdAt"))/86400 END) as avg_days_to_payment
      FROM "Invoice" i
      WHERE i."createdAt" >= $1 AND i."createdAt" <= $2
    `, [dateStart, dateEnd])

    // Get customer payment performance
    const customerPaymentResult = await query(`
      SELECT 
        c.id,
        COALESCE(c."companyName", CONCAT(c."firstName", ' ', c."lastName")) as name,
        COUNT(i.id) as total_invoices,
        COUNT(CASE WHEN i.status = 'PAID' THEN 1 END) as paid_invoices,
        SUM(i."totalAmount") as total_invoiced,
        SUM(CASE WHEN i.status = 'PAID' THEN i."totalAmount" ELSE 0 END) as total_paid,
        SUM(CASE WHEN i.status IN ('SENT', 'OVERDUE') THEN i."totalAmount" ELSE 0 END) as outstanding,
        AVG(CASE WHEN i.status = 'PAID' THEN EXTRACT(EPOCH FROM (i."paidDate" - i."createdAt"))/86400 END) as avg_payment_days
      FROM "Customer" c
      INNER JOIN "Invoice" i ON c.id = i."customerId"
      WHERE i."createdAt" >= $1 AND i."createdAt" <= $2
      GROUP BY c.id, c."companyName", c."firstName", c."lastName"
      HAVING COUNT(i.id) > 0
      ORDER BY outstanding DESC
      LIMIT 20
    `, [dateStart, dateEnd])

    // Process invoice summary
    const statusMap = new Map()
    invoiceSummaryResult.rows.forEach(row => {
      statusMap.set(row.status, {
        status: row.status,
        count: parseInt(row.count),
        totalAmount: parseFloat(row.total_amount) || 0,
        avgAmount: parseFloat(row.avg_amount) || 0
      })
    })

    // Process aging data
    const agingMap = new Map([
      ['current', { bucket: 'current', count: 0, totalAmount: 0 }],
      ['1-30', { bucket: '1-30', count: 0, totalAmount: 0 }],
      ['31-60', { bucket: '31-60', count: 0, totalAmount: 0 }],
      ['61-90', { bucket: '61-90', count: 0, totalAmount: 0 }],
      ['90+', { bucket: '90+', count: 0, totalAmount: 0 }]
    ])
    
    agingResult.rows.forEach(row => {
      agingMap.set(row.age_bucket, {
        bucket: row.age_bucket,
        count: parseInt(row.count),
        totalAmount: parseFloat(row.total_amount) || 0
      })
    })

    const stats = invoiceStatsResult.rows[0] || {
      total_invoices: 0,
      paid_count: 0,
      sent_count: 0,
      overdue_count: 0,
      draft_count: 0,
      total_amount: 0,
      paid_amount: 0,
      outstanding_amount: 0,
      avg_days_to_payment: 0
    }

    return NextResponse.json({
      period: {
        start: dateStart,
        end: dateEnd,
        label: period
      },
      summary: {
        totalInvoices: parseInt(stats.total_invoices),
        paidCount: parseInt(stats.paid_count),
        sentCount: parseInt(stats.sent_count),
        overdueCount: parseInt(stats.overdue_count),
        draftCount: parseInt(stats.draft_count),
        totalAmount: parseFloat(stats.total_amount) || 0,
        paidAmount: parseFloat(stats.paid_amount) || 0,
        outstandingAmount: parseFloat(stats.outstanding_amount) || 0,
        avgDaysToPayment: parseFloat(stats.avg_days_to_payment) || 0,
        collectionRate: stats.total_amount > 0 
          ? ((parseFloat(stats.paid_amount) / parseFloat(stats.total_amount)) * 100).toFixed(2)
          : '0'
      },
      statusBreakdown: Array.from(statusMap.values()),
      aging: Array.from(agingMap.values()),
      unpaidInvoices: unpaidInvoicesResult.rows.map(row => ({
        id: row.id,
        invoiceNumber: row.invoiceNumber,
        totalAmount: parseFloat(row.total_amount),
        dueDate: row.dueDate,
        status: row.status,
        daysOverdue: parseInt(row.days_overdue) || 0,
        customerId: row.customer_id,
        customerName: row.customer_name,
        jobNumber: row.jobNumber,
        jobDescription: row.job_description
      })),
      paymentTrend: paymentTrendResult.rows.reverse().map(row => ({
        month: row.month,
        paidCount: parseInt(row.paid_count),
        paidAmount: parseFloat(row.paid_amount) || 0,
        avgDaysToPayment: parseFloat(row.avg_days_to_payment) || 0
      })),
      customerPaymentPerformance: customerPaymentResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        totalInvoices: parseInt(row.total_invoices),
        paidInvoices: parseInt(row.paid_invoices),
        totalInvoiced: parseFloat(row.total_invoiced) || 0,
        totalPaid: parseFloat(row.total_paid) || 0,
        outstanding: parseFloat(row.outstanding) || 0,
        avgPaymentDays: parseFloat(row.avg_payment_days) || 0,
        paymentRate: row.total_invoices > 0 
          ? ((parseInt(row.paid_invoices) / parseInt(row.total_invoices)) * 100).toFixed(2)
          : '0'
      }))
    })
  } catch (error) {
    console.error('Error generating invoice summary report:', error)
    return NextResponse.json(
      { error: 'Failed to generate invoice summary report' },
      { status: 500 }
    )
  }
})