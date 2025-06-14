import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth-token')
  
  return NextResponse.json({
    hasToken: !!token,
    tokenValue: token?.value ? 'Token exists' : 'No token',
    cookies: request.cookies.getAll().map(c => ({ name: c.name, hasValue: !!c.value }))
  })
}