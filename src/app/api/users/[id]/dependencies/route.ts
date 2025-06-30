import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET /api/users/[id]/dependencies - Check user dependencies
export async function GET(
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
        { error: 'Only Owner/Admin users can check user dependencies' },
        { status: 403 }
      )
    }

    const userId = resolvedParams.id

    // Check various dependencies
    const dependencies = {
      purchaseOrders: {
        created: 0,
        approved: 0,
        received: 0,
        pending: 0
      },
      serviceCalls: {
        assigned: 0,
        dispatched: 0
      },
      timeEntries: {
        total: 0,
        recent: 0
      },
      activeSchedules: 0,
      approvalRules: 0,
      totalDependencies: 0
    }

    // Check Purchase Orders
    const poCreatedResult = await query(
      'SELECT COUNT(*) as count FROM "PurchaseOrder" WHERE "createdBy" = $1',
      [userId]
    )
    dependencies.purchaseOrders.created = parseInt(poCreatedResult.rows[0].count)

    const poApprovedResult = await query(
      'SELECT COUNT(*) as count FROM "PurchaseOrder" WHERE "approvedBy" = $1',
      [userId]
    )
    dependencies.purchaseOrders.approved = parseInt(poApprovedResult.rows[0].count)

    const poReceivedResult = await query(
      'SELECT COUNT(*) as count FROM "POReceiving" WHERE "receivedBy" = $1',
      [userId]
    )
    dependencies.purchaseOrders.received = parseInt(poReceivedResult.rows[0].count)

    const poPendingResult = await query(
      'SELECT COUNT(*) as count FROM "PurchaseOrder" WHERE "currentApprover" = $1 AND status = \'PENDING\'',
      [userId]
    )
    dependencies.purchaseOrders.pending = parseInt(poPendingResult.rows[0].count)

    // Check Service Calls
    const scAssignedResult = await query(
      'SELECT COUNT(*) as count FROM "ServiceCall" WHERE "assignedTechnicianId" = $1',
      [userId]
    )
    dependencies.serviceCalls.assigned = parseInt(scAssignedResult.rows[0].count)

    const scDispatchedResult = await query(
      'SELECT COUNT(*) as count FROM "ServiceCall" WHERE "dispatchedBy" = $1',
      [userId]
    )
    dependencies.serviceCalls.dispatched = parseInt(scDispatchedResult.rows[0].count)

    // Check Time Entries
    const timeEntriesResult = await query(
      'SELECT COUNT(*) as count FROM "TimeEntry" WHERE "userId" = $1',
      [userId]
    )
    dependencies.timeEntries.total = parseInt(timeEntriesResult.rows[0].count)

    const recentTimeEntriesResult = await query(
      'SELECT COUNT(*) as count FROM "TimeEntry" WHERE "userId" = $1 AND date > CURRENT_DATE - INTERVAL \'30 days\'',
      [userId]
    )
    dependencies.timeEntries.recent = parseInt(recentTimeEntriesResult.rows[0].count)

    // Check Active Schedules
    const schedulesResult = await query(
      'SELECT COUNT(*) as count FROM "EmployeeSchedule" WHERE "userId" = $1 AND "endDate" > CURRENT_DATE',
      [userId]
    )
    dependencies.activeSchedules = parseInt(schedulesResult.rows[0].count)

    // Check Approval Rules
    const approvalRulesResult = await query(
      `SELECT COUNT(*) as count FROM "POApprovalRule" 
       WHERE "level1Approver" = $1 OR "level2Approver" = $1 OR "level3Approver" = $1`,
      [userId]
    )
    dependencies.approvalRules = parseInt(approvalRulesResult.rows[0].count)

    // Calculate total dependencies
    dependencies.totalDependencies = 
      dependencies.purchaseOrders.created +
      dependencies.purchaseOrders.approved +
      dependencies.purchaseOrders.received +
      dependencies.purchaseOrders.pending +
      dependencies.serviceCalls.assigned +
      dependencies.serviceCalls.dispatched +
      dependencies.timeEntries.total +
      dependencies.activeSchedules +
      dependencies.approvalRules

    // Get specific items that need reassignment
    const reassignmentNeeded = {
      pendingPurchaseOrders: [] as any[],
      activeServiceCalls: [] as any[],
      approvalRules: [] as any[]
    }

    if (dependencies.purchaseOrders.pending > 0) {
      const pendingPOs = await query(
        `SELECT id, "orderNumber", "totalAmount" 
         FROM "PurchaseOrder" 
         WHERE "currentApprover" = $1 AND status = 'PENDING' 
         LIMIT 5`,
        [userId]
      )
      reassignmentNeeded.pendingPurchaseOrders = pendingPOs.rows
    }

    if (dependencies.serviceCalls.assigned > 0) {
      const activeSCs = await query(
        `SELECT id, "ticketNumber", "customerName" 
         FROM "ServiceCall" 
         WHERE "assignedTechnicianId" = $1 AND status IN ('OPEN', 'IN_PROGRESS') 
         LIMIT 5`,
        [userId]
      )
      reassignmentNeeded.activeServiceCalls = activeSCs.rows
    }

    if (dependencies.approvalRules > 0) {
      const rules = await query(
        `SELECT id, "categoryId", "minAmount", "maxAmount" 
         FROM "POApprovalRule" 
         WHERE "level1Approver" = $1 OR "level2Approver" = $1 OR "level3Approver" = $1 
         LIMIT 5`,
        [userId]
      )
      reassignmentNeeded.approvalRules = rules.rows
    }

    return NextResponse.json({
      userId,
      dependencies,
      reassignmentNeeded,
      canBeDeactivated: dependencies.purchaseOrders.pending === 0 && 
                       dependencies.serviceCalls.assigned === 0 &&
                       dependencies.approvalRules === 0,
      message: dependencies.totalDependencies === 0 
        ? 'User has no dependencies and can be safely deactivated'
        : 'User has dependencies that may need to be reassigned'
    })

  } catch (error) {
    console.error('Error checking user dependencies:', error)
    return NextResponse.json(
      { error: 'Failed to check user dependencies' },
      { status: 500 }
    )
  }
}