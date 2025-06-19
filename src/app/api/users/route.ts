import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET all users (for crew assignment)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roleFilter = searchParams.get('role')

    let whereClause = 'WHERE active = true'
    const params: any[] = []
    let paramIndex = 1

    if (roleFilter) {
      const roles = roleFilter.split(',').map(r => {
        const role = r.trim().toUpperCase()
        // Map common role names to actual enum values
        switch (role) {
          case 'TECHNICIAN':
          case 'FOREMAN':
          case 'APPRENTICE':
          case 'HELPER':
          case 'FIELD':
            return 'FIELD_CREW'
          case 'ADMIN':
          case 'MANAGER':
            return 'ADMIN'
          case 'OFFICE':
          case 'DISPATCH':
            return 'OFFICE'
          default:
            return role
        }
      })
      const uniqueRoles = [...new Set(roles)] // Remove duplicates
      const rolePlaceholders = uniqueRoles.map(() => `$${paramIndex++}`).join(', ')
      whereClause += ` AND role::text IN (${rolePlaceholders})`
      params.push(...uniqueRoles)
    }

    const usersResult = await query(
      `SELECT id, name, email, role
       FROM "User" 
       ${whereClause}
       ORDER BY name ASC`,
      params
    )

    return NextResponse.json(usersResult.rows)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}