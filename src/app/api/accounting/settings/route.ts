import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const updateSettingsSchema = z.object({
  periodFrequency: z.enum(['MONTHLY', 'QUARTERLY', 'SEMI_ANNUALLY', 'YEARLY']).optional(),
  fiscalYearStartMonth: z.number().min(1).max(12).optional(),
  defaultCurrency: z.string().length(3).optional(),
  enableMultiCurrency: z.boolean().optional(),
  retainedEarningsAccountId: z.string().uuid().optional().nullable(),
  autoCreatePeriods: z.boolean().optional(),
  requireApproval: z.boolean().optional(),
  enableBudgets: z.boolean().optional(),
})

export async function GET() {
  try {
    const result = await query(
      'SELECT * FROM "AccountingSettings" LIMIT 1'
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Accounting settings not found' },
        { status: 404 }
      )
    }

    const settings = result.rows[0]

    // Get retained earnings account details if set
    let retainedEarningsAccount = null
    if (settings.retainedEarningsAccountId) {
      const accountResult = await query(
        'SELECT id, code, name FROM "Account" WHERE id = $1',
        [settings.retainedEarningsAccountId]
      )
      if (accountResult.rows.length > 0) {
        retainedEarningsAccount = accountResult.rows[0]
      }
    }

    // Get current period details if set
    let currentPeriod = null
    if (settings.currentPeriodId) {
      const periodResult = await query(
        'SELECT id, name, "startDate", "endDate", status FROM "AccountingPeriod" WHERE id = $1',
        [settings.currentPeriodId]
      )
      if (periodResult.rows.length > 0) {
        currentPeriod = periodResult.rows[0]
      }
    }

    return NextResponse.json({
      settings: {
        id: settings.id,
        periodFrequency: settings.periodFrequency,
        fiscalYearStartMonth: settings.fiscalYearStartMonth,
        defaultCurrency: settings.defaultCurrency,
        enableMultiCurrency: settings.enableMultiCurrency,
        retainedEarningsAccountId: settings.retainedEarningsAccountId,
        retainedEarningsAccount,
        currentPeriodId: settings.currentPeriodId,
        currentPeriod,
        autoCreatePeriods: settings.autoCreatePeriods,
        requireApproval: settings.requireApproval,
        enableBudgets: settings.enableBudgets,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      },
    })
  } catch (error) {
    console.error('Error fetching accounting settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accounting settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = updateSettingsSchema.parse(body)

    // Validate retained earnings account if provided
    if (data.retainedEarningsAccountId) {
      const accountResult = await query(
        'SELECT "accountType" FROM "Account" WHERE id = $1',
        [data.retainedEarningsAccountId]
      )

      if (accountResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Retained earnings account not found' },
          { status: 400 }
        )
      }

      if (accountResult.rows[0].accountType !== 'EQUITY') {
        return NextResponse.json(
          { error: 'Retained earnings account must be an EQUITY account' },
          { status: 400 }
        )
      }
    }

    // Build update query
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (data.periodFrequency !== undefined) {
      updates.push(`"periodFrequency" = $${paramIndex}`)
      values.push(data.periodFrequency)
      paramIndex++
    }
    if (data.fiscalYearStartMonth !== undefined) {
      updates.push(`"fiscalYearStartMonth" = $${paramIndex}`)
      values.push(data.fiscalYearStartMonth)
      paramIndex++
    }
    if (data.defaultCurrency !== undefined) {
      updates.push(`"defaultCurrency" = $${paramIndex}`)
      values.push(data.defaultCurrency)
      paramIndex++
    }
    if (data.enableMultiCurrency !== undefined) {
      updates.push(`"enableMultiCurrency" = $${paramIndex}`)
      values.push(data.enableMultiCurrency)
      paramIndex++
    }
    if (data.retainedEarningsAccountId !== undefined) {
      updates.push(`"retainedEarningsAccountId" = $${paramIndex}`)
      values.push(data.retainedEarningsAccountId)
      paramIndex++
    }
    if (data.autoCreatePeriods !== undefined) {
      updates.push(`"autoCreatePeriods" = $${paramIndex}`)
      values.push(data.autoCreatePeriods)
      paramIndex++
    }
    if (data.requireApproval !== undefined) {
      updates.push(`"requireApproval" = $${paramIndex}`)
      values.push(data.requireApproval)
      paramIndex++
    }
    if (data.enableBudgets !== undefined) {
      updates.push(`"enableBudgets" = $${paramIndex}`)
      values.push(data.enableBudgets)
      paramIndex++
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Get the first (and only) settings record
    const settingsResult = await query('SELECT id FROM "AccountingSettings" LIMIT 1')
    
    if (settingsResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Accounting settings not found' },
        { status: 404 }
      )
    }

    const settingsId = settingsResult.rows[0].id
    values.push(settingsId)

    const result = await query(
      `UPDATE "AccountingSettings" 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    )

    const settings = result.rows[0]

    return NextResponse.json({
      settings: {
        id: settings.id,
        periodFrequency: settings.periodFrequency,
        fiscalYearStartMonth: settings.fiscalYearStartMonth,
        defaultCurrency: settings.defaultCurrency,
        enableMultiCurrency: settings.enableMultiCurrency,
        retainedEarningsAccountId: settings.retainedEarningsAccountId,
        currentPeriodId: settings.currentPeriodId,
        autoCreatePeriods: settings.autoCreatePeriods,
        requireApproval: settings.requireApproval,
        enableBudgets: settings.enableBudgets,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      },
    })
  } catch (error) {
    console.error('Error updating accounting settings:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update accounting settings' },
      { status: 500 }
    )
  }
}
