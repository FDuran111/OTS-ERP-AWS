import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { withRBAC, AuthenticatedRequest } from '@/lib/rbac-middleware'

export const GET = withRBAC({
  requiredRoles: ['OWNER_ADMIN']
})(async (request: AuthenticatedRequest, { params }: { params: { id: string } }) => {
  try {
    const { id } = params

    const entryResult = await query(
      `SELECT 
        je.*,
        ap.name as "periodName",
        creator."firstName" || ' ' || creator."lastName" as "createdByName",
        poster."firstName" || ' ' || poster."lastName" as "postedByName"
      FROM "JournalEntry" je
      LEFT JOIN "AccountingPeriod" ap ON je."periodId" = ap.id
      LEFT JOIN "User" creator ON je."createdBy" = creator.id
      LEFT JOIN "User" poster ON je."postedBy" = poster.id
      WHERE je.id = $1`,
      [id]
    )

    if (entryResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Journal entry not found' },
        { status: 404 }
      )
    }

    const entry = entryResult.rows[0]

    const linesResult = await query(
      `SELECT 
        jel.*,
        a.code as "accountCode",
        a.name as "accountName",
        a."accountType"
      FROM "JournalEntryLine" jel
      INNER JOIN "Account" a ON jel."accountId" = a.id
      WHERE jel."entryId" = $1
      ORDER BY jel."lineNumber"`,
      [id]
    )

    const lines = linesResult.rows.map((line: any) => ({
      id: line.id,
      lineNumber: line.lineNumber,
      accountId: line.accountId,
      accountCode: line.accountCode,
      accountName: line.accountName,
      accountType: line.accountType,
      debit: parseFloat(line.debit),
      credit: parseFloat(line.credit),
      description: line.description,
    }))

    return NextResponse.json({
      entry: {
        id: entry.id,
        entryNumber: entry.entryNumber,
        entryDate: entry.entryDate,
        periodId: entry.periodId,
        periodName: entry.periodName,
        status: entry.status,
        description: entry.description,
        sourceModule: entry.sourceModule,
        sourceId: entry.sourceId,
        createdBy: entry.createdBy,
        createdByName: entry.createdByName,
        postedBy: entry.postedBy,
        postedByName: entry.postedByName,
        postedAt: entry.postedAt,
        createdAt: entry.createdAt,
      },
      lines,
    })
  } catch (error) {
    console.error('Error fetching journal entry:', error)
    return NextResponse.json(
      { error: 'Failed to fetch journal entry' },
      { status: 500 }
    )
  }
})
