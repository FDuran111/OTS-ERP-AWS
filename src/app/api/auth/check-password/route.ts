import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken, comparePassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Get user from token
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userPayload = verifyToken(token)
    const userId = userPayload.id

    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 })
    }

    // Get user's current password hash
    const result = await query(
      'SELECT password FROM "User" WHERE id = $1',
      [userId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isValid = await comparePassword(password, result.rows[0].password)

    return NextResponse.json({ 
      valid: isValid,
      message: isValid ? 'Password is correct' : 'Password is incorrect'
    })

  } catch (error) {
    console.error('Password check error:', error)
    return NextResponse.json(
      { error: 'Failed to check password' },
      { status: 500 }
    )
  }
}