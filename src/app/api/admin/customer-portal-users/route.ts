import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createCustomerPortalUser } from '@/lib/customer-auth'

const createUserSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phoneNumber: z.string().optional(),
})

// POST - Create customer portal user (admin only)
export async function POST(request: NextRequest) {
  try {
    // Note: In a real app, you'd verify admin authentication here
    // For now, we'll allow creation for testing purposes
    
    const body = await request.json()
    const userData = createUserSchema.parse(body)

    const user = await createCustomerPortalUser(userData)

    return NextResponse.json({
      success: true,
      message: 'Customer portal user created successfully',
      user: {
        id: user.id,
        customerId: user.customerId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error creating customer portal user:', error)

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

    if (error.message.includes('already exists')) {
      return NextResponse.json(
        { success: false, error: 'Customer portal user already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create customer portal user' },
      { status: 500 }
    )
  }
}