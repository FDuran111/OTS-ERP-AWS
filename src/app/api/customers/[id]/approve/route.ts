import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { withRBAC } from '@/lib/rbac-middleware'

// PATCH approve a pending customer
export const PATCH = withRBAC({
  requiredRoles: ['OWNER_ADMIN', 'FOREMAN']
})(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    // Next.js 15 requires awaiting params
    const { id: customerId } = await params

    // Update customer to remove pending status
    const result = await query(
      `UPDATE "Customer"
       SET "createdByEmployee" = false,
           "updatedAt" = NOW()
       WHERE id = $1
       RETURNING *`,
      [customerId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      customer: result.rows[0]
    })
  } catch (error) {
    console.error('Error approving customer:', error)
    return NextResponse.json(
      { error: 'Failed to approve customer' },
      { status: 500 }
    )
  }
})
