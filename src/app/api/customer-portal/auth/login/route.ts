import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateCustomerPortalUser } from '@/lib/customer-auth'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = loginSchema.parse(body)

    // Get client IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                     request.headers.get('x-real-ip') ||
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Authenticate user
    const { user, token, session } = await authenticateCustomerPortalUser(
      email,
      password,
      ipAddress,
      userAgent
    )

    // Create response with user data
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        isEmailVerified: user.isEmailVerified,
        customer: user.customer
      },
      token
    })

    // Set secure HTTP-only cookie
    const isSecure = request.headers.get('x-forwarded-proto') === 'https' || 
                     request.url.startsWith('https://') ||
                     (process.env.NODE_ENV === 'production' && process.env.FORCE_HTTPS === 'true')

    response.cookies.set('customer-auth-token', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    console.log('Customer portal login successful:', {
      email: user.email,
      customerId: user.customerId,
      ipAddress,
      sessionId: session.id
    })

    return response

  } catch (error: any) {
    console.error('Customer portal login error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid input data', 
          details: error.errors 
        },
        { status: 400 }
      )
    }

    // Return generic error message for security
    const errorMessage = error.message.includes('locked') 
      ? error.message 
      : 'Invalid email or password'

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 401 }
    )
  }
}