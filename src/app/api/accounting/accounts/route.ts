import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'
import { withRBAC, AuthenticatedRequest } from '@/lib/rbac-middleware'

const createAccountSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  accountType: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'COGS', 'EXPENSE']),
  accountSubType: z.string().max(50).optional().nullable(),
  parentAccountId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().default(true),
  isPosting: z.boolean().default(true),
  balanceType: z.enum(['DEBIT', 'CREDIT']),
  description: z.string().optional().nullable(),
})

export const GET = withRBAC({
  requiredRoles: ['OWNER_ADMIN']
})(async (request: AuthenticatedRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const accountType = searchParams.get('accountType')
    const isPosting = searchParams.get('isPosting')
    const isActive = searchParams.get('isActive')

    let sql = `
      SELECT 
        a.id,
        a.code,
        a.name,
        a."accountType",
        a."accountSubType",
        a."parentAccountId",
        a."isActive",
        a."isPosting",
        a."balanceType",
        a.description,
        a."createdAt",
        a."updatedAt",
        parent.name as "parentAccountName"
      FROM "Account" a
      LEFT JOIN "Account" parent ON a."parentAccountId" = parent.id
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (accountType) {
      sql += ` AND a."accountType" = $${paramIndex}`
      params.push(accountType)
      paramIndex++
    }

    if (isPosting !== null) {
      sql += ` AND a."isPosting" = $${paramIndex}`
      params.push(isPosting === 'true')
      paramIndex++
    }

    if (isActive !== null) {
      sql += ` AND a."isActive" = $${paramIndex}`
      params.push(isActive === 'true')
      paramIndex++
    }

    sql += ` ORDER BY a.code`

    const result = await query(sql, params)

    const accounts = result.rows.map((row: any) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      accountType: row.accountType,
      accountSubType: row.accountSubType,
      parentAccountId: row.parentAccountId,
      parentAccountName: row.parentAccountName,
      isActive: row.isActive,
      isPosting: row.isPosting,
      balanceType: row.balanceType,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }))

    return NextResponse.json({ accounts })
  } catch (error) {
    console.error('Error fetching accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    )
  }
})

export const POST = withRBAC({
  requiredRoles: ['OWNER_ADMIN']
})(async (request: AuthenticatedRequest) => {
  try {
    const body = await request.json()
    const data = createAccountSchema.parse(body)

    // Check if code already exists
    const existingAccount = await query(
      'SELECT id FROM "Account" WHERE code = $1',
      [data.code]
    )

    if (existingAccount.rows.length > 0) {
      return NextResponse.json(
        { error: 'Account code already exists' },
        { status: 400 }
      )
    }

    // Validate parent account exists if provided
    if (data.parentAccountId) {
      const parentAccount = await query(
        'SELECT id, "accountType" FROM "Account" WHERE id = $1',
        [data.parentAccountId]
      )

      if (parentAccount.rows.length === 0) {
        return NextResponse.json(
          { error: 'Parent account not found' },
          { status: 400 }
        )
      }

      // Ensure parent has same account type
      if (parentAccount.rows[0].accountType !== data.accountType) {
        return NextResponse.json(
          { error: 'Parent account must have the same account type' },
          { status: 400 }
        )
      }
    }

    const result = await query(
      `INSERT INTO "Account" (
        code, name, "accountType", "accountSubType", "parentAccountId",
        "isActive", "isPosting", "balanceType", description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, code, name, "accountType", "accountSubType", "parentAccountId",
                "isActive", "isPosting", "balanceType", description, 
                "createdAt", "updatedAt"`,
      [
        data.code,
        data.name,
        data.accountType,
        data.accountSubType || null,
        data.parentAccountId || null,
        data.isActive,
        data.isPosting,
        data.balanceType,
        data.description || null,
      ]
    )

    const account = result.rows[0]

    return NextResponse.json(
      {
        account: {
          id: account.id,
          code: account.code,
          name: account.name,
          accountType: account.accountType,
          accountSubType: account.accountSubType,
          parentAccountId: account.parentAccountId,
          isActive: account.isActive,
          isPosting: account.isPosting,
          balanceType: account.balanceType,
          description: account.description,
          createdAt: account.createdAt,
          updatedAt: account.updatedAt,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating account:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
})
