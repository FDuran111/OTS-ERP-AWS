import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const registerSchema = z.object({
  customerId: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = registerSchema.parse(body)

    // Check if customer exists
    const customerCheck = await query(
      'SELECT id, email FROM "Customer" WHERE id = $1',
      [data.customerId]
    )

    if (customerCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    const customer = customerCheck.rows[0]

    // Check if customer portal account already exists
    const existingAuth = await query(
      'SELECT id FROM "CustomerAuth" WHERE "customerId" = $1 OR email = $2',
      [data.customerId, data.email]
    )

    if (existingAuth.rows.length > 0) {
      return NextResponse.json(
        { error: 'Customer portal account already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12)

    // Create customer portal account
    const authResult = await query(`
      INSERT INTO "CustomerAuth" (
        "customerId", email, "passwordHash", "isActive"
      ) VALUES ($1, $2, $3, true)
      RETURNING id, email, "emailVerified"
    `, [data.customerId, data.email, passwordHash])

    // Create default portal settings
    await query(`
      INSERT INTO "CustomerPortalSettings" ("customerId")
      VALUES ($1)
    `, [data.customerId])

    // Log account creation activity
    await query(`
      INSERT INTO "CustomerActivity" (
        "customerId", "activityType", description
      ) VALUES ($1, $2, $3)
    `, [
      data.customerId, 
      'ACCOUNT_CREATED', 
      'Customer portal account created'
    ])

    const newAuth = authResult.rows[0]

    return NextResponse.json({
      success: true,
      message: 'Customer portal account created successfully',
      data: {
        id: newAuth.id,
        email: newAuth.email,
        emailVerified: newAuth.emailVerified
      }
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating customer portal account:', error)
    return NextResponse.json(
      { error: 'Failed to create customer portal account' },
      { status: 500 }
    )
  }
}