import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get total leads
    const totalLeadsResult = await query(
      `SELECT COUNT(*) as total FROM "Lead"`
    )
    const totalLeads = parseInt(totalLeadsResult.rows[0].total)

    // Get website leads (from Website Form source)
    const websiteLeadsResult = await query(
      `SELECT COUNT(*) as total FROM "Lead"
       WHERE source LIKE 'Website Form%'`
    )
    const websiteLeads = parseInt(websiteLeadsResult.rows[0].total)

    // Calculate conversion rate (leads that became customers)
    const convertedLeadsResult = await query(
      `SELECT COUNT(*) as total FROM "Lead"
       WHERE source LIKE 'Website Form%' AND status = 'CONVERTED'`
    )
    const convertedLeads = parseInt(convertedLeadsResult.rows[0].total)
    const conversionRate = websiteLeads > 0 ? ((convertedLeads / websiteLeads) * 100).toFixed(1) : 0

    // Get average response time for website leads
    const responseTimeResult = await query(
      `SELECT
        AVG(EXTRACT(EPOCH FROM ("lastContactDate" - "createdAt"))/3600) as avg_hours
       FROM "Lead"
       WHERE source LIKE 'Website Form%'
         AND "lastContactDate" IS NOT NULL`
    )
    const avgHours = parseFloat(responseTimeResult.rows[0].avg_hours || 0)
    const averageResponseTime = avgHours > 24
      ? `${Math.round(avgHours / 24)} days`
      : `${Math.round(avgHours)} hours`

    // Get leads by source
    const leadsBySourceResult = await query(
      `SELECT
        CASE
          WHEN source LIKE 'Website Form%' THEN 'Website Forms'
          WHEN source LIKE '%google%' THEN 'Google Ads'
          WHEN source LIKE '%facebook%' THEN 'Facebook'
          WHEN source IS NULL THEN 'Direct/Manual'
          ELSE COALESCE(source, 'Other')
        END as source_category,
        COUNT(*) as count
       FROM "Lead"
       GROUP BY source_category
       ORDER BY count DESC`
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
       WHERE l.source LIKE 'Website Form%'
       ORDER BY l."createdAt" DESC
       LIMIT 20`
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