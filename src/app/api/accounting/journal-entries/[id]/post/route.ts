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
      // Lock the journal entry row to prevent race conditions
      const entryResult = await query(
        'SELECT * FROM "JournalEntry" WHERE id = $1 FOR UPDATE',
        [id]
      )

      if (entryResult.rows.length === 0) {
        await query('ROLLBACK')
        return NextResponse.json(
          { error: 'Journal entry not found' },
          { status: 404 }
        )
      }

      const entry = entryResult.rows[0]

      // Check if already posted (idempotency)
      if (entry.status === 'POSTED') {
        await query('ROLLBACK')
        return NextResponse.json(
          { error: 'Journal entry is already posted' },
          { status: 409 }
        )
      }

      // Check if period is open
      const periodResult = await query(
        'SELECT status FROM "AccountingPeriod" WHERE id = $1',
        [entry.periodId]
      )

      if (periodResult.rows.length === 0 || periodResult.rows[0].status !== 'OPEN') {
        await query('ROLLBACK')
        return NextResponse.json(
          { error: 'Period is not open for posting' },
          { status: 400 }
        )
      }

      // Get entry lines and validate balance
      const linesResult = await query(
        'SELECT * FROM "JournalEntryLine" WHERE "entryId" = $1',
        [id]
      )

      if (linesResult.rows.length < 2) {
        await query('ROLLBACK')
        return NextResponse.json(
          { error: 'Journal entry must have at least 2 lines' },
          { status: 400 }
        )
      }

      const totalDebits = linesResult.rows.reduce(
        (sum: number, line: any) => sum + parseFloat(line.debit),
        0
      )
      const totalCredits = linesResult.rows.reduce(
        (sum: number, line: any) => sum + parseFloat(line.credit),
        0
      )

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        await query('ROLLBACK')
        return NextResponse.json(
          { error: `Entry is not balanced. Debits: ${totalDebits}, Credits: ${totalCredits}` },
          { status: 400 }
        )
      }

      // Post the entry - conditional update ensures idempotency
      const result = await query(
        `UPDATE "JournalEntry" 
         SET status = 'POSTED',
             "postedBy" = $1,
             "postedAt" = NOW()
         WHERE id = $2 AND status = 'DRAFT'
         RETURNING *`,
        [userId, id]
      )

      if (result.rows.length === 0) {
        await query('ROLLBACK')
        return NextResponse.json(
          { error: 'Entry cannot be posted (already posted or not in draft status)' },
          { status: 409 }
        )
      }

      await query('COMMIT')

      // Fetch full entry with lines
      const fullEntryResult = await query(
        `SELECT 
          je.*,
          json_agg(
            json_build_object(
              'id', jel.id,
              'lineNumber', jel."lineNumber",
              'accountId', jel."accountId",
              'accountCode', a.code,
              'accountName', a.name,
              'debit', jel.debit,
              'credit', jel.credit,
              'description', jel.description
            ) ORDER BY jel."lineNumber"
          ) as lines
        FROM "JournalEntry" je
        LEFT JOIN "JournalEntryLine" jel ON je.id = jel."entryId"
        LEFT JOIN "Account" a ON jel."accountId" = a.id
        WHERE je.id = $1
        GROUP BY je.id`,
        [id]
      )

      const fullEntry = fullEntryResult.rows[0]

      return NextResponse.json({
        entry: {
          id: fullEntry.id,
          entryNumber: fullEntry.entryNumber,
          entryDate: fullEntry.entryDate,
          periodId: fullEntry.periodId,
          status: fullEntry.status,
          description: fullEntry.description,
          postedBy: fullEntry.postedBy,
          postedAt: fullEntry.postedAt,
          createdAt: fullEntry.createdAt,
          updatedAt: fullEntry.updatedAt,
          lines: fullEntry.lines.map((line: any) => ({
            ...line,
            debit: parseFloat(line.debit),
            credit: parseFloat(line.credit),
          })),
        },
      })
    } catch (error) {
      await query('ROLLBACK')
      throw error
    }
  } catch (error) {
    console.error('Error posting journal entry:', error)
    return NextResponse.json(
      { error: 'Failed to post journal entry' },
      { status: 500 }
    )
  }
})
