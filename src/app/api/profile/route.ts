import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { hashPassword, verifyToken } from '@/lib/auth'
import { z } from 'zod'

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
})

// GET current user's profile
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const currentUser = verifyToken(token)

    // Fetch full user details
    const result = await query(
      `SELECT id, email, name, role, phone, active, "createdAt", "updatedAt"
       FROM "User"
       WHERE id = $1`,
      [currentUser.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

// PATCH update current user's profile
export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const currentUser = verifyToken(token)
    const body = await request.json()
    const validatedData = updateProfileSchema.parse(body)

    // If updating email, check if it's already taken
    if (validatedData.email) {
      const emailCheck = await query(
        'SELECT id FROM "User" WHERE email = $1 AND id != $2',
        [validatedData.email, currentUser.id]
      )

      if (emailCheck.rows.length > 0) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 400 }
        )
      }
    }

    // If changing password, verify current password
    if (validatedData.newPassword) {
      if (!validatedData.currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required to set a new password' },
          { status: 400 }
        )
      }

      // Verify current password
      const userResult = await query(
        'SELECT password FROM "User" WHERE id = $1',
        [currentUser.id]
      )

      if (userResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      const bcrypt = require('bcryptjs')
      const isValidPassword = await bcrypt.compare(
        validatedData.currentPassword,
        userResult.rows[0].password
      )

      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400 }
        )
      }
    }

    // Build update query
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (validatedData.email !== undefined) {
      updates.push(`email = $${paramIndex}`)
      values.push(validatedData.email)
      paramIndex++
    }

    if (validatedData.name !== undefined) {
      updates.push(`name = $${paramIndex}`)
      values.push(validatedData.name)
      paramIndex++
    }

    if (validatedData.phone !== undefined) {
      updates.push(`phone = $${paramIndex}`)
      values.push(validatedData.phone || null)
      paramIndex++
    }

    if (validatedData.newPassword) {
      const hashedPassword = await hashPassword(validatedData.newPassword)
      updates.push(`password = $${paramIndex}`)
      values.push(hashedPassword)
      paramIndex++
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      )
    }

    // Always update the updatedAt timestamp
    updates.push(`"updatedAt" = CURRENT_TIMESTAMP`)

    // Add user ID as the last parameter
    values.push(currentUser.id)

    const updateQuery = `
      UPDATE "User"
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, name, role, phone, active, "createdAt", "updatedAt"
    `

    const result = await query(updateQuery, values)
    const updatedUser = result.rows[0]

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    })

  } catch (error) {
    console.error('Error updating profile:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
