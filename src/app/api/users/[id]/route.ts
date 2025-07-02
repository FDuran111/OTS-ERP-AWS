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
    
    // Check if this is a permanent delete request
    const url = new URL(request.url)
    const isPermanentDelete = url.searchParams.get('permanent') === 'true'

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

    // If permanent delete requested
    if (isPermanentDelete) {
      // Only allow permanent deletion of inactive users
      if (user.active) {
        return NextResponse.json(
          { 
            error: 'Cannot permanently delete an active user',
            details: 'Please deactivate the user first before permanent deletion'
          },
          { status: 400 }
        )
      }

      // Start transaction for cascading deletes
      await query('BEGIN')

      try {
        console.log('Starting permanent deletion for user:', userId)
        
        // Delete related records first (in order of dependencies)
        // Delete time entries
        console.log('Deleting time entries...')
        await query('DELETE FROM "TimeEntry" WHERE "userId" = $1', [userId])
        
        // Delete employee schedules
        await query('DELETE FROM "EmployeeSchedule" WHERE "userId" = $1', [userId])
        
        // Clear user references in purchase orders (set to NULL)
        console.log('Clearing purchase order references...')
        await query('UPDATE "PurchaseOrder" SET "createdBy" = NULL WHERE "createdBy" = $1', [userId])
        await query('UPDATE "PurchaseOrder" SET "approvedBy" = NULL WHERE "approvedBy" = $1', [userId])
        // Note: currentApprover and rejectedBy columns don't exist
        
        // Clear user references in service calls
        await query('UPDATE "ServiceCall" SET "assignedTechnicianId" = NULL WHERE "assignedTechnicianId" = $1', [userId])
        await query('UPDATE "ServiceCall" SET "dispatchedBy" = NULL WHERE "dispatchedBy" = $1', [userId])
        
        // Note: POApprovalHistory, POReceiving, and POApprovalRule tables don't exist
        // so we skip those operations
        console.log('Skipping non-existent tables (POApprovalHistory, POReceiving, POApprovalRule)')
        
        // Finally delete the user
        console.log('Deleting user record...')
        await query('DELETE FROM "User" WHERE id = $1', [userId])
        
        console.log('Committing transaction...')
        await query('COMMIT')
        
        console.log(`User ${user.name} (${user.email}) permanently deleted by ${currentUser.name}`)
        
        return NextResponse.json({
          success: true,
          message: `User ${user.name} has been permanently deleted`,
          deletedUser: {
            id: user.id,
            name: user.name,
            email: user.email
          }
        })
        
      } catch (error) {
        console.error('Error during permanent deletion:', error)
        await query('ROLLBACK')
        throw error
      }
    }

    // If already inactive (and not permanent delete), just return success
    if (!user.active) {
      return NextResponse.json({
        success: true,
        message: 'User is already deactivated'
      })
    }

    // Check for blocking dependencies
    const blockingDependencies = []

    // Skip pending PO check since currentApprover column doesn't exist

    // Check for active service calls
    const activeServiceCallsResult = await query(
      'SELECT COUNT(*) as count FROM "ServiceCall" WHERE "assignedTechnicianId" = $1 AND status IN (\'OPEN\', \'IN_PROGRESS\')',
      [userId]
    )
    const activeServiceCalls = parseInt(activeServiceCallsResult.rows[0].count)
    if (activeServiceCalls > 0) {
      blockingDependencies.push(`${activeServiceCalls} active service call(s) assigned`)
    }

    // Skip approval rules check since POApprovalRule table doesn't exist

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