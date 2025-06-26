import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { hashPassword, verifyToken } from '@/lib/auth'
import { z } from 'zod'

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  name: z.string().min(2).optional(),
  role: z.enum(['OWNER_ADMIN', 'FOREMAN', 'EMPLOYEE']).optional(),
  phone: z.string().optional(),
  active: z.boolean().optional()
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  
  try {
    // Verify the user is authenticated and is OWNER_ADMIN
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const currentUser = verifyToken(token)
    if (currentUser.role !== 'OWNER_ADMIN') {
      return NextResponse.json(
        { error: 'Only Owner/Admin users can update accounts' },
        { status: 403 }
      )
    }

    const userId = resolvedParams.id
    
    // Parse and validate the request body
    const body = await request.json()
    const validatedData = updateUserSchema.parse(body)

    // Check if user exists
    const existingUser = await query(
      'SELECT id FROM "User" WHERE id = $1',
      [userId]
    )

    if (existingUser.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // If updating email, check if it's already taken
    if (validatedData.email) {
      const emailCheck = await query(
        'SELECT id FROM "User" WHERE email = $1 AND id != $2',
        [validatedData.email, userId]
      )

      if (emailCheck.rows.length > 0) {
        return NextResponse.json(
          { error: 'Email already in use' },
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

    if (validatedData.role !== undefined) {
      updates.push(`role = $${paramIndex}`)
      values.push(validatedData.role)
      paramIndex++
    }

    if (validatedData.phone !== undefined) {
      updates.push(`phone = $${paramIndex}`)
      values.push(validatedData.phone || null)
      paramIndex++
    }

    if (validatedData.active !== undefined) {
      updates.push(`active = $${paramIndex}`)
      values.push(validatedData.active)
      paramIndex++
    }

    if (validatedData.password !== undefined) {
      const hashedPassword = await hashPassword(validatedData.password)
      updates.push(`password = $${paramIndex}`)
      values.push(hashedPassword)
      paramIndex++
    }

    // Always update the updatedAt timestamp
    updates.push(`"updatedAt" = CURRENT_TIMESTAMP`)

    // Add user ID as the last parameter
    values.push(userId)

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
      message: 'User updated successfully',
      user: updatedUser
    })

  } catch (error) {
    console.error('Error updating user:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  
  try {
    // Verify the user is authenticated and is OWNER_ADMIN
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const currentUser = verifyToken(token)
    if (currentUser.role !== 'OWNER_ADMIN') {
      return NextResponse.json(
        { error: 'Only Owner/Admin users can delete accounts' },
        { status: 403 }
      )
    }

    const userId = resolvedParams.id

    // Prevent self-deletion
    if (userId === currentUser.id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      )
    }

    // Soft delete by setting active to false
    const result = await query(
      `UPDATE "User" 
       SET active = false, "updatedAt" = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING id`,
      [userId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'User deactivated successfully'
    })

  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}