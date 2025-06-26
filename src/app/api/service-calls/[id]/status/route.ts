import { NextRequest, NextResponse } from 'next/server'
import { updateServiceCallStatus } from '@/lib/service-calls'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const body = await request.json()
    
    if (!body.status) {
      return NextResponse.json(
        { success: false, error: 'Status is required' },
        { status: 400 }
      )
    }
    
    const validStatuses = ['NEW', 'ASSIGNED', 'DISPATCHED', 'EN_ROUTE', 'ON_SITE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'BILLED']
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      )
    }
    
    const serviceCall = await updateServiceCallStatus(
      resolvedParams.id,
      body.status,
      body.changedBy,
      body.notes
    )
    
    return NextResponse.json({
      success: true,
      data: serviceCall
    })
    
  } catch (error) {
    console.error('Service call status update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update service call status' },
      { status: 500 }
    )
  }
}