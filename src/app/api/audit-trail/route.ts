import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { withRBAC } from '@/lib/rbac-middleware'

// GET - Fetch audit trail entries
// Fixed type casting for user_id fields
export const GET = withRBAC({
  requiredRoles: ['OWNER_ADMIN', 'FOREMAN']
})(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const entryId = searchParams.get('entryId')
    const userId = searchParams.get('userId')
    const action = searchParams.get('action')
    const changedBy = searchParams.get('changedBy')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build the query with filters
    let queryText = `
      SELECT
        a.*,
        u1.name as "userName",
        u2.name as "changedByName",
        j1."jobNumber" as "oldJobNumber",
        j2."jobNumber" as "newJobNumber"
      FROM "TimeEntryAudit" a
      LEFT JOIN "User" u1 ON a.user_id = u1.id
      LEFT JOIN "User" u2 ON a.changed_by = u2.id
      LEFT JOIN "Job" j1 ON a.old_job_id::text = j1.id
      LEFT JOIN "Job" j2 ON a.new_job_id::text = j2.id
      WHERE 1=1
    `
    const params: any[] = []
    let paramCount = 1

    if (entryId) {
      queryText += ` AND a.entry_id = $${paramCount++}`
      params.push(entryId)
    }

    if (userId) {
      queryText += ` AND a.user_id = $${paramCount++}`
      params.push(userId)
    }

    if (action) {
      queryText += ` AND a.action = $${paramCount++}`
      params.push(action)
    }

    if (changedBy) {
      queryText += ` AND (a.changed_by = $${paramCount} OR u2.name ILIKE $${paramCount + 1})`
      params.push(changedBy, `%${changedBy}%`)
      paramCount += 2
    }

    if (dateFrom) {
      queryText += ` AND a.changed_at >= $${paramCount++}::date`
      params.push(dateFrom)
    }

    if (dateTo) {
      queryText += ` AND a.changed_at <= $${paramCount++}::date + interval '1 day'`
      params.push(dateTo)
    }

    queryText += ` ORDER BY a.changed_at DESC LIMIT $${paramCount}`
    params.push(limit)

    const result = await query(queryText, params)

    // Transform the results to camelCase
    const transformedResults = result.rows.map(row => ({
      id: row.id,
      entryId: row.entry_id,
      userId: row.user_id,
      userName: row.userName,
      action: row.action,
      oldHours: row.old_hours ? parseFloat(row.old_hours) : null,
      newHours: row.new_hours ? parseFloat(row.new_hours) : null,
      oldRegular: row.old_regular ? parseFloat(row.old_regular) : null,
      newRegular: row.new_regular ? parseFloat(row.new_regular) : null,
      oldOvertime: row.old_overtime ? parseFloat(row.old_overtime) : null,
      newOvertime: row.new_overtime ? parseFloat(row.new_overtime) : null,
      oldDoubletime: row.old_doubletime ? parseFloat(row.old_doubletime) : null,
      newDoubletime: row.new_doubletime ? parseFloat(row.new_doubletime) : null,
      oldPay: row.old_pay ? parseFloat(row.old_pay) : null,
      newPay: row.new_pay ? parseFloat(row.new_pay) : null,
      oldJobId: row.old_job_id,
      newJobId: row.new_job_id,
      oldJobNumber: row.oldJobNumber,
      newJobNumber: row.newJobNumber,
      oldDate: row.old_date,
      newDate: row.new_date,
      oldDescription: row.old_description,
      newDescription: row.new_description,
      changedBy: row.changed_by,
      changedByName: row.changedByName,
      changedAt: row.changed_at,
      changeReason: row.change_reason,
      ipAddress: row.ip_address,
    }))

    return NextResponse.json(transformedResults)
  } catch (error) {
    console.error('Error fetching audit trail:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit trail' },
      { status: 500 }
    )
  }
})