import { NextRequest, NextResponse } from 'next/server'
import { getCustomerPortalUserByToken, logoutCustomerPortalUser, verifyCustomerToken } from '@/lib/customer-auth'

export async function POST(request: NextRequest) {
  try {
    // Get token from cookie or Authorization header
    const cookieToken = request.cookies.get('customer-auth-token')?.value
    const authHeader = request.headers.get('authorization')
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    
    const token = cookieToken || headerToken

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      )
    }

    try {
      // Verify token and get session ID
      const decoded = verifyCustomerToken(token)
      
      // Invalidate session
      await logoutCustomerPortalUser(decoded.sessionId)

      // Create response
      const response = NextResponse.json({
        success: true,
        message: 'Logged out successfully'
      })

      // Clear cookie
      response.cookies.set('customer-auth-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      })

      console.log('Customer portal logout successful:', {
        userId: decoded.id,
        sessionId: decoded.sessionId
      })

      return response

    } catch (tokenError) {
      // Token is invalid, but still clear the cookie
      const response = NextResponse.json({
        success: true,
        message: 'Logged out successfully'
      })

      response.cookies.set('customer-auth-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      })

      return response
    }

  } catch (error) {
    console.error('Customer portal logout error:', error)
    
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    )
  }
}