import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { withRBAC } from '@/lib/rbac-middleware'

export const PUT = withRBAC({ 
  requiredPermissions: 'rbac.manage' 
})(async (request, { params }) => {
  try {
    const { id: userId } = await params
    const body = await request.json()
    const { role } = body

    if (!role) {
      return NextResponse.json(
        { error: 'role is required' },
        { status: 400 }
      )
    }

    const roleCheck = await pool.query(
      'SELECT id, "isActive" FROM "Role" WHERE name = $1',
      [role]
    )

    if (roleCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      )
    }

    if (!roleCheck.rows[0].isActive) {
      return NextResponse.json(
        { error: 'Cannot assign inactive role' },
        { status: 400 }
      )
    }

    const userCheck = await pool.query(
      'SELECT id, role as "currentRole" FROM "User" WHERE id = $1',
      [userId]
    )

    if (userCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (userCheck.rows[0].currentRole === role) {
      return NextResponse.json(
        { message: 'User already has this role', user: userCheck.rows[0] }
      )
    }

    const result = await pool.query(
      `UPDATE "User" 
       SET role = $1, "updatedAt" = NOW() 
       WHERE id = $2 
       RETURNING id, email, name, role, "createdAt", "updatedAt"`,
      [role, userId]
    )

    return NextResponse.json({
      success: true,
      user: result.rows[0],
      message: `User role updated from ${userCheck.rows[0].currentRole} to ${role}`
    })
  } catch (error) {
    console.error('Error updating user role:', error)
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    )
  }
})
