import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { withRBAC } from '@/lib/rbac-middleware'

export const GET = withRBAC({ 
  requiredPermissions: 'audit_logs.view' 
})(async (request) => {
  try {
    const { searchParams } = new URL(request.url)
    
    const pageParam = searchParams.get('page') || '1'
    const limitParam = searchParams.get('limit') || '50'
    
    const parsedPage = parseInt(pageParam)
    const parsedLimit = parseInt(limitParam)
    
    if (isNaN(parsedPage) || parsedPage < 1) {
      return NextResponse.json(
        { error: 'Invalid page number. Must be a positive integer.' },
        { status: 400 }
      )
    }
    
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return NextResponse.json(
        { error: 'Invalid limit. Must be an integer between 1 and 100.' },
        { status: 400 }
      )
    }
    
    const page = parsedPage
    const limit = parsedLimit
    const offset = (page - 1) * limit
    
    const userId = searchParams.get('userId')
    const performedBy = searchParams.get('performedBy')
    const action = searchParams.get('action')
    const resource = searchParams.get('resource')
    const severity = searchParams.get('severity')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const sortBy = searchParams.get('sortBy') || 'timestamp'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const conditions: string[] = []
    const params: any[] = []
    let paramCount = 1

    if (userId) {
      conditions.push(`"userId" = $${paramCount++}`)
      params.push(userId)
    }

    if (performedBy) {
      conditions.push(`"performedBy" = $${paramCount++}`)
      params.push(performedBy)
    }

    if (action) {
      conditions.push(`action = $${paramCount++}`)
      params.push(action)
    }

    if (resource) {
      conditions.push(`resource = $${paramCount++}`)
      params.push(resource)
    }

    if (severity) {
      conditions.push(`severity = $${paramCount++}`)
      params.push(severity)
    }

    if (startDate) {
      conditions.push(`timestamp >= $${paramCount++}`)
      params.push(startDate)
    }

    if (endDate) {
      conditions.push(`timestamp <= $${paramCount++}`)
      params.push(endDate)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const allowedSortColumns = ['timestamp', 'action', 'resource', 'severity', 'userId', 'performedBy']
    const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'timestamp'
    const sortDirection = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC'
    
    const quotedSortColumn = ['userId', 'performedBy', 'resourceId', 'oldValue', 'newValue', 'ipAddress', 'userAgent'].includes(sortColumn)
      ? `"${sortColumn}"`
      : sortColumn

    const countQuery = `SELECT COUNT(*) as total FROM "AuditLog" ${whereClause}`
    const countResult = await pool.query(countQuery, params)
    const total = parseInt(countResult.rows[0].total)

    const dataQuery = `
      SELECT * FROM "AuditLog"
      ${whereClause}
      ORDER BY ${quotedSortColumn} ${sortDirection}
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `
    const dataResult = await pool.query(dataQuery, [...params, limit, offset])

    return NextResponse.json({
      logs: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + limit < total
      },
      filters: {
        userId,
        performedBy,
        action,
        resource,
        severity,
        startDate,
        endDate
      }
    })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
})
