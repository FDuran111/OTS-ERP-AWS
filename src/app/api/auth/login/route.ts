import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { comparePassword, generateToken } from '@/lib/auth'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export async function POST(request: NextRequest) {
  try {
    // Log environment check in production
    if (process.env.NODE_ENV === 'production') {
      console.log('Login attempt - Environment check:', {
        hasDB: !!process.env.DATABASE_URL,
        hasJWT: !!process.env.JWT_SECRET,
        nodeEnv: process.env.NODE_ENV
      })
    }

    const body = await request.json()
    const { email, password } = loginSchema.parse(body)

    // Find user by email
    const result = await query(
      'SELECT * FROM "User" WHERE email = $1',
      [email]
    )

    const user = result.rows[0]

    if (!user || !user.active) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const isValidPassword = await comparePassword(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })

    // Include token in response body for Replit environment (localStorage fallback)
    const responseData = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      // Always include token for frontend localStorage fallback
      token,
      success: true
    }

    const response = NextResponse.json(responseData)

    // Determine if we should use secure cookies
    // For Replit environment, use less restrictive settings for development
    const isProduction = process.env.NODE_ENV === 'production'
    const isLocalhost = request.headers.get('host')?.includes('localhost') || request.headers.get('host')?.includes('127.0.0.1')
    const isReplit = request.headers.get('host')?.includes('replit.dev') || request.headers.get('host')?.includes('replit.co')
    
    // Use secure cookies only in production, not in Replit development
    const isSecure = isProduction && !isReplit && !isLocalhost && (
      request.headers.get('x-forwarded-proto') === 'https' || 
      request.url.startsWith('https://') ||
      process.env.FORCE_HTTPS === 'true'
    )

    // Set HTTP-only cookie with Replit-compatible settings
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax', // Use 'lax' for better compatibility in all environments
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    console.log('Login successful for:', user.email)
    console.log('Cookie settings:', {
      secure: isSecure,
      isProduction,
      isLocalhost,
      host: request.headers.get('host'),
      proto: request.headers.get('x-forwarded-proto'),
      url: request.url
    })

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Login error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: error?.constructor?.name,
      details: error
    })
    
    // In production, check for specific database errors
    if (error instanceof Error && error.message.includes('Database')) {
      return NextResponse.json(
        { error: 'Database connection error. Please check server logs.' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}