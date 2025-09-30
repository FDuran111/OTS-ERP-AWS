import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'
import { withRBAC, AuthenticatedRequest } from '@/lib/rbac-middleware'

const journalEntryLineSchema = z.object({
  accountId: z.string().uuid(),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
  description: z.string().optional(),
  jobId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  vendorId: z.string().optional().nullable(),
  materialId: z.string().optional().nullable(),
  employeeId: z.string().optional().nullable(),
})

const createJournalEntrySchema = z.object({
  entryDate: z.string().transform((str) => new Date(str)),
  periodId: z.string().uuid(),
  description: z.string().optional(),
  sourceModule: z.string().optional(),
  sourceId: z.string().optional(),
  lines: z.array(journalEntryLineSchema).min(2),
})

export const GET = withRBAC({
  requiredRoles: ['OWNER_ADMIN']
})(async (request: AuthenticatedRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const periodId = searchParams.get('periodId')
    const accountId = searchParams.get('accountId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let sql = `
      SELECT 
        je.*,
        ap.name as "periodName",
        creator.name as "createdByName",
        poster.name as "postedByName"
      FROM "JournalEntry" je
      LEFT JOIN "AccountingPeriod" ap ON je."periodId" = ap.id
      LEFT JOIN "User" creator ON je."createdBy" = creator.id
      LEFT JOIN "User" poster ON je."postedBy" = poster.id
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (status) {
      sql += ` AND je.status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    if (periodId) {
      sql += ` AND je."periodId" = $${paramIndex}`
      params.push(periodId)
      paramIndex++
    }

    if (startDate) {
      sql += ` AND je."entryDate" >= $${paramIndex}`
      params.push(startDate)
      paramIndex++
    }

    if (endDate) {
      sql += ` AND je."entryDate" <= $${paramIndex}`
      params.push(endDate)
      paramIndex++
    }

    if (accountId) {
      sql += ` AND EXISTS (
        SELECT 1 FROM "JournalEntryLine" jel 
        WHERE jel."entryId" = je.id AND jel."accountId" = $${paramIndex}
      )`
      params.push(accountId)
      paramIndex++
    }

    sql += ` ORDER BY je."entryDate" DESC, je."entryNumber" DESC`

    const entriesResult = await query(sql, params)

    // Get all entry IDs to fetch lines
    const entryIds = entriesResult.rows.map((row: any) => row.id)
    
    let linesResult: any = { rows: [] }
    if (entryIds.length > 0) {
      const placeholders = entryIds.map((_, i) => `$${i + 1}`).join(',')
      linesResult = await query(
        `SELECT 
          jel.*,
          a.code as "accountCode",
          a.name as "accountName"
        FROM "JournalEntryLine" jel
        LEFT JOIN "Account" a ON jel."accountId" = a.id
        WHERE jel."entryId" IN (${placeholders})
        ORDER BY jel."lineNumber"`,
        entryIds
      )
    }

    // Group lines by entry
    const linesByEntry: Record<string, any[]> = {}
    linesResult.rows.forEach((line: any) => {
      if (!linesByEntry[line.entryId]) {
        linesByEntry[line.entryId] = []
      }
      linesByEntry[line.entryId].push({
        id: line.id,
        lineNumber: line.lineNumber,
        accountId: line.accountId,
        accountCode: line.accountCode,
        accountName: line.accountName,
        debit: parseFloat(line.debit),
        credit: parseFloat(line.credit),
        description: line.description,
        jobId: line.jobId,
        customerId: line.customerId,
        vendorId: line.vendorId,
        materialId: line.materialId,
        employeeId: line.employeeId,
      })
    })

    const entries = entriesResult.rows.map((row: any) => ({
      id: row.id,
      entryNumber: row.entryNumber,
      entryDate: row.entryDate,
      periodId: row.periodId,
      periodName: row.periodName,
      status: row.status,
      description: row.description,
      sourceModule: row.sourceModule,
      sourceId: row.sourceId,
      createdBy: row.createdBy,
      createdByName: row.createdByName,
      postedBy: row.postedBy,
      postedByName: row.postedByName,
      postedAt: row.postedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lines: linesByEntry[row.id] || [],
    }))

    return NextResponse.json({ entries })
  } catch (error) {
    console.error('Error fetching journal entries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch journal entries' },
      { status: 500 }
    )
  }
})

export const POST = withRBAC({
  requiredRoles: ['OWNER_ADMIN']
})(async (request: AuthenticatedRequest) => {
  try {
    const body = await request.json()
    const data = createJournalEntrySchema.parse(body)
    const userId = request.user.id

    await query('BEGIN')

    try {
      // Lock the period row and validate it's open
      const periodResult = await query(
        'SELECT * FROM "AccountingPeriod" WHERE id = $1 FOR UPDATE',
        [data.periodId]
      )

      if (periodResult.rows.length === 0) {
        await query('ROLLBACK')
        return NextResponse.json(
          { error: 'Period not found' },
          { status: 400 }
        )
      }

      if (periodResult.rows[0].status !== 'OPEN') {
        await query('ROLLBACK')
        return NextResponse.json(
          { error: 'Period is not open for new entries' },
          { status: 400 }
        )
      }

      // Validate all accounts exist and are posting accounts
      const accountIds = data.lines.map(line => line.accountId)
      const accountsResult = await query(
        `SELECT id, "isPosting", "isActive" FROM "Account" WHERE id = ANY($1::uuid[])`,
        [accountIds]
      )

      if (accountsResult.rows.length !== accountIds.length) {
        await query('ROLLBACK')
        return NextResponse.json(
          { error: 'One or more accounts not found' },
          { status: 400 }
        )
      }

      const invalidAccounts = accountsResult.rows.filter((acc: any) => !acc.isPosting || !acc.isActive)
      if (invalidAccounts.length > 0) {
        await query('ROLLBACK')
        return NextResponse.json(
          { error: 'One or more accounts are not active posting accounts' },
          { status: 400 }
        )
      }

      // Validate debits equal credits
      const totalDebits = data.lines.reduce((sum, line) => sum + line.debit, 0)
      const totalCredits = data.lines.reduce((sum, line) => sum + line.credit, 0)

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        await query('ROLLBACK')
        return NextResponse.json(
          { error: `Journal entry is not balanced. Debits: ${totalDebits}, Credits: ${totalCredits}` },
          { status: 400 }
        )
      }

      // Validate each line has either debit or credit (not both)
      const invalidLines = data.lines.filter(line => (line.debit > 0 && line.credit > 0) || (line.debit === 0 && line.credit === 0))
      if (invalidLines.length > 0) {
        await query('ROLLBACK')
        return NextResponse.json(
          { error: 'Each line must have either a debit or credit (not both, not neither)' },
          { status: 400 }
        )
      }

      // Create journal entry - use ON CONFLICT for idempotency
      const entryResult = await query(
        `INSERT INTO "JournalEntry" (
          "entryDate", "periodId", description, "createdBy", status, "sourceModule", "sourceId"
        ) VALUES ($1, $2, $3, $4, 'DRAFT', $5, $6)
        ON CONFLICT ON CONSTRAINT "JournalEntry_sourceModule_sourceId_key"
        DO NOTHING
        RETURNING *`,
        [
          data.entryDate, 
          data.periodId, 
          data.description || null, 
          userId,
          data.sourceModule || 'MANUAL',
          data.sourceId || null
        ]
      )

      // Check if entry was actually created (not a duplicate)
      if (entryResult.rows.length === 0) {
        await query('ROLLBACK')
        return NextResponse.json(
          { error: 'Journal entry already exists for this source' },
          { status: 409 }
        )
      }

      const entry = entryResult.rows[0]

      // Create journal entry lines
      for (let i = 0; i < data.lines.length; i++) {
        const line = data.lines[i]
        await query(
          `INSERT INTO "JournalEntryLine" (
            "entryId", "lineNumber", "accountId", debit, credit, description,
            "jobId", "customerId", "vendorId", "materialId", "employeeId"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            entry.id,
            i + 1,
            line.accountId,
            line.debit,
            line.credit,
            line.description || null,
            line.jobId || null,
            line.customerId || null,
            line.vendorId || null,
            line.materialId || null,
            line.employeeId || null,
          ]
        )
      }

      await query('COMMIT')

      // Fetch the created entry with lines
      const createdEntry = await query(
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
              'description', jel.description,
              'jobId', jel."jobId",
              'customerId', jel."customerId",
              'vendorId', jel."vendorId",
              'materialId', jel."materialId",
              'employeeId', jel."employeeId"
            ) ORDER BY jel."lineNumber"
          ) as lines
        FROM "JournalEntry" je
        LEFT JOIN "JournalEntryLine" jel ON je.id = jel."entryId"
        LEFT JOIN "Account" a ON jel."accountId" = a.id
        WHERE je.id = $1
        GROUP BY je.id`,
        [entry.id]
      )

      const result = createdEntry.rows[0]

      return NextResponse.json(
        {
          entry: {
            id: result.id,
            entryNumber: result.entryNumber,
            entryDate: result.entryDate,
            periodId: result.periodId,
            status: result.status,
            description: result.description,
            sourceModule: result.sourceModule,
            sourceId: result.sourceId,
            createdBy: result.createdBy,
            createdAt: result.createdAt,
            lines: result.lines.map((line: any) => ({
              ...line,
              debit: parseFloat(line.debit),
              credit: parseFloat(line.credit),
            })),
          },
        },
        { status: 201 }
      )
    } catch (error: any) {
      await query('ROLLBACK')
      
      // Handle unique constraint violation more gracefully
      if (error.code === '23505' && error.constraint === 'JournalEntry_sourceModule_sourceId_key') {
        return NextResponse.json(
          { error: 'Journal entry already exists for this source' },
          { status: 409 }
        )
      }
      
      throw error
    }
  } catch (error) {
    console.error('Error creating journal entry:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create journal entry' },
      { status: 500 }
    )
  }
})
