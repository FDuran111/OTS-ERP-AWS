import { NextRequest, NextResponse } from 'next/server'
import { createServiceCall, getServiceCalls, ServiceCallFilter } from '@/lib/service-calls'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const filter: ServiceCallFilter = {}
    
    // Parse status filter
    const status = searchParams.get('status')
    if (status) {
      filter.status = status.split(',')
    }
    
    // Parse priority filter
    const priority = searchParams.get('priority')
    if (priority) {
      filter.priority = priority.split(',')
    }
    
    // Parse call type filter
    const callType = searchParams.get('callType')
    if (callType) {
      filter.callType = callType.split(',')
    }
    
    // Other filters
    const assignedTechnicianId = searchParams.get('assignedTechnicianId')
    if (assignedTechnicianId) {
      filter.assignedTechnicianId = assignedTechnicianId
    }
    
    const customerId = searchParams.get('customerId')
    if (customerId) {
      filter.customerId = customerId
    }
    
    const dateFrom = searchParams.get('dateFrom')
    if (dateFrom) {
      filter.dateFrom = dateFrom
    }
    
    const dateTo = searchParams.get('dateTo')
    if (dateTo) {
      filter.dateTo = dateTo
    }
    
    const search = searchParams.get('search')
    if (search) {
      filter.search = search
    }
    
    const serviceCalls = await getServiceCalls(filter)
    
    return NextResponse.json({
      success: true,
      data: serviceCalls,
      count: serviceCalls.length
    })
    
  } catch (error) {
    console.error('Service calls fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch service calls' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.customerId || !body.title || !body.callType || !body.priority) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: customerId, title, callType, priority' },
        { status: 400 }
      )
    }
    
    const serviceCall = await createServiceCall(body)
    
    return NextResponse.json({
      success: true,
      data: serviceCall
    }, { status: 201 })
    
  } catch (error) {
    console.error('Service call creation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create service call' },
      { status: 500 }
    )
  }
}