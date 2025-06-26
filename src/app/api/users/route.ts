import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

// GET all users (for crew assignment and user management)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roleFilter = searchParams.get('role')
    const includeInactive = searchParams.get('includeInactive') === 'true'
    
    // Check if user is authenticated
    const token = request.cookies.get('auth-token')?.value
    let currentUser = null
    
    if (token) {
      try {
        currentUser = verifyToken(token)
      } catch (e) {
        // Token invalid, continue without auth
      }
    }

    // For user management (OWNER_ADMIN requesting all data)
    if (currentUser?.role === 'OWNER_ADMIN' && !roleFilter) {
      const result = await query(
        `SELECT id, name, email, role, phone, active, "createdAt" 
         FROM "User" 
         ORDER BY active DESC, role, name`
      )
      return NextResponse.json({ users: result.rows })
    }

    // For crew assignment and other uses
    let whereClause = includeInactive ? 'WHERE 1=1' : 'WHERE active = true'
    const params: any[] = []
    let paramIndex = 1

    if (roleFilter) {
      const roles = roleFilter.split(',').map(r => {
        const role = r.trim().toUpperCase()
        // Map common role names to actual enum values
        switch (role) {
          case 'TECHNICIAN':
          case 'APPRENTICE':
          case 'HELPER':
          case 'FIELD':
          case 'FIELD_CREW':
          case 'VIEWER':
            return 'EMPLOYEE'
          case 'ADMIN':
          case 'MANAGER':
          case 'OWNER':
            return 'OWNER_ADMIN'
          case 'OFFICE':
          case 'DISPATCH':
          case 'FOREMAN':
            return 'FOREMAN'
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