import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'

export async function GET() {
  try {
    const now = new Date()
    const startOfThisMonth = startOfMonth(now)
    const endOfThisMonth = endOfMonth(now)
    const startOfLastMonth = startOfMonth(subMonths(now, 1))
    const endOfLastMonth = endOfMonth(subMonths(now, 1))

    // Get active jobs count
    const activeJobs = await prisma.job.count({
      where: {
        status: {
          in: ['SCHEDULED', 'DISPATCHED', 'IN_PROGRESS']
        }
      }
    })

    // Get last month's active jobs for comparison
    const lastMonthActiveJobs = await prisma.job.count({
      where: {
        status: {
          in: ['SCHEDULED', 'DISPATCHED', 'IN_PROGRESS']
        },
        createdAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth
        }
      }
    })

    // Get today's tracked hours
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const todayHours = await prisma.timeEntry.aggregate({
      _sum: {
        hours: true
      },
      where: {
        date: {
          gte: todayStart,
          lte: todayEnd
        }
      }
    })

    // Get yesterday's hours for comparison
    const yesterdayStart = new Date(todayStart)
    yesterdayStart.setDate(yesterdayStart.getDate() - 1)
    const yesterdayEnd = new Date(todayEnd)
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1)

    const yesterdayHours = await prisma.timeEntry.aggregate({
      _sum: {
        hours: true
      },
      where: {
        date: {
          gte: yesterdayStart,
          lte: yesterdayEnd
        }
      }
    })

    // Get this month's revenue (billed amount)
    const thisMonthRevenue = await prisma.job.aggregate({
      _sum: {
        billedAmount: true
      },
      where: {
        billedDate: {
          gte: startOfThisMonth,
          lte: endOfThisMonth
        }
      }
    })

    // Get last month's revenue for comparison
    const lastMonthRevenue = await prisma.job.aggregate({
      _sum: {
        billedAmount: true
      },
      where: {
        billedDate: {
          gte: startOfLastMonth,
          lte: endOfLastMonth
        }
      }
    })

    // Get pending estimates count
    const pendingEstimates = await prisma.job.count({
      where: {
        status: 'ESTIMATE'
      }
    })

    // Calculate changes
    const jobsChange = lastMonthActiveJobs > 0 
      ? ((activeJobs - lastMonthActiveJobs) / lastMonthActiveJobs * 100).toFixed(1)
      : '0'

    const hoursToday = todayHours._sum.hours || 0
    const hoursYesterday = yesterdayHours._sum.hours || 0
    const hoursChange = hoursYesterday > 0
      ? ((hoursToday - hoursYesterday) / hoursYesterday * 100).toFixed(1)
      : '0'

    const revenueThis = thisMonthRevenue._sum.billedAmount || 0
    const revenueLast = lastMonthRevenue._sum.billedAmount || 0
    const revenueChange = revenueLast > 0
      ? ((revenueThis - revenueLast) / revenueLast * 100).toFixed(1)
      : '0'

    // Get recent jobs
    const recentJobs = await prisma.job.findMany({
      take: 5,
      orderBy: {
        updatedAt: 'desc'
      },
      include: {
        customer: true
      }
    })

    const stats = [
      {
        title: 'Active Jobs',
        value: activeJobs.toString(),
        change: `${jobsChange}% from last month`,
        icon: 'work',
        color: 'primary' as const,
      },
      {
        title: 'Hours Today',
        value: hoursToday.toFixed(1),
        change: `${hoursChange}% from yesterday`,
        icon: 'access_time',
        color: 'success' as const,
      },
      {
        title: 'Revenue This Month',
        value: `$${revenueThis.toLocaleString()}`,
        change: `${revenueChange}% from last month`,
        icon: 'attach_money',
        color: 'warning' as const,
      },
      {
        title: 'Pending Estimates',
        value: pendingEstimates.toString(),
        change: 'Awaiting approval',
        icon: 'pending_actions',
        color: 'info' as const,
      },
    ]

    return NextResponse.json({
      stats,
      recentJobs: recentJobs.map(job => ({
        id: job.id,
        title: job.description,
        customer: job.customer.companyName || `${job.customer.firstName} ${job.customer.lastName}`,
        status: job.status.toLowerCase(),
        updatedAt: job.updatedAt,
      }))
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    )
  }
}