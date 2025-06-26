import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { startOfMonth, endOfMonth } from 'date-fns'
import { withRBAC } from '@/lib/rbac-middleware'

export const GET = withRBAC({
  roles: ['OWNER', 'ADMIN', 'OFFICE']
})(async (request: NextRequest) => {
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
    const revenueResult = await query(
      `SELECT COALESCE(SUM("totalAmount"), 0) as total_revenue, COUNT(*) as paid_count 
       FROM "Invoice" 
       WHERE status = 'PAID' AND "paidDate" >= $1 AND "paidDate" <= $2`,
      [startDate, endDate]
    )

    const revenue = parseFloat(revenueResult.rows[0].total_revenue || 0)
    const paidInvoiceCount = parseInt(revenueResult.rows[0].paid_count || 0)

    // Jobs completed this period
    const completedJobsResult = await query(
      `SELECT COUNT(*) as completed_count 
       FROM "Job" 
       WHERE status = 'COMPLETED' AND "completedAt" >= $1 AND "completedAt" <= $2`,
      [startDate, endDate]
    )

    const completedJobs = parseInt(completedJobsResult.rows[0].completed_count || 0)

    // Average job value (from completed jobs with billed amounts)
    const completedJobsWithBillingResult = await query(
      `SELECT AVG("billedAmount") as avg_billed, COUNT(*) as billing_count 
       FROM "Job" 
       WHERE status = 'COMPLETED' 
       AND "completedAt" >= $1 AND "completedAt" <= $2 
       AND "billedAmount" > 0`,
      [startDate, endDate]
    )

    const averageJobValue = parseFloat(completedJobsWithBillingResult.rows[0].avg_billed || 0)
    const completedJobsWithBillingCount = parseInt(completedJobsWithBillingResult.rows[0].billing_count || 0)

    // Outstanding invoices (not paid)
    const outstandingInvoicesResult = await query(
      `SELECT COALESCE(SUM("totalAmount"), 0) as outstanding_amount, COUNT(*) as outstanding_count 
       FROM "Invoice" 
       WHERE status IN ('SENT', 'OVERDUE')`
    )

    const outstandingAmount = parseFloat(outstandingInvoicesResult.rows[0].outstanding_amount || 0)
    const outstandingCount = parseInt(outstandingInvoicesResult.rows[0].outstanding_count || 0)

    return NextResponse.json({
      revenueThisPeriod: revenue,
      jobsCompleted: completedJobs,
      averageJobValue: averageJobValue,
      outstandingInvoices: outstandingAmount,
      details: {
        paidInvoiceCount,
        outstandingInvoiceCount: outstandingCount,
        completedJobsWithBillingCount: completedJobsWithBillingCount
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
})