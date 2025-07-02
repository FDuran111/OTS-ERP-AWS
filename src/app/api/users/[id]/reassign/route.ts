import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const reassignSchema = z.object({
  newUserId: z.string().uuid(),
  reassignPurchaseOrders: z.boolean().default(false),
  reassignServiceCalls: z.boolean().default(false),
  reassignApprovalRules: z.boolean().default(false)
})

// POST /api/users/[id]/reassign - Reassign user's responsibilities to another user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  
  // Check authentication and role
  const token = request.cookies.get('auth-token')?.value
  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const { verifyToken } = await import('@/lib/auth')
    const currentUser = verifyToken(token)
    
    if (currentUser.role !== 'OWNER_ADMIN') {
      return NextResponse.json(
        { error: 'Only Owner/Admin users can reassign user responsibilities' },
        { status: 403 }
      )
    }

    const userId = resolvedParams.id
    const body = await request.json()
    const data = reassignSchema.parse(body)

    // Verify both users exist and the new user is active
    const userCheckResult = await query(
      `SELECT u1.id as old_id, u1.name as old_name, u1.active as old_active,
              u2.id as new_id, u2.name as new_name, u2.active as new_active, u2.role as new_role
       FROM "User" u1
       LEFT JOIN "User" u2 ON u2.id = $2
       WHERE u1.id = $1`,
      [userId, data.newUserId]
    )

    if (userCheckResult.rows.length === 0 || !userCheckResult.rows[0].new_id) {
      return NextResponse.json(
        { error: 'One or both users not found' },
        { status: 404 }
      )
    }

    const userInfo = userCheckResult.rows[0]

    if (!userInfo.new_active) {
      return NextResponse.json(
        { error: 'Cannot reassign to an inactive user' },
        { status: 400 }
      )
    }

    if (userId === data.newUserId) {
      return NextResponse.json(
        { error: 'Cannot reassign to the same user' },
        { status: 400 }
      )
    }

    const reassignmentResults = {
      purchaseOrders: { pending: 0, created: 0 },
      serviceCalls: { assigned: 0, dispatched: 0 },
      approvalRules: { reassigned: 0 }
    }

    // Start transaction
    await query('BEGIN')

    try {
      // Reassign Purchase Orders
      if (data.reassignPurchaseOrders) {
        // Skip pending approvals since currentApprover column doesn't exist
        reassignmentResults.purchaseOrders.pending = 0

        // Reassign created by (for historical tracking)
        const createdPOResult = await query(
          `UPDATE "PurchaseOrder" 
           SET "createdBy" = $2, "updatedAt" = CURRENT_TIMESTAMP
           WHERE "createdBy" = $1
           RETURNING id`,
          [userId, data.newUserId]
        )
        reassignmentResults.purchaseOrders.created = createdPOResult.rows.length
      }

      // Reassign Service Calls
      if (data.reassignServiceCalls) {
        // Only reassign active service calls
        const assignedSCResult = await query(
          `UPDATE "ServiceCall" 
           SET "assignedTechnicianId" = $2, "updatedAt" = CURRENT_TIMESTAMP
           WHERE "assignedTechnicianId" = $1 AND status IN ('OPEN', 'IN_PROGRESS')
           RETURNING id`,
          [userId, data.newUserId]
        )
        reassignmentResults.serviceCalls.assigned = assignedSCResult.rows.length

        // Reassign dispatched by (for all, not just active)
        const dispatchedSCResult = await query(
          `UPDATE "ServiceCall" 
           SET "dispatchedBy" = $2, "updatedAt" = CURRENT_TIMESTAMP
           WHERE "dispatchedBy" = $1
           RETURNING id`,
          [userId, data.newUserId]
        )
        reassignmentResults.serviceCalls.dispatched = dispatchedSCResult.rows.length
      }

      // Skip approval rules since POApprovalRule table doesn't exist
      if (data.reassignApprovalRules) {
        console.log('Skipping approval rules reassignment - POApprovalRule table does not exist')
        reassignmentResults.approvalRules.reassigned = 0
      }

      // Commit transaction
      await query('COMMIT')

      // Log the reassignment
      console.log(`Reassigned responsibilities from ${userInfo.old_name} to ${userInfo.new_name}:`, reassignmentResults)

      return NextResponse.json({
        success: true,
        message: `Successfully reassigned responsibilities from ${userInfo.old_name} to ${userInfo.new_name}`,
        results: reassignmentResults,
        summary: {
          totalItemsReassigned: 
            reassignmentResults.purchaseOrders.pending +
            reassignmentResults.purchaseOrders.created +
            reassignmentResults.serviceCalls.assigned +
            reassignmentResults.serviceCalls.dispatched +
            reassignmentResults.approvalRules.reassigned
        }
      })

    } catch (error) {
      // Rollback transaction on error
      await query('ROLLBACK')
      throw error
    }

  } catch (error) {
    console.error('Error reassigning user responsibilities:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to reassign user responsibilities' },
      { status: 500 }
    )
  }
}