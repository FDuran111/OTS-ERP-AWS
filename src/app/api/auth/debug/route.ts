import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  const allCookies = request.cookies.getAll()
  
  console.log('Auth debug - all cookies:', allCookies.map(c => ({ name: c.name, hasValue: !!c.value })))
  console.log('Auth debug - auth-token present:', !!token)
  
  if (!token) {
    return NextResponse.json({ 
      authenticated: false, 
      error: 'No token found',
      cookies: allCookies.map(c => ({ name: c.name, present: true })),
      headers: {
        host: request.headers.get('host'),
        cookie: request.headers.get('cookie'),
        origin: request.headers.get('origin')
      }
    })
  }
  
  try {
    const user = verifyToken(token)
    return NextResponse.json({ 
      authenticated: true, 
      user,
      tokenPresent: true,
      tokenLength: token.length 
    })
  } catch (error) {
    return NextResponse.json({ 
      authenticated: false, 
      error: error instanceof Error ? error.message : 'Invalid token',
      tokenPresent: true,
      tokenLength: token.length
    })
  }
}