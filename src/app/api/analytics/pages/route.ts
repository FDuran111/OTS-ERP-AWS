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

    // Get total page views
    const pageViewsResult = await query(
      `SELECT COUNT(*) as total
       FROM "CustomerActivity"
       WHERE "activityType" = 'PAGE_VIEW'
         AND "createdAt" >= $1`,
      [startDate]
    )
    const totalPageViews = parseInt(pageViewsResult.rows[0].total)

    // Get unique visitors
    const uniqueVisitorsResult = await query(
      `SELECT COUNT(DISTINCT "customerId") as total
       FROM "CustomerActivity"
       WHERE "activityType" = 'PAGE_VIEW'
         AND "createdAt" >= $1`,
      [startDate]
    )
    const uniqueVisitors = parseInt(uniqueVisitorsResult.rows[0].total)

    // Get top pages
    const topPagesResult = await query(
      `SELECT
        description as page,
        COUNT(*) as views
       FROM "CustomerActivity"
       WHERE "activityType" = 'PAGE_VIEW'
         AND "createdAt" >= $1
       GROUP BY description
       ORDER BY views DESC
       LIMIT 10`,
      [startDate]
    )

    // Get page views trend (daily)
    const trendResult = await query(
      `SELECT
        DATE("createdAt") as date,
        COUNT(*) as views
       FROM "CustomerActivity"
       WHERE "activityType" = 'PAGE_VIEW'
         AND "createdAt" >= $1
       GROUP BY DATE("createdAt")
       ORDER BY date ASC`,
      [startDate]
    )

    return NextResponse.json({
      totalPageViews,
      uniqueVisitors,
      topPages: topPagesResult.rows.map(row => ({
        page: row.page,
        views: parseInt(row.views)
      })),
      pageViewsTrend: trendResult.rows.map(row => ({
        date: row.date,
        views: parseInt(row.views)
      }))
    })

  } catch (error) {
    console.error('Analytics pages error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch page analytics' },
      { status: 500 }
    )
  }
}