import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { withRBAC } from '@/lib/rbac-middleware'

// GET company-wide weekly time entries (admin only)
export const GET = withRBAC({
  requiredRoles: ['OWNER_ADMIN', 'FOREMAN']
})(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required date parameters' },
        { status: 400 }
      )
    }

    // Fetch all time entries for the week from all users
    // Using LEFT JOINs to include entries even if job doesn't exist in Job table
    const result = await query(
      `SELECT
        te.*,
        te."userId",
        te."regularHours",
        te."overtimeHours",
        te."doubleTimeHours",
        u.name as "userName",
        COALESCE(j."jobNumber", te."jobId"::text) as "jobNumber",
        COALESCE(j.description, 'Job details pending') as "jobTitle",
        COALESCE(c."companyName", 'Customer pending') as "companyName",
        c."firstName",
        c."lastName"
      FROM "TimeEntry" te
      INNER JOIN "User" u ON te."userId" = u.id
      LEFT JOIN "Job" j ON te."jobId" = j.id
      LEFT JOIN "Customer" c ON j."customerId" = c.id
      WHERE te.date >= $1::date
        AND te.date <= $2::date
      ORDER BY "jobNumber", te.date`,
      [startDate, endDate]
    )

    // Transform the data
    const entries = result.rows.map(entry => {
      // Build customer name safely
      let customerName = 'Customer pending'
      if (entry.companyName && entry.companyName.trim() && entry.companyName !== 'Customer pending') {
        customerName = entry.companyName
      } else if (entry.firstName && entry.lastName) {
        customerName = `${entry.firstName} ${entry.lastName}`.trim()
      } else if (entry.firstName) {
        customerName = entry.firstName.trim()
      } else if (entry.lastName) {
        customerName = entry.lastName.trim()
      }

      return {
        id: entry.id,
        userId: entry.userId,
        userName: entry.userName,
        jobId: entry.jobId,
        jobNumber: entry.jobNumber,
        jobTitle: entry.jobTitle,
        customer: customerName,
        date: entry.date,
        hours: parseFloat(entry.hours || 0),
        regularHours: parseFloat(entry.regularHours || 0),
        overtimeHours: parseFloat(entry.overtimeHours || 0),
        doubleTimeHours: parseFloat(entry.doubleTimeHours || 0),
        description: entry.description,
        approvedAt: entry.approvedAt,
        approvedBy: entry.approvedBy
      }
    })

    return NextResponse.json(entries)
  } catch (error) {
    console.error('Error fetching company weekly data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch company data' },
      { status: 500 }
    )
  }
})