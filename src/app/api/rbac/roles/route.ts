import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { withRBAC } from '@/lib/rbac-middleware'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export const GET = withRBAC({ 
  requiredPermissions: 'rbac.view' 
})(async (request) => {
  try {
    const { searchParams } = new URL(request.url)
    const includePermissions = searchParams.get('includePermissions') === 'true'

    if (includePermissions) {
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
                'grantedAt', rp."createdAt"
              )
            ) FILTER (WHERE rp.id IS NOT NULL),
            '[]'
          ) as permissions
        FROM "Role" r
        LEFT JOIN "RolePermission" rp ON r.id = rp."roleId"
        LEFT JOIN "Permission" p ON rp."permissionId" = p.id
        WHERE r."isActive" = true
        GROUP BY r.id
        ORDER BY r.level DESC, r.name
      `)
      return NextResponse.json(result.rows)
    }

    const result = await pool.query(`
      SELECT * FROM "Role" 
      WHERE "isActive" = true 
      ORDER BY level DESC, name
    `)
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching roles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    )
  }
})

export const POST = withRBAC({ 
  requiredPermissions: 'rbac.manage' 
})(async (request) => {
  try {
    const body = await request.json()
    const { name, description, level, permissionIds = [] } = body

    if (!name || level === undefined) {
      return NextResponse.json(
        { error: 'Name and level are required' },
        { status: 400 }
      )
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const roleResult = await client.query(
        `INSERT INTO "Role" (name, description, level, "isSystem", "isActive")
         VALUES ($1, $2, $3, false, true)
         RETURNING *`,
        [name, description || null, level]
      )

      const newRole = roleResult.rows[0]

      if (permissionIds.length > 0) {
        // Use UNNEST for safe parameterized bulk insert - prevents SQL injection
        await client.query(`
          INSERT INTO "RolePermission" ("roleId", "permissionId", "grantedBy")
          SELECT $1, unnest($2::text[]), $3
        `, [newRole.id, permissionIds, request.user.id])
      }

      await client.query('COMMIT')

      const fullRoleResult = await client.query(`
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
      `, [newRole.id])

      return NextResponse.json(fullRoleResult.rows[0], { status: 201 })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error creating role:', error)
    return NextResponse.json(
      { error: 'Failed to create role' },
      { status: 500 }
    )
  }
})
