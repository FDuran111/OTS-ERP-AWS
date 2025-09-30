import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { withRBAC } from '@/lib/rbac-middleware'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export const DELETE = withRBAC({ 
  requiredPermissions: 'rbac.manage' 
})(async (request, { params }) => {
  try {
    const { id: roleId, permissionId } = await params

    const roleCheck = await pool.query(
      'SELECT "isSystem" FROM "Role" WHERE id = $1',
      [roleId]
    )

    if (roleCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      )
    }

    if (roleCheck.rows[0].isSystem) {
      return NextResponse.json(
        { error: 'Cannot modify permissions of system role' },
        { status: 403 }
      )
    }

    const result = await pool.query(
      'DELETE FROM "RolePermission" WHERE "roleId" = $1 AND "permissionId" = $2 RETURNING id',
      [roleId, permissionId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Permission not found in role' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing permission from role:', error)
    return NextResponse.json(
      { error: 'Failed to remove permission' },
      { status: 500 }
    )
  }
})
