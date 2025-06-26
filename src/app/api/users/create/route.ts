import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { hashPassword, verifyToken } from '@/lib/auth'
import { z } from 'zod'

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['OWNER_ADMIN', 'FOREMAN', 'EMPLOYEE']),
  phone: z.string().optional(),
  active: z.boolean().default(true)
})

export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated and is OWNER_ADMIN
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = verifyToken(token)
    if (user.role !== 'OWNER_ADMIN') {
      return NextResponse.json(
        { error: 'Only Owner/Admin users can create new accounts' },
        { status: 403 }
      )
    }

    // Parse and validate the request body
    const body = await request.json()
    const validatedData = createUserSchema.parse(body)

    // Check if email already exists
    const existingUser = await query(
      'SELECT id FROM "User" WHERE email = $1',
      [validatedData.email]
    )

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      )
    }

    // Hash the password
    const hashedPassword = await hashPassword(validatedData.password)

    // Create the new user
    const result = await query(
      `INSERT INTO "User" (
        id, email, password, name, role, phone, active, "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING id, email, name, role, phone, active, "createdAt"`,
      [
        validatedData.email,
        hashedPassword,
        validatedData.name,
        validatedData.role,
        validatedData.phone || null,
        validatedData.active
      ]
    )

    const newUser = result.rows[0]

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        phone: newUser.phone,
        active: newUser.active,
        createdAt: newUser.createdAt
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating user:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}