import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

// PUT update role
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is authenticated
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let currentUser
    try {
      currentUser = verifyToken(token)
    } catch (e) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Only OWNER_ADMIN can update roles
    if (currentUser.role !== 'OWNER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, permissions } = body

    // Check if role is a system role
    const checkResult = await query(
      'SELECT "isSystem" FROM "Role" WHERE id = $1',
      [params.id]
    )

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    if (checkResult.rows[0].isSystem) {
      return NextResponse.json(
        { error: 'Cannot modify system roles' },
        { status: 403 }
      )
    }

    const result = await query(
      `UPDATE "Role"
       SET name = $1, description = $2, permissions = $3, "updatedAt" = CURRENT_TIMESTAMP
       WHERE id = $4 AND "isSystem" = false
       RETURNING *`,
      [name, description || null, JSON.stringify(permissions || []), params.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    console.error('Error updating role:', error)
    if (error.code === '23505') { // Unique violation
      return NextResponse.json(
        { error: 'A role with this name already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update role' },
      { status: 500 }
    )
  }
}

// DELETE role
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is authenticated
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let currentUser
    try {
      currentUser = verifyToken(token)
    } catch (e) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Only OWNER_ADMIN can delete roles
    if (currentUser.role !== 'OWNER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if role is a system role or has assignments
    const checkResult = await query(
      'SELECT "isSystem" FROM "Role" WHERE id = $1',
      [params.id]
    )

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    if (checkResult.rows[0].isSystem) {
      return NextResponse.json(
        { error: 'Cannot delete system roles' },
        { status: 403 }
      )
    }

    // Check if role has any assignments
    const assignmentsResult = await query(
      'SELECT COUNT(*) as count FROM "RoleAssignment" WHERE "roleId" = $1',
      [params.id]
    )

    if (parseInt(assignmentsResult.rows[0].count) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete role with active assignments. Please reassign users first.' },
        { status: 400 }
      )
    }

    // Delete the role
    const result = await query(
      'DELETE FROM "Role" WHERE id = $1 AND "isSystem" = false RETURNING id',
      [params.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, id: params.id })
  } catch (error) {
    console.error('Error deleting role:', error)
    return NextResponse.json(
      { error: 'Failed to delete role' },
      { status: 500 }
    )
  }
}