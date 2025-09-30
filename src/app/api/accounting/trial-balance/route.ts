import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { withRBAC, AuthenticatedRequest } from '@/lib/rbac-middleware'

export const GET = withRBAC({
  requiredRoles: ['OWNER_ADMIN']
})(async (request: AuthenticatedRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const accountType = searchParams.get('accountType')
    const includeZeroBalances = searchParams.get('includeZeroBalances') === 'true'

    let datePredicate = 'TRUE'
    const params: any[] = []
    let paramIndex = 1

    // Build date predicate for CASE statements
    if (startDate && endDate) {
      datePredicate = `je."entryDate" BETWEEN $${paramIndex} AND $${paramIndex + 1}`
      params.push(startDate, endDate)
      paramIndex += 2
    } else if (startDate) {
      datePredicate = `je."entryDate" >= $${paramIndex}`
      params.push(startDate)
      paramIndex++
    } else if (endDate) {
      datePredicate = `je."entryDate" <= $${paramIndex}`
      params.push(endDate)
      paramIndex++
    }

    let sql = `
      SELECT 
        a.id as "accountId",
        a.code,
        a.name,
        a."accountType",
        a."accountSubType",
        a."balanceType",
        a."parentAccountId",
        COALESCE(SUM(
          CASE 
            WHEN je.status = 'POSTED' AND ${datePredicate} THEN jel.debit 
            ELSE 0 
          END
        ), 0) as "totalDebits",
        COALESCE(SUM(
          CASE 
            WHEN je.status = 'POSTED' AND ${datePredicate} THEN jel.credit 
            ELSE 0 
          END
        ), 0) as "totalCredits",
        CASE 
          WHEN a."balanceType" = 'DEBIT' THEN COALESCE(SUM(
            CASE 
              WHEN je.status = 'POSTED' AND ${datePredicate} THEN jel.debit - jel.credit 
              ELSE 0 
            END
          ), 0)
          ELSE COALESCE(SUM(
            CASE 
              WHEN je.status = 'POSTED' AND ${datePredicate} THEN jel.credit - jel.debit 
              ELSE 0 
            END
          ), 0)
        END as balance
      FROM "Account" a
      LEFT JOIN "JournalEntryLine" jel ON a.id = jel."accountId"
      LEFT JOIN "JournalEntry" je ON jel."entryId" = je.id
      WHERE a."isActive" = true AND a."isPosting" = true
    `

    // Add account type filter if provided
    if (accountType) {
      sql += ` AND a."accountType" = $${paramIndex}`
      params.push(accountType)
      paramIndex++
    }

    sql += `
      GROUP BY a.id, a.code, a.name, a."accountType", a."accountSubType", a."balanceType", a."parentAccountId"
    `

    // Only filter out zero balances if explicitly requested
    if (!includeZeroBalances) {
      sql += `
        HAVING COALESCE(SUM(
          CASE 
            WHEN je.status = 'POSTED' AND ${datePredicate} THEN jel.debit 
            ELSE 0 
          END
        ), 0) != 0 
        OR COALESCE(SUM(
          CASE 
            WHEN je.status = 'POSTED' AND ${datePredicate} THEN jel.credit 
            ELSE 0 
          END
        ), 0) != 0
      `
    }

    sql += ` ORDER BY a.code`

    const result = await query(sql, params)

    const accounts = result.rows.map((row: any) => ({
      accountId: row.accountId,
      code: row.code,
      name: row.name,
      accountType: row.accountType,
      accountSubType: row.accountSubType,
      balanceType: row.balanceType,
      parentAccountId: row.parentAccountId,
      totalDebits: parseFloat(row.totalDebits),
      totalCredits: parseFloat(row.totalCredits),
      balance: parseFloat(row.balance),
    }))

    // Calculate totals
    const totalDebits = accounts.reduce((sum: number, acc: any) => sum + acc.totalDebits, 0)
    const totalCredits = accounts.reduce((sum: number, acc: any) => sum + acc.totalCredits, 0)

    // Group by account type for summary
    const byType = accounts.reduce((acc: any, account: any) => {
      if (!acc[account.accountType]) {
        acc[account.accountType] = {
          type: account.accountType,
          totalDebits: 0,
          totalCredits: 0,
          balance: 0,
          accounts: [],
        }
      }
      acc[account.accountType].totalDebits += account.totalDebits
      acc[account.accountType].totalCredits += account.totalCredits
      acc[account.accountType].balance += account.balance
      acc[account.accountType].accounts.push(account)
      return acc
    }, {})

    return NextResponse.json({
      accounts,
      summary: {
        totalDebits,
        totalCredits,
        difference: Math.abs(totalDebits - totalCredits),
        isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
        byType: Object.values(byType),
      },
      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
        accountType: accountType || null,
        includeZeroBalances,
      },
    })
  } catch (error) {
    console.error('Error generating trial balance:', error)
    return NextResponse.json(
      { error: 'Failed to generate trial balance' },
      { status: 500 }
    )
  }
})
