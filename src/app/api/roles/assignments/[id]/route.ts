import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

// DELETE role assignment
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

    // Only OWNER_ADMIN can remove role assignments
    if (currentUser.role !== 'OWNER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete the assignment
    const result = await query(
      'DELETE FROM "RoleAssignment" WHERE id = $1 RETURNING id',
      [params.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, id: params.id })
  } catch (error) {
    console.error('Error deleting role assignment:', error)
    return NextResponse.json(
      { error: 'Failed to delete role assignment' },
      { status: 500 }
    )
  }
}
