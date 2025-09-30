import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { withRBAC } from '@/lib/rbac-middleware'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export const DELETE = withRBAC({ 
  requiredPermissions: 'rbac.manage' 
})(async (request, { params }) => {
  try {
    const { id: userId, permissionId } = await params

    const result = await pool.query(
      'DELETE FROM "UserPermission" WHERE "userId" = $1 AND "permissionId" = $2 RETURNING id',
      [userId, permissionId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'User permission not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user permission:', error)
    return NextResponse.json(
      { error: 'Failed to delete permission' },
      { status: 500 }
    )
  }
})
