import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { queryAuditTrail } from '@/lib/audit-helper'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userPayload = verifyToken(token)
    const userRole = userPayload.role

    if (!['ADMIN', 'MANAGER', 'HR_MANAGER', 'OWNER_ADMIN', 'ACCOUNTANT'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    const filters = {
      entryId: searchParams.get('entryId') || undefined,
      userId: searchParams.get('userId') || undefined,
      jobId: searchParams.get('jobId') || undefined,
      action: searchParams.get('action') as any || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      correlationId: searchParams.get('correlationId') || undefined,
      limit: parseInt(searchParams.get('limit') || '100'),
      offset: parseInt(searchParams.get('offset') || '0'),
    }

    const auditEntries = await queryAuditTrail(filters)

    return NextResponse.json({
      success: true,
      count: auditEntries.length,
      filters,
      audits: auditEntries,
    })
  } catch (error: any) {
    console.error('Error querying audit trail:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to query audit trail' },
      { status: 500 }
    )
  }
}
