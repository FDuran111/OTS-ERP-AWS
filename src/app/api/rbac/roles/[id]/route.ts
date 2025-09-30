import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { withRBAC } from '@/lib/rbac-middleware'

export const GET = withRBAC({ 
  requiredPermissions: 'rbac.view' 
})(async (request, { params }) => {
  try {
    const { id } = await params

    const result = await pool.query(`
      SELECT 
        r.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', rp.id,
              'permissionId', rp."permissionId",
              'permissionName', p.name,
              'permissionCategory', p.category,
              'permissionDescription', p.description
            )
          ) FILTER (WHERE rp.id IS NOT NULL),
          '[]'
        ) as permissions
      FROM "Role" r
      LEFT JOIN "RolePermission" rp ON r.id = rp."roleId"
      LEFT JOIN "Permission" p ON rp."permissionId" = p.id
      WHERE r.id = $1
      GROUP BY r.id
    `, [id])

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching role:', error)
    return NextResponse.json(
      { error: 'Failed to fetch role' },
      { status: 500 }
    )
  }
})

export const PUT = withRBAC({ 
  requiredPermissions: 'rbac.manage' 
})(async (request, { params }) => {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, level, isActive } = body

    const checkResult = await pool.query(
      'SELECT "isSystem" FROM "Role" WHERE id = $1',
      [id]
    )

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      )
    }

    if (checkResult.rows[0].isSystem) {
      return NextResponse.json(
        { error: 'Cannot modify system role' },
        { status: 403 }
      )
    }

    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`)
      values.push(name)
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`)
      values.push(description)
    }
    if (level !== undefined) {
      updates.push(`level = $${paramCount++}`)
      values.push(level)
    }
    if (isActive !== undefined) {
      updates.push(`"isActive" = $${paramCount++}`)
      values.push(isActive)
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    values.push(id)
    const result = await pool.query(
      `UPDATE "Role" SET ${updates.join(', ')}, "updatedAt" = NOW() 
       WHERE id = $${paramCount} 
       RETURNING *`,
      values
    )

    const fullRoleResult = await pool.query(`
      SELECT 
        r.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', rp.id,
              'permissionId', rp."permissionId",
              'permissionName', p.name
            )
          ) FILTER (WHERE rp.id IS NOT NULL),
          '[]'
        ) as permissions
      FROM "Role" r
      LEFT JOIN "RolePermission" rp ON r.id = rp."roleId"
      LEFT JOIN "Permission" p ON rp."permissionId" = p.id
      WHERE r.id = $1
      GROUP BY r.id
    `, [id])

    return NextResponse.json(fullRoleResult.rows[0])
  } catch (error) {
    console.error('Error updating role:', error)
    return NextResponse.json(
      { error: 'Failed to update role' },
      { status: 500 }
    )
  }
})

export const DELETE = withRBAC({ 
  requiredPermissions: 'rbac.manage' 
})(async (request, { params }) => {
  try {
    const { id } = await params

    const checkResult = await pool.query(
      'SELECT "isSystem" FROM "Role" WHERE id = $1',
      [id]
    )

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      )
    }

    if (checkResult.rows[0].isSystem) {
      return NextResponse.json(
        { error: 'Cannot delete system role' },
        { status: 403 }
      )
    }

    const usageCheck = await pool.query(
      'SELECT COUNT(*) as count FROM "User" WHERE role = (SELECT name FROM "Role" WHERE id = $1)',
      [id]
    )

    if (parseInt(usageCheck.rows[0].count) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete role that is assigned to users' },
        { status: 400 }
      )
    }

    await pool.query('DELETE FROM "Role" WHERE id = $1', [id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting role:', error)
    return NextResponse.json(
      { error: 'Failed to delete role' },
      { status: 500 }
    )
  }
})
