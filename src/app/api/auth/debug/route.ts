import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  
  if (!token) {
    return NextResponse.json({ 
      authenticated: false, 
      error: 'No token found',
      cookies: request.cookies.getAll() 
    })
  }
  
  try {
    const user = verifyToken(token)
    return NextResponse.json({ 
      authenticated: true, 
      user,
      tokenPresent: true 
    })
  } catch (error) {
    return NextResponse.json({ 
      authenticated: false, 
      error: 'Invalid token',
      tokenPresent: true 
    })
  }
}