import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get all active users
    const result = await query(
      `SELECT 
        email, 
        name, 
        role, 
        active,
        "createdAt"
      FROM "User" 
      WHERE active = true 
      ORDER BY role, name`
    )

    return NextResponse.json({
      users: result.rows,
      count: result.rows.length
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}