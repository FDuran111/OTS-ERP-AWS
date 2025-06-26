import { NextRequest, NextResponse } from 'next/server'
import { getServiceCallStats } from '@/lib/service-calls'

export async function GET(request: NextRequest) {
  try {
    const stats = await getServiceCallStats()
    
    return NextResponse.json({
      success: true,
      data: {
        total: parseInt(stats.total || '0'),
        new: parseInt(stats.new_calls || '0'),
        active: parseInt(stats.active_calls || '0'),
        completed: parseInt(stats.completed_calls || '0'),
        urgent: parseInt(stats.urgent_calls || '0'),
        today: parseInt(stats.today_calls || '0'),
        avgSatisfaction: parseFloat(stats.avg_satisfaction || '0')
      }
    })
    
  } catch (error) {
    console.error('Service call stats error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch service call statistics' },
      { status: 500 }
    )
  }
}