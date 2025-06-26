import { NextRequest, NextResponse } from 'next/server'
import { getSimplePendingApprovals } from '@/lib/purchase-orders-simple'

// GET - Simple implementation for pending approvals
export async function GET(request: NextRequest) {
  try {
    const pendingCount = await getSimplePendingApprovals()
    
    return NextResponse.json({
      success: true,
      data: [],
      summary: {
        totalPending: pendingCount,
        totalValue: 0,
        highValue: 0,
        urgent: 0,
        aging: {
          today: 0,
          thisWeek: pendingCount,
          older: 0
        }
      }
    })
    
  } catch (error) {
    console.error('Error fetching pending approvals:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pending approvals' },
      { status: 500 }
    )
  }
}

// POST - Not implemented in simple version
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { success: false, error: 'Approval actions not implemented in simple version' },
    { status: 501 }
  )
}