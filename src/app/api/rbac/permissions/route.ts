import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { withRBAC } from '@/lib/rbac-middleware'
import { z } from 'zod'

const createPermissionSchema = z.object({
  id: z.string().min(1, 'Permission ID is required').max(100, 'ID too long').regex(/^[a-z_]+\.[a-z_]+$/, 'ID must be in format: category.action (e.g., jobs.read)'),
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  category: z.string().min(1, 'Category is required').max(50, 'Category too long')
})

export const GET = withRBAC({ 
  requiredPermissions: 'rbac.view' 
})(async (request) => {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const includeUsage = searchParams.get('includeUsage') === 'true'

    let query = 'SELECT * FROM "Permission"'
    const params: any[] = []

    if (category) {
      query += ' WHERE category = $1'
      params.push(category)
    }

    query += ' ORDER BY category, name'

    const result = await pool.query(query, params)

    if (includeUsage) {
      const permissionsWithUsage = await Promise.all(
        result.rows.map(async (permission) => {
          const roleCount = await pool.query(
            'SELECT COUNT(*) as count FROM "RolePermission" WHERE "permissionId" = $1',
            [permission.id]
          )
          const userCount = await pool.query(
            'SELECT COUNT(*) as count FROM "UserPermission" WHERE "permissionId" = $1 AND granted = true',
            [permission.id]
          )
          return {
            ...permission,
            usage: {
              roles: parseInt(roleCount.rows[0].count),
              users: parseInt(userCount.rows[0].count)
            }
          }
        })
      )
      return NextResponse.json(permissionsWithUsage)
    }

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching permissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
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
    const validation = createPermissionSchema.safeParse(body)
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

    const { id, name, description, category } = validation.data

    const exists = await pool.query(
      'SELECT id FROM "Permission" WHERE id = $1',
      [id]
    )

    if (exists.rows.length > 0) {
      return NextResponse.json(
        { error: 'Permission with this ID already exists' },
        { status: 409 }
      )
    }

    const result = await pool.query(
      `INSERT INTO "Permission" (id, name, description, category, "isSystem")
       VALUES ($1, $2, $3, $4, false)
       RETURNING *`,
      [id, name, description || null, category]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('Error creating permission:', error)
    return NextResponse.json(
      { error: 'Failed to create permission' },
      { status: 500 }
    )
  }
})
