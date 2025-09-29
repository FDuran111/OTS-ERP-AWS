import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname
    
    // Log request details for debugging
    const host = request.headers.get("host") || "";
    const xfProto = request.headers.get("x-forwarded-proto") || "";
    const xfHost = request.headers.get("x-forwarded-host") || "";
    const xfFor = request.headers.get("x-forwarded-for") || "";
    const ua = request.headers.get("user-agent") || "";
    
    // Handle internal admin routes - check both cookie and Authorization header
    let token = request.cookies.get('auth-token')?.value
    
    // Fallback to Authorization header if no cookie (for Replit environment)
    if (!token) {
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }

    // Public routes that don't require authentication
    const publicRoutes = ['/login', '/api/auth/login', '/api/auth/logout', '/api/auth/debug', '/api/auth/me', '/api/auth/test', '/api/users/list', '/api/migrate-roles', '/api/check-roles', '/test-dashboard', '/api/migrate/fix-crew-roles', '/api/healthz', '/api/public/forms']
    
    // Check if the current path is a public route
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
    
    // Emit a single-line structured log
    console.log(JSON.stringify({ 
      type: "mw", 
      path: pathname, 
      host, 
      xfProto, 
      xfHost, 
      xfFor,
      ua: ua.substring(0, 50), // Truncate user agent
      hasToken: !!token,
      isPublic: isPublicRoute,
      url: request.url
    }));
    
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
  } catch (error) {
    console.error("Middleware error:", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api/healthz (health check endpoint)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!api/healthz|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}