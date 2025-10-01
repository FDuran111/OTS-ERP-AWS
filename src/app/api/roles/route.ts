import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

// GET all roles
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

    const result = await query(
      'SELECT * FROM "Role" ORDER BY "isSystem" DESC, name ASC'
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching roles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    )
  }
}

// POST new role
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

    // Only OWNER_ADMIN can create roles
    if (currentUser.role !== 'OWNER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, permissions, color } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Role name is required' },
        { status: 400 }
      )
    }

    const result = await query(
      `INSERT INTO "Role" (name, description, permissions, color, "isSystem")
       VALUES ($1, $2, $3, $4, false)
       RETURNING *`,
      [name, description || null, JSON.stringify(permissions || []), color || null]
    )

    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    console.error('Error creating role:', error)
    if (error.code === '23505') { // Unique violation
      return NextResponse.json(
        { error: 'A role with this name already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create role' },
      { status: 500 }
    )
  }
}