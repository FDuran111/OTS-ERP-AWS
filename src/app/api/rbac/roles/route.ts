import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { withRBAC } from '@/lib/rbac-middleware'
import { z } from 'zod'

const createRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(100, 'Role name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  level: z.number().int('Level must be an integer').min(1, 'Level must be at least 1').max(100, 'Level cannot exceed 100'),
  permissionIds: z.array(z.string().regex(/^[a-z_]+\.[a-z_]+$/, 'Permission ID must be in format: category.action (e.g., jobs.read)')).optional().default([])
})

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
    
    // Validate input using Zod schema
    const validation = createRoleSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid input', 
          details: validation.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400 }
      )
    }

    const { name, description, level, permissionIds } = validation.data

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
