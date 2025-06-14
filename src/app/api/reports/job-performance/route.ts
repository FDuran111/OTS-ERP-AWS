import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, subMonths, differenceInDays } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || 'month'
    
    const now = new Date()
    let startDate: Date
    let endDate: Date = now
    
    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default: // month
        startDate = startOfMonth(now)
        endDate = endOfMonth(now)
    }

    // Get all jobs in the time range
    const jobs = await prisma.job.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            companyName: true
          }
        },
        phases: true
      }
    })

    // Calculate completion stats
    const totalJobs = jobs.length
    const completedJobs = jobs.filter(job => job.status === 'COMPLETED').length
    const inProgressJobs = jobs.filter(job => 
      ['SCHEDULED', 'DISPATCHED', 'IN_PROGRESS'].includes(job.status)
    ).length
    const cancelledJobs = jobs.filter(job => job.status === 'CANCELLED').length

    const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0

    // Average completion time for completed jobs
    const completedJobsWithTimes = jobs.filter(job => 
      job.status === 'COMPLETED' && job.completedAt && job.startDate
    )
    
    const averageCompletionDays = completedJobsWithTimes.length > 0 
      ? completedJobsWithTimes.reduce((sum, job) => {
          return sum + differenceInDays(job.completedAt!, job.startDate!)
        }, 0) / completedJobsWithTimes.length
      : 0

    // Performance by job type
    const performanceByType: Record<string, {
      total: number,
      completed: number,
      completionRate: number,
      averageDays: number
    }> = {}

    jobs.forEach(job => {
      const jobType = job.jobType || 'Other'
      if (!performanceByType[jobType]) {
        performanceByType[jobType] = {
          total: 0,
          completed: 0,
          completionRate: 0,
          averageDays: 0
        }
      }
      
      performanceByType[jobType].total += 1
      if (job.status === 'COMPLETED') {
        performanceByType[jobType].completed += 1
      }
    })

    // Calculate completion rates and average days for each type
    Object.keys(performanceByType).forEach(type => {
      const data = performanceByType[type]
      data.completionRate = data.total > 0 ? (data.completed / data.total) * 100 : 0
      
      const typeCompletedJobs = jobs.filter(job => 
        job.jobType === type && job.status === 'COMPLETED' && job.completedAt && job.startDate
      )
      
      data.averageDays = typeCompletedJobs.length > 0
        ? typeCompletedJobs.reduce((sum, job) => {
            return sum + differenceInDays(job.completedAt!, job.startDate!)
          }, 0) / typeCompletedJobs.length
        : 0
    })

    // Phase completion stats
    const allPhases = jobs.flatMap(job => job.phases)
    const totalPhases = allPhases.length
    const completedPhases = allPhases.filter(phase => phase.status === 'COMPLETED').length
    const phaseCompletionRate = totalPhases > 0 ? (completedPhases / totalPhases) * 100 : 0

    // Recent completed jobs
    const recentCompletedJobs = jobs
      .filter(job => job.status === 'COMPLETED')
      .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0))
      .slice(0, 10)
      .map(job => ({
        id: job.id,
        jobNumber: job.jobNumber,
        description: job.description,
        customer: job.customer.companyName || 
          `${job.customer.firstName} ${job.customer.lastName}`,
        completedAt: job.completedAt,
        billedAmount: job.billedAmount,
        jobType: job.jobType,
        completionDays: job.completedAt && job.startDate 
          ? differenceInDays(job.completedAt, job.startDate)
          : null
      }))

    return NextResponse.json({
      summary: {
        totalJobs,
        completedJobs,
        inProgressJobs,
        cancelledJobs,
        completionRate,
        averageCompletionDays,
        phaseCompletionRate
      },
      performanceByType,
      recentCompletedJobs,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        range: timeRange
      }
    })
  } catch (error) {
    console.error('Error generating job performance report:', error)
    return NextResponse.json(
      { error: 'Failed to generate job performance report' },
      { status: 500 }
    )
  }
}