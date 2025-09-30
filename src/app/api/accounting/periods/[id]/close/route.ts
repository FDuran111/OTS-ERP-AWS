import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { withRBAC, AuthenticatedRequest } from '@/lib/rbac-middleware'

export const POST = withRBAC({
  requiredRoles: ['OWNER_ADMIN']
})(async (
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    const userId = request.user.id

    await query('BEGIN')

    try {
      // Lock the period row to prevent race conditions
      const periodResult = await query(
        'SELECT * FROM "AccountingPeriod" WHERE id = $1 FOR UPDATE',
        [id]
      )

      if (periodResult.rows.length === 0) {
        await query('ROLLBACK')
        return NextResponse.json(
          { error: 'Period not found' },
          { status: 404 }
        )
      }

      const period = periodResult.rows[0]

      // Check if already closed
      if (period.status === 'CLOSED' || period.status === 'LOCKED') {
        await query('ROLLBACK')
        return NextResponse.json(
          { error: `Period is already ${period.status.toLowerCase()}` },
          { status: 400 }
        )
      }

      // Check for any unposted entries
      const draftEntriesResult = await query(
        `SELECT COUNT(*) as count 
         FROM "JournalEntry" 
         WHERE "periodId" = $1 AND status = 'DRAFT'`,
        [id]
      )

      const draftCount = parseInt(draftEntriesResult.rows[0].count)
      if (draftCount > 0) {
        await query('ROLLBACK')
        return NextResponse.json(
          { 
            error: `Cannot close period with ${draftCount} draft journal entries. Please post or delete them first.` 
          },
          { status: 400 }
        )
      }

      // Close the period
      const result = await query(
        `UPDATE "AccountingPeriod" 
         SET status = 'CLOSED', 
             "closedBy" = $1, 
             "closedAt" = NOW()
         WHERE id = $2
         RETURNING *`,
        [userId, id]
      )

      await query('COMMIT')

      const closedPeriod = result.rows[0]

      return NextResponse.json({
        period: {
          id: closedPeriod.id,
          name: closedPeriod.name,
          startDate: closedPeriod.startDate,
          endDate: closedPeriod.endDate,
          status: closedPeriod.status,
          fiscalYear: closedPeriod.fiscalYear,
          periodNumber: closedPeriod.periodNumber,
          closedBy: closedPeriod.closedBy,
          closedAt: closedPeriod.closedAt,
          createdAt: closedPeriod.createdAt,
          updatedAt: closedPeriod.updatedAt,
        },
      })
    } catch (error) {
      await query('ROLLBACK')
      throw error
    }
  } catch (error) {
    console.error('Error closing period:', error)
    return NextResponse.json(
      { error: 'Failed to close period' },
      { status: 500 }
    )
  }
})

export const DELETE = withRBAC({
  requiredRoles: ['OWNER_ADMIN']
})(async (
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params

    await query('BEGIN')

    try {
      // Lock the period row to prevent race conditions
      const periodResult = await query(
        'SELECT * FROM "AccountingPeriod" WHERE id = $1 FOR UPDATE',
        [id]
      )

      if (periodResult.rows.length === 0) {
        await query('ROLLBACK')
        return NextResponse.json(
          { error: 'Period not found' },
          { status: 404 }
        )
      }

      const period = periodResult.rows[0]

      // Only allow reopening if CLOSED (not LOCKED)
      if (period.status !== 'CLOSED') {
        await query('ROLLBACK')
        return NextResponse.json(
          { error: 'Can only reopen CLOSED periods' },
          { status: 400 }
        )
      }

      // Reopen the period
      const result = await query(
        `UPDATE "AccountingPeriod" 
         SET status = 'OPEN', 
             "closedBy" = NULL, 
             "closedAt" = NULL
         WHERE id = $1
         RETURNING *`,
        [id]
      )

      await query('COMMIT')

      const reopenedPeriod = result.rows[0]

      return NextResponse.json({
        period: {
          id: reopenedPeriod.id,
          name: reopenedPeriod.name,
          startDate: reopenedPeriod.startDate,
          endDate: reopenedPeriod.endDate,
          status: reopenedPeriod.status,
          fiscalYear: reopenedPeriod.fiscalYear,
          periodNumber: reopenedPeriod.periodNumber,
          closedBy: reopenedPeriod.closedBy,
          closedAt: reopenedPeriod.closedAt,
          createdAt: reopenedPeriod.createdAt,
          updatedAt: reopenedPeriod.updatedAt,
        },
      })
    } catch (error) {
      await query('ROLLBACK')
      throw error
    }
  } catch (error) {
    console.error('Error reopening period:', error)
    return NextResponse.json(
      { error: 'Failed to reopen period' },
      { status: 500 }
    )
  }
})
