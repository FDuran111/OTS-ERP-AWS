import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'
import { withRBAC, AuthenticatedRequest } from '@/lib/rbac-middleware'

const updateAccountSchema = z.object({
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(100).optional(),
  accountType: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'COGS', 'EXPENSE']).optional(),
  accountSubType: z.string().max(50).optional().nullable(),
  parentAccountId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
  isPosting: z.boolean().optional(),
  balanceType: z.enum(['DEBIT', 'CREDIT']).optional(),
  description: z.string().optional().nullable(),
})

export const GET = withRBAC({
  requiredRoles: ['OWNER_ADMIN']
})(async (
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params

    const result = await query(
      `SELECT 
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
      WHERE a.id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    const row = result.rows[0]
    const account = {
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
    }

    return NextResponse.json({ account })
  } catch (error) {
    console.error('Error fetching account:', error)
    return NextResponse.json(
      { error: 'Failed to fetch account' },
      { status: 500 }
    )
  }
})

export const PATCH = withRBAC({
  requiredRoles: ['OWNER_ADMIN']
})(async (
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    const body = await request.json()
    const data = updateAccountSchema.parse(body)

    // Check if account exists
    const existingAccount = await query(
      'SELECT * FROM "Account" WHERE id = $1',
      [id]
    )

    if (existingAccount.rows.length === 0) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Check if code already exists (if changing code)
    if (data.code && data.code !== existingAccount.rows[0].code) {
      const duplicateCode = await query(
        'SELECT id FROM "Account" WHERE code = $1 AND id != $2',
        [data.code, id]
      )

      if (duplicateCode.rows.length > 0) {
        return NextResponse.json(
          { error: 'Account code already exists' },
          { status: 400 }
        )
      }
    }

    // Validate parent account if provided
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
      const accountType = data.accountType || existingAccount.rows[0].accountType
      if (parentAccount.rows[0].accountType !== accountType) {
        return NextResponse.json(
          { error: 'Parent account must have the same account type' },
          { status: 400 }
        )
      }

      // Prevent circular reference
      if (data.parentAccountId === id) {
        return NextResponse.json(
          { error: 'Account cannot be its own parent' },
          { status: 400 }
        )
      }
    }

    // Build update query
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (data.code !== undefined) {
      updates.push(`code = $${paramIndex}`)
      values.push(data.code)
      paramIndex++
    }
    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex}`)
      values.push(data.name)
      paramIndex++
    }
    if (data.accountType !== undefined) {
      updates.push(`"accountType" = $${paramIndex}`)
      values.push(data.accountType)
      paramIndex++
    }
    if (data.accountSubType !== undefined) {
      updates.push(`"accountSubType" = $${paramIndex}`)
      values.push(data.accountSubType)
      paramIndex++
    }
    if (data.parentAccountId !== undefined) {
      updates.push(`"parentAccountId" = $${paramIndex}`)
      values.push(data.parentAccountId)
      paramIndex++
    }
    if (data.isActive !== undefined) {
      updates.push(`"isActive" = $${paramIndex}`)
      values.push(data.isActive)
      paramIndex++
    }
    if (data.isPosting !== undefined) {
      updates.push(`"isPosting" = $${paramIndex}`)
      values.push(data.isPosting)
      paramIndex++
    }
    if (data.balanceType !== undefined) {
      updates.push(`"balanceType" = $${paramIndex}`)
      values.push(data.balanceType)
      paramIndex++
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex}`)
      values.push(data.description)
      paramIndex++
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    values.push(id)

    const result = await query(
      `UPDATE "Account" 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, code, name, "accountType", "accountSubType", "parentAccountId",
                 "isActive", "isPosting", "balanceType", description,
                 "createdAt", "updatedAt"`,
      values
    )

    const account = result.rows[0]

    return NextResponse.json({
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
    })
  } catch (error) {
    console.error('Error updating account:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update account' },
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

    // Check if account has any journal entry lines
    const usageCheck = await query(
      'SELECT COUNT(*) as count FROM "JournalEntryLine" WHERE "accountId" = $1',
      [id]
    )

    if (parseInt(usageCheck.rows[0].count) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete account with existing journal entries. Deactivate it instead.' },
        { status: 400 }
      )
    }

    // Check if account has child accounts
    const childrenCheck = await query(
      'SELECT COUNT(*) as count FROM "Account" WHERE "parentAccountId" = $1',
      [id]
    )

    if (parseInt(childrenCheck.rows[0].count) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete account with child accounts' },
        { status: 400 }
      )
    }

    const result = await query(
      'DELETE FROM "Account" WHERE id = $1 RETURNING id',
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting account:', error)
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
})
