import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { withRBAC } from '@/lib/rbac-middleware'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export const POST = withRBAC({ 
  requiredPermissions: 'rbac.manage' 
})(async (request, { params }) => {
  try {
    const { id: roleId } = await params
    const body = await request.json()
    const { permissionId, permissionIds } = body

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

    const idsToAdd = permissionIds || [permissionId]

    if (!idsToAdd || idsToAdd.length === 0) {
      return NextResponse.json(
        { error: 'permissionId or permissionIds required' },
        { status: 400 }
      )
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const added = []
      const skipped = []

      for (const pid of idsToAdd) {
        const exists = await client.query(
          'SELECT id FROM "RolePermission" WHERE "roleId" = $1 AND "permissionId" = $2',
          [roleId, pid]
        )

        if (exists.rows.length > 0) {
          skipped.push(pid)
          continue
        }

        await client.query(
          `INSERT INTO "RolePermission" ("roleId", "permissionId", "grantedBy")
           VALUES ($1, $2, $3)`,
          [roleId, pid, request.user.id]
        )
        added.push(pid)
      }

      await client.query('COMMIT')

      return NextResponse.json({ 
        success: true, 
        added,
        skipped,
        message: `Added ${added.length} permission(s), skipped ${skipped.length} duplicate(s)`
      })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error adding permission to role:', error)
    return NextResponse.json(
      { error: 'Failed to add permission' },
      { status: 500 }
    )
  }
})
