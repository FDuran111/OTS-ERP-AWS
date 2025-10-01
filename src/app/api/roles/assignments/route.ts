import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

// GET all role assignments
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      verifyToken(token)
    } catch (e) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const result = await query(`
      SELECT
        ra.*,
        u.name as user_name,
        u.email as user_email,
        r.name as role_name,
        r.display_name as role_display_name
      FROM "RoleAssignment" ra
      JOIN "User" u ON ra.user_id = u.id
      JOIN "Role" r ON ra.role_id = r.id
      ORDER BY ra.assigned_at DESC
    `)

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching role assignments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch role assignments' },
      { status: 500 }
    )
  }
}

// POST new role assignment(s)
export async function POST(request: NextRequest) {
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

    // Only OWNER_ADMIN can assign roles
    if (currentUser.role !== 'OWNER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { user_id, role_ids } = body

    if (!user_id || !role_ids || !Array.isArray(role_ids)) {
      return NextResponse.json(
        { error: 'user_id and role_ids array are required' },
        { status: 400 }
      )
    }

    // First, remove existing assignments for this user
    await query(
      'DELETE FROM "RoleAssignment" WHERE user_id = $1',
      [user_id]
    )

    // Then, create new assignments
    const assignments = []
    for (const role_id of role_ids) {
      const result = await query(
        `INSERT INTO "RoleAssignment" (user_id, role_id, assigned_by)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [user_id, role_id, currentUser.id]
      )
      assignments.push(result.rows[0])
    }

    return NextResponse.json(assignments)
  } catch (error: any) {
    console.error('Error creating role assignment:', error)
    if (error.code === '23503') { // Foreign key violation
      return NextResponse.json(
        { error: 'Invalid user_id or role_id' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create role assignment' },
      { status: 500 }
    )
  }
}
