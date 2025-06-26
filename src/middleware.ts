import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Handle customer portal routes separately
  if (pathname.startsWith('/customer-portal')) {
    const customerToken = request.cookies.get('customer-auth-token')?.value
    
    // Customer portal public routes
    const customerPublicRoutes = ['/customer-portal/login']
    const isCustomerPublicRoute = customerPublicRoutes.some(route => pathname.startsWith(route))
    
    if (isCustomerPublicRoute) {
      return NextResponse.next()
    }
    
    // For protected customer portal routes, check customer token
    if (!customerToken) {
      const loginUrl = new URL('/customer-portal/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
    
    return NextResponse.next()
  }

  // Handle customer portal API routes
  if (pathname.startsWith('/api/customer-portal')) {
    // Allow all customer portal API routes (they handle their own auth)
    return NextResponse.next()
  }

  // Handle internal admin routes
  const token = request.cookies.get('auth-token')?.value

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/api/auth/login', '/api/auth/logout', '/api/auth/debug', '/test-dashboard']
  
  // Check if the current path is a public route
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  
  // If it's a public route, allow access
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // For protected routes, check if user has a token
  if (!token) {
    // Redirect to login if no token
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Token exists, allow access
  // Note: We're not validating the token here to avoid issues
  // Token validation happens in API routes and page components
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}