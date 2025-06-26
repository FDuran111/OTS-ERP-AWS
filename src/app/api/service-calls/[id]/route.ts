import { NextRequest, NextResponse } from 'next/server'
import { getServiceCallById, updateServiceCall, deleteServiceCall } from '@/lib/service-calls'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const serviceCall = await getServiceCallById(resolvedParams.id)
    
    if (!serviceCall) {
      return NextResponse.json(
        { success: false, error: 'Service call not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: serviceCall
    })
    
  } catch (error) {
    console.error('Service call fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch service call' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const body = await request.json()
    
    const serviceCall = await updateServiceCall(resolvedParams.id, body)
    
    return NextResponse.json({
      success: true,
      data: serviceCall
    })
    
  } catch (error) {
    console.error('Service call update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update service call' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const success = await deleteServiceCall(resolvedParams.id)
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Service call not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Service call deleted successfully'
    })
    
  } catch (error) {
    console.error('Service call deletion error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete service call' },
      { status: 500 }
    )
  }
}