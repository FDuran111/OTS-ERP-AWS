import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userPayload = verifyToken(token)
    const userRole = userPayload.role

    // Get PO statistics
    const statsQuery = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'DRAFT') as draft,
        COUNT(*) FILTER (WHERE status = 'PENDING_APPROVAL') as "pendingApproval",
        COUNT(*) FILTER (WHERE status = 'APPROVED') as approved,
        COUNT(*) FILTER (WHERE status = 'SENT') as sent,
        COUNT(*) FILTER (WHERE status = 'RECEIVED') as received,
        COUNT(*) FILTER (WHERE EXTRACT(MONTH FROM "createdAt") = EXTRACT(MONTH FROM CURRENT_DATE)) as "totalThisMonth"
      FROM "PurchaseOrder"
      ${userRole === 'EMPLOYEE' ? 'WHERE "createdBy" = $1' : ''}
    `

    const params = userRole === 'EMPLOYEE' ? [userPayload.id] : []
    const result = await query(statsQuery, params)

    const stats = result.rows[0]

    return NextResponse.json({
      success: true,
      stats: {
        draft: parseInt(stats.draft) || 0,
        pendingApproval: parseInt(stats.pendingApproval) || 0,
        approved: parseInt(stats.approved) || 0,
        sent: parseInt(stats.sent) || 0,
        received: parseInt(stats.received) || 0,
        totalThisMonth: parseInt(stats.totalThisMonth) || 0,
        avgProcessingTime: 0
      }
    })

  } catch (error) {
    console.error('Error fetching PO stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}
