import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { withRBAC } from '@/lib/rbac-middleware'

// GET pending jobs (status = PENDING_APPROVAL)
export const GET = withRBAC({
  requiredRoles: ['OWNER_ADMIN', 'FOREMAN']
})(async (request: NextRequest) => {
  try {
    const result = await query(
      `SELECT
        j.*,
        c."companyName",
        c."firstName",
        c."lastName",
        u.name as "createdByName",
        COUNT(DISTINCT te.id) as "timeEntryCount"
      FROM "Job" j
      INNER JOIN "Customer" c ON j."customerId" = c.id
      LEFT JOIN "User" u ON j."createdBy" = u.id
      LEFT JOIN "TimeEntry" te ON j.id = te."jobId"
      WHERE j.status::text = 'PENDING_APPROVAL'
      GROUP BY j.id, c.id, u.id
      ORDER BY j."createdAt" DESC`,
      []
    )

    const transformedJobs = result.rows.map(job => ({
      id: job.id,
      jobNumber: job.jobNumber,
      customerPO: job.customerPO,
      description: job.description,
      customer: job.companyName || `${job.firstName} ${job.lastName}`,
      customerId: job.customerId,
      type: job.type,
      division: job.division,
      address: job.address,
      city: job.city,
      state: job.state,
      zip: job.zip,
      status: job.status,
      createdBy: job.createdBy,
      createdByName: job.createdByName,
      timeEntryCount: parseInt(job.timeEntryCount) || 0,
      createdAt: job.createdAt
    }))

    return NextResponse.json(transformedJobs)
  } catch (error) {
    console.error('Error fetching pending jobs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending jobs' },
      { status: 500 }
    )
  }
})
