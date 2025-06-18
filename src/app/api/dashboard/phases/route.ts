import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    // Get phase summary grouped by phase type and status
    const phaseSummaryResult = await query(`
      SELECT name, status, COUNT(*) as count
      FROM "JobPhase"
      GROUP BY name, status
    `)

    // Transform to the expected format
    const summary: Record<string, Record<string, number>> = {}
    phaseSummaryResult.rows.forEach(phase => {
      if (!summary[phase.name]) {
        summary[phase.name] = {}
      }
      summary[phase.name][phase.status] = parseInt(phase.count)
    })

    // Get total counts
    const [totalResult, completedResult, inProgressResult] = await Promise.all([
      query('SELECT COUNT(*) as count FROM "JobPhase"'),
      query('SELECT COUNT(*) as count FROM "JobPhase" WHERE status = $1', ['COMPLETED']),
      query('SELECT COUNT(*) as count FROM "JobPhase" WHERE status = $1', ['IN_PROGRESS'])
    ])

    const totalPhases = parseInt(totalResult.rows[0].count)
    const completedPhases = parseInt(completedResult.rows[0].count)
    const inProgressPhases = parseInt(inProgressResult.rows[0].count)

    // Get recent updates with job and customer info
    const recentUpdatesResult = await query(`
      SELECT 
        p.id,
        p.name as phase_name,
        p.status,
        p."updatedAt",
        j."jobNumber",
        j."customerId",
        COALESCE(c."companyName", c."firstName" || ' ' || c."lastName") as customer_name
      FROM "JobPhase" p
      INNER JOIN "Job" j ON p."jobId" = j.id
      INNER JOIN "Customer" c ON j."customerId" = c.id
      ORDER BY p."updatedAt" DESC
      LIMIT 10
    `)

    const transformedRecentUpdates = recentUpdatesResult.rows.map(phase => ({
      id: phase.id,
      phaseName: phase.phase_name,
      status: phase.status,
      jobNumber: phase.jobNumber,
      customer: phase.customer_name,
      updatedAt: phase.updatedAt
    }))

    const completionRate = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0

    return NextResponse.json({
      summary,
      totalPhases,
      completedPhases,
      inProgressPhases,
      completionRate,
      recentUpdates: transformedRecentUpdates
    })
  } catch (error) {
    console.error('Error fetching phase dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch phase data' },
      { status: 500 }
    )
  }
}