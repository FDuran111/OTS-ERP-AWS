import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = verifyToken(token)

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get forms started
    const formsStartedResult = await query(
      `SELECT COUNT(*) as total
       FROM "CustomerActivity"
       WHERE "activityType" = 'FORM_START'
         AND "createdAt" >= $1`,
      [startDate]
    )
    const formsStarted = parseInt(formsStartedResult.rows[0].total)

    // Get forms completed (leads created from website)
    const formsCompletedResult = await query(
      `SELECT COUNT(*) as total
       FROM "Lead"
       WHERE (source = 'WEBSITE' OR notes LIKE '%Website Form%' OR notes LIKE '%Service Type:%')
         AND "createdAt" >= $1`,
      [startDate]
    )
    const formsCompleted = parseInt(formsCompletedResult.rows[0].total)

    // Get forms abandoned
    const formsAbandonedResult = await query(
      `SELECT COUNT(*) as total
       FROM "CustomerActivity"
       WHERE "activityType" = 'FORM_ABANDON'
         AND "createdAt" >= $1`,
      [startDate]
    )
    const formsAbandoned = parseInt(formsAbandonedResult.rows[0].total)

    // Calculate rates
    const totalFormInteractions = formsStarted || 1 // Avoid division by zero
    const completionRate = formsStarted > 0
      ? Math.round((formsCompleted / formsStarted) * 100)
      : 0
    const abandonmentRate = formsStarted > 0
      ? Math.round((formsAbandoned / formsStarted) * 100)
      : 0

    return NextResponse.json({
      formsStarted,
      formsCompleted,
      formsAbandoned,
      completionRate,
      abandonmentRate
    })

  } catch (error) {
    console.error('Analytics forms error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch form analytics' },
      { status: 500 }
    )
  }
}