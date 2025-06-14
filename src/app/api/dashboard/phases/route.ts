import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Get phase summary grouped by phase type and status
    const phaseSummary = await prisma.jobPhase.groupBy({
      by: ['name', 'status'],
      _count: {
        id: true
      }
    })

    // Transform to the expected format
    const summary: Record<string, Record<string, number>> = {}
    phaseSummary.forEach(phase => {
      if (!summary[phase.name]) {
        summary[phase.name] = {}
      }
      summary[phase.name][phase.status] = phase._count.id
    })

    // Get total counts
    const totalPhases = await prisma.jobPhase.count()
    const completedPhases = await prisma.jobPhase.count({
      where: { status: 'COMPLETED' }
    })
    const inProgressPhases = await prisma.jobPhase.count({
      where: { status: 'IN_PROGRESS' }
    })

    // Get recent updates
    const recentUpdates = await prisma.jobPhase.findMany({
      include: {
        job: {
          include: {
            customer: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 10
    })

    const transformedRecentUpdates = recentUpdates.map(phase => ({
      id: phase.id,
      phaseName: phase.name,
      status: phase.status,
      jobNumber: phase.job.jobNumber,
      customer: phase.job.customer.companyName || `${phase.job.customer.firstName} ${phase.job.customer.lastName}`,
      updatedAt: phase.updatedAt.toISOString()
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