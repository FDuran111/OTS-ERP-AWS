import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { withRBAC } from '@/lib/rbac-middleware'

// GET pending customers (created by employees)
export const GET = withRBAC({
  requiredRoles: ['OWNER_ADMIN', 'FOREMAN']
})(async (request: NextRequest) => {
  try {
    const result = await query(
      `SELECT
        c.*,
        u.name as "createdByName"
      FROM "Customer" c
      LEFT JOIN "User" u ON c."createdBy" = u.id
      WHERE c."createdByEmployee" = true
      ORDER BY c."createdAt" DESC`,
      []
    )

    const response = NextResponse.json(result.rows)
    // Prevent caching to ensure fresh data after approvals
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    return response
  } catch (error) {
    console.error('Error fetching pending customers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending customers' },
      { status: 500 }
    )
  }
})
