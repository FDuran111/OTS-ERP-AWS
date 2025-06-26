import { NextRequest, NextResponse } from 'next/server'
import { getCustomerPortalUserByToken, CustomerPortalUserWithCustomer } from './customer-auth'

export interface CustomerAuthenticatedRequest extends NextRequest {
  customerUser?: CustomerPortalUserWithCustomer
}

export async function withCustomerAuth(
  handler: (request: CustomerAuthenticatedRequest) => Promise<NextResponse>,
  options: { required?: boolean } = { required: true }
) {
  return async (request: NextRequest) => {
    try {
      // Get token from cookie or Authorization header
      const cookieToken = request.cookies.get('customer-auth-token')?.value
      const authHeader = request.headers.get('authorization')
      const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
      
      const token = cookieToken || headerToken

      if (!token) {
        if (options.required) {
          return NextResponse.json(
            { success: false, error: 'Authentication required' },
            { status: 401 }
          )
        }
        // Continue without authentication
        return handler(request as CustomerAuthenticatedRequest)
      }

      // Verify token and get user
      const user = await getCustomerPortalUserByToken(token)

      if (!user) {
        if (options.required) {
          return NextResponse.json(
            { success: false, error: 'Invalid or expired token' },
            { status: 401 }
          )
        }
        // Continue without authentication
        return handler(request as CustomerAuthenticatedRequest)
      }

      // Add user to request
      const authenticatedRequest = request as CustomerAuthenticatedRequest
      authenticatedRequest.customerUser = user

      return handler(authenticatedRequest)

    } catch (error) {
      console.error('Customer authentication middleware error:', error)
      
      if (options.required) {
        return NextResponse.json(
          { success: false, error: 'Authentication failed' },
          { status: 401 }
        )
      }
      
      // Continue without authentication if not required
      return handler(request as CustomerAuthenticatedRequest)
    }
  }
}

// Helper function to create authenticated route handlers
export function createCustomerAuthHandler(
  handler: (request: CustomerAuthenticatedRequest, user: CustomerPortalUserWithCustomer) => Promise<NextResponse>
) {
  return withCustomerAuth(async (request: CustomerAuthenticatedRequest) => {
    if (!request.customerUser) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      )
    }
    
    return handler(request, request.customerUser)
  })
}

// Helper to get current customer user from request
export function getCurrentCustomerUser(request: CustomerAuthenticatedRequest): CustomerPortalUserWithCustomer | null {
  return request.customerUser || null
}