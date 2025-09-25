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

    // Get total leads in time period
    const totalLeadsResult = await query(
      `SELECT COUNT(*) as total FROM "Lead"
       WHERE "createdAt" >= $1`,
      [startDate]
    )
    const totalLeads = parseInt(totalLeadsResult.rows[0].total)

    // Get website leads (from Website Form source or notes containing Website Form)
    const websiteLeadsResult = await query(
      `SELECT COUNT(*) as total FROM "Lead"
       WHERE (source = 'WEBSITE'
          OR notes LIKE '%Website Form%'
          OR notes LIKE '%Service Type:%')
         AND "createdAt" >= $1`,
      [startDate]
    )
    const websiteLeads = parseInt(websiteLeadsResult.rows[0].total)

    // Calculate conversion rate (leads that became customers - PAID or JOB_COMPLETED)
    const convertedLeadsResult = await query(
      `SELECT COUNT(*) as total FROM "Lead"
       WHERE (source = 'WEBSITE' OR notes LIKE '%Website Form%' OR notes LIKE '%Service Type:%')
         AND status IN ('PAID', 'JOB_COMPLETED', 'INVOICED')
         AND "createdAt" >= $1`,
      [startDate]
    )
    const convertedLeads = parseInt(convertedLeadsResult.rows[0].total)
    const conversionRate = websiteLeads > 0 ? ((convertedLeads / websiteLeads) * 100).toFixed(1) : 0

    // Get average response time for website leads
    const responseTimeResult = await query(
      `SELECT
        AVG(EXTRACT(EPOCH FROM ("lastContactDate" - "createdAt"))/3600) as avg_hours
       FROM "Lead"
       WHERE (source = 'WEBSITE' OR notes LIKE '%Website Form%' OR notes LIKE '%Service Type:%')
         AND "lastContactDate" IS NOT NULL
         AND "createdAt" >= $1`,
      [startDate]
    )
    const avgHours = parseFloat(responseTimeResult.rows[0].avg_hours || 0)
    const averageResponseTime = avgHours > 24
      ? `${Math.round(avgHours / 24)} days`
      : `${Math.round(avgHours)} hours`

    // Get leads by source
    const leadsBySourceResult = await query(
      `SELECT
        CASE
          WHEN source = 'WEBSITE' OR notes LIKE '%Website Form%' OR notes LIKE '%Service Type:%' THEN 'Website Forms'
          WHEN source::text ILIKE '%google%' THEN 'Google Ads'
          WHEN source::text ILIKE '%facebook%' THEN 'Facebook'
          WHEN source IS NULL THEN 'Direct/Manual'
          ELSE COALESCE(source::text, 'Other')
        END as source_category,
        COUNT(*) as count
       FROM "Lead"
       WHERE "createdAt" >= $1
       GROUP BY source_category
       ORDER BY count DESC`,
      [startDate]
    )

    // Get recent website leads with urgency
    const recentLeadsResult = await query(
      `SELECT
        l.*,
        COALESCE(
          CASE
            WHEN l.priority = 'URGENT' THEN 'EMERGENCY'
            WHEN l.priority = 'HIGH' THEN 'HIGH'
            WHEN l.priority = 'MEDIUM' THEN 'MEDIUM'
            ELSE 'LOW'
          END,
          'MEDIUM'
        ) as urgency,
        CASE
          WHEN l.notes LIKE '%Service Type:%'
          THEN SUBSTRING(l.notes FROM 'Service Type: ([^\\n]+)')
          ELSE 'general-inquiry'
        END as serviceType
       FROM "Lead" l
       WHERE (l.source = 'WEBSITE' OR l.notes LIKE '%Website Form%' OR l.notes LIKE '%Service Type:%')
         AND l."createdAt" >= $1
       ORDER BY l."createdAt" DESC
       LIMIT 20`,
      [startDate]
    )

    return NextResponse.json({
      totalLeads,
      websiteLeads,
      conversionRate,
      averageResponseTime,
      leadsBySource: leadsBySourceResult.rows.map(row => ({
        source: row.source_category,
        count: parseInt(row.count)
      })),
      recentLeads: recentLeadsResult.rows
    })

  } catch (error) {
    console.error('Analytics leads error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lead analytics' },
      { status: 500 }
    )
  }
}