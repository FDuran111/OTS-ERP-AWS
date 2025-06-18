import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET all users (for crew assignment)
export async function GET() {
  try {
    const usersResult = await query(
      `SELECT id, name, email, role
       FROM "User" 
       WHERE active = true 
       ORDER BY name ASC`
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