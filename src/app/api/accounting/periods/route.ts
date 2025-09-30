import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'
import { addMonths, addQuarters, addYears, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, format } from 'date-fns'
import { withRBAC, AuthenticatedRequest } from '@/lib/rbac-middleware'

const createPeriodSchema = z.object({
  startDate: z.string().transform((str) => new Date(str)),
  periodType: z.enum(['MONTHLY', 'QUARTERLY', 'SEMI_ANNUALLY', 'YEARLY']).optional(),
})

async function generatePeriodName(startDate: Date, endDate: Date, periodType: string): Promise<string> {
  const year = startDate.getFullYear()
  const month = startDate.getMonth() + 1

  switch (periodType) {
    case 'MONTHLY':
      return format(startDate, 'MMMM yyyy')
    case 'QUARTERLY':
      const quarter = Math.floor(month / 3) + 1
      return `Q${quarter} ${year}`
    case 'SEMI_ANNUALLY':
      const half = month <= 6 ? 1 : 2
      return `H${half} ${year}`
    case 'YEARLY':
      return `FY ${year}`
    default:
      return `${format(startDate, 'MMM yyyy')} - ${format(endDate, 'MMM yyyy')}`
  }
}

async function calculatePeriodDates(startDate: Date, periodType: string): Promise<{ start: Date; end: Date }> {
  let start = startDate
  let end: Date

  switch (periodType) {
    case 'MONTHLY':
      start = startOfMonth(startDate)
      end = endOfMonth(startDate)
      break
    case 'QUARTERLY':
      start = startOfQuarter(startDate)
      end = endOfQuarter(startDate)
      break
    case 'SEMI_ANNUALLY':
      start = startOfMonth(startDate)
      end = endOfMonth(addMonths(startDate, 5))
      break
    case 'YEARLY':
      start = startOfYear(startDate)
      end = endOfYear(startDate)
      break
    default:
      start = startOfMonth(startDate)
      end = endOfMonth(startDate)
  }

  return { start, end }
}

async function calculatePeriodNumber(startDate: Date, periodType: string): Promise<number> {
  const month = startDate.getMonth() + 1

  switch (periodType) {
    case 'MONTHLY':
      return month
    case 'QUARTERLY':
      return Math.ceil(month / 3)
    case 'SEMI_ANNUALLY':
      return month <= 6 ? 1 : 2
    case 'YEARLY':
      return 1
    default:
      return month
  }
}

export const GET = withRBAC({
  requiredRoles: ['OWNER_ADMIN']
})(async (request: AuthenticatedRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const fiscalYear = searchParams.get('fiscalYear')

    let sql = `
      SELECT 
        ap.*,
        u."firstName" || ' ' || u."lastName" as "closedByName",
        (SELECT COUNT(*) FROM "JournalEntry" WHERE "periodId" = ap.id) as "entryCount"
      FROM "AccountingPeriod" ap
      LEFT JOIN "User" u ON ap."closedBy" = u.id
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (status) {
      sql += ` AND ap.status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    if (fiscalYear) {
      sql += ` AND ap."fiscalYear" = $${paramIndex}`
      params.push(parseInt(fiscalYear))
      paramIndex++
    }

    sql += ` ORDER BY ap."startDate" DESC`

    const result = await query(sql, params)

    const periods = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      startDate: row.startDate,
      endDate: row.endDate,
      status: row.status,
      fiscalYear: row.fiscalYear,
      periodNumber: row.periodNumber,
      closedBy: row.closedBy,
      closedByName: row.closedByName,
      closedAt: row.closedAt,
      entryCount: parseInt(row.entryCount || 0),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }))

    return NextResponse.json({ periods })
  } catch (error) {
    console.error('Error fetching periods:', error)
    return NextResponse.json(
      { error: 'Failed to fetch periods' },
      { status: 500 }
    )
  }
})

export const POST = withRBAC({
  requiredRoles: ['OWNER_ADMIN']
})(async (request: AuthenticatedRequest) => {
  try {
    const body = await request.json()
    const data = createPeriodSchema.parse(body)

    // Get accounting settings
    const settingsResult = await query(
      'SELECT * FROM "AccountingSettings" LIMIT 1'
    )

    if (settingsResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Accounting settings not configured' },
        { status: 400 }
      )
    }

    const settings = settingsResult.rows[0]
    const periodType = data.periodType || settings.periodFrequency

    // Calculate period dates
    const { start, end } = await calculatePeriodDates(data.startDate, periodType)
    const fiscalYear = start.getFullYear()
    const periodNumber = await calculatePeriodNumber(start, periodType)
    const name = await generatePeriodName(start, end, periodType)

    // Check if period already exists
    const existingPeriod = await query(
      'SELECT id FROM "AccountingPeriod" WHERE "fiscalYear" = $1 AND "periodNumber" = $2',
      [fiscalYear, periodNumber]
    )

    if (existingPeriod.rows.length > 0) {
      return NextResponse.json(
        { error: 'Period already exists for this fiscal year and period number' },
        { status: 400 }
      )
    }

    const result = await query(
      `INSERT INTO "AccountingPeriod" (
        name, "startDate", "endDate", "fiscalYear", "periodNumber", status
      ) VALUES ($1, $2, $3, $4, $5, 'OPEN')
      RETURNING *`,
      [name, start, end, fiscalYear, periodNumber]
    )

    const period = result.rows[0]

    return NextResponse.json(
      {
        period: {
          id: period.id,
          name: period.name,
          startDate: period.startDate,
          endDate: period.endDate,
          status: period.status,
          fiscalYear: period.fiscalYear,
          periodNumber: period.periodNumber,
          createdAt: period.createdAt,
          updatedAt: period.updatedAt,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating period:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create period' },
      { status: 500 }
    )
  }
})
