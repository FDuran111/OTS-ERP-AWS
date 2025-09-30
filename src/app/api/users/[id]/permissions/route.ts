import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { withRBAC } from '@/lib/rbac-middleware'
import { z } from 'zod'

const grantPermissionSchema = z.object({
  permissionId: z.string().min(1, 'Permission ID is required'),
  granted: z.boolean().default(true),
  expiresAt: z.string().datetime('Invalid expiration date format').optional(),
  reason: z.string().max(500, 'Reason too long').optional()
})

export const GET = withRBAC({ 
  requiredPermissions: 'rbac.view' 
})(async (request, { params }) => {
  try {
    const { id: userId } = await params

    const result = await pool.query(`
      SELECT 
        up.*,
        p.name as "permissionName",
        p.category as "permissionCategory",
        p.description as "permissionDescription",
        gb.name as "grantedByName"
      FROM "UserPermission" up
      JOIN "Permission" p ON up."permissionId" = p.id
      LEFT JOIN "User" gb ON up."grantedBy" = gb.id
      WHERE up."userId" = $1
      ORDER BY p.category, p.name
    `, [userId])

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching user permissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user permissions' },
      { status: 500 }
    )
  }
})

export const POST = withRBAC({ 
  requiredPermissions: 'rbac.manage' 
})(async (request, { params }) => {
  try {
    const { id: userId } = await params
    const body = await request.json()
    
    // Validate input using Zod schema
    const validation = grantPermissionSchema.safeParse(body)
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

    const { permissionId, granted, expiresAt, reason } = validation.data

    const userCheck = await pool.query(
      'SELECT id FROM "User" WHERE id = $1',
      [userId]
    )

    if (userCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const permCheck = await pool.query(
      'SELECT id FROM "Permission" WHERE id = $1',
      [permissionId]
    )

    if (permCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      )
    }

    const existing = await pool.query(
      'SELECT id FROM "UserPermission" WHERE "userId" = $1 AND "permissionId" = $2',
      [userId, permissionId]
    )

    let result
    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE "UserPermission" 
         SET granted = $1, "expiresAt" = $2, reason = $3, "grantedBy" = $4, "updatedAt" = NOW()
         WHERE "userId" = $5 AND "permissionId" = $6
         RETURNING *`,
        [granted, expiresAt || null, reason || null, request.user.id, userId, permissionId]
      )
    } else {
      result = await pool.query(
        `INSERT INTO "UserPermission" ("userId", "permissionId", granted, "expiresAt", reason, "grantedBy")
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userId, permissionId, granted, expiresAt || null, reason || null, request.user.id]
      )
    }

    return NextResponse.json(result.rows[0], { 
      status: existing.rows.length > 0 ? 200 : 201 
    })
  } catch (error) {
    console.error('Error granting user permission:', error)
    return NextResponse.json(
      { error: 'Failed to grant permission' },
      { status: 500 }
    )
  }
})
