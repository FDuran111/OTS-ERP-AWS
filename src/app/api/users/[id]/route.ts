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

    // Check if user exists and get their info
    const userResult = await query(
      'SELECT id, name, email, active FROM "User" WHERE id = $1',
      [userId]
    )

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const user = userResult.rows[0]

    // If already inactive, just return success
    if (!user.active) {
      return NextResponse.json({
        success: true,
        message: 'User is already deactivated'
      })
    }

    // Check for blocking dependencies
    const blockingDependencies = []

    // Check for pending purchase orders
    const pendingPOResult = await query(
      'SELECT COUNT(*) as count FROM "PurchaseOrder" WHERE "currentApprover" = $1 AND status = \'PENDING\'',
      [userId]
    )
    const pendingPOCount = parseInt(pendingPOResult.rows[0].count)
    if (pendingPOCount > 0) {
      blockingDependencies.push(`${pendingPOCount} pending purchase order(s) awaiting approval`)
    }

    // Check for active service calls
    const activeServiceCallsResult = await query(
      'SELECT COUNT(*) as count FROM "ServiceCall" WHERE "assignedTechnicianId" = $1 AND status IN (\'OPEN\', \'IN_PROGRESS\')',
      [userId]
    )
    const activeServiceCalls = parseInt(activeServiceCallsResult.rows[0].count)
    if (activeServiceCalls > 0) {
      blockingDependencies.push(`${activeServiceCalls} active service call(s) assigned`)
    }

    // Check for approval rules
    const approvalRulesResult = await query(
      `SELECT COUNT(*) as count FROM "POApprovalRule" 
       WHERE "level1Approver" = $1 OR "level2Approver" = $1 OR "level3Approver" = $1`,
      [userId]
    )
    const approvalRules = parseInt(approvalRulesResult.rows[0].count)
    if (approvalRules > 0) {
      blockingDependencies.push(`${approvalRules} purchase order approval rule(s)`)
    }

    // Check if they're the last active OWNER_ADMIN
    if (currentUser.role === 'OWNER_ADMIN') {
      const activeAdminResult = await query(
        'SELECT COUNT(*) as count FROM "User" WHERE role = \'OWNER_ADMIN\' AND active = true AND id != $1',
        [userId]
      )
      const activeAdminCount = parseInt(activeAdminResult.rows[0].count)
      if (activeAdminCount === 0) {
        return NextResponse.json(
          { 
            error: 'Cannot deactivate the last active admin user',
            details: 'At least one OWNER_ADMIN must remain active in the system'
          },
          { status: 400 }
        )
      }
    }

    // If there are blocking dependencies, return detailed error
    if (blockingDependencies.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot deactivate user due to active dependencies',
          details: blockingDependencies,
          suggestion: 'Please reassign or resolve these items before deactivating the user'
        },
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

    // Log the deactivation
    console.log(`User ${user.name} (${user.email}) deactivated by ${currentUser.name}`)

    return NextResponse.json({
      success: true,
      message: `User ${user.name} has been successfully deactivated`,
      deactivatedUser: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    })

  } catch (error) {
    console.error('Error deleting user:', error)
    
    // Check for database constraint violations
    if (error instanceof Error && error.message.includes('violates foreign key constraint')) {
      return NextResponse.json(
        { 
          error: 'Cannot deactivate user due to database constraints',
          details: 'This user has associated records that prevent deactivation',
          suggestion: 'Please contact support for assistance'
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}