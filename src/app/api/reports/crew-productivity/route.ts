import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth } from 'date-fns'

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

    // Get time entries for the period
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        job: {
          select: {
            jobNumber: true,
            description: true,
            jobType: true,
            billedAmount: true
          }
        }
      }
    })

    // Calculate total hours
    const totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours, 0)

    // Productivity by employee
    const productivityByEmployee: Record<string, {
      employeeName: string,
      totalHours: number,
      entryCount: number,
      jobsWorked: number,
      averageHoursPerDay: number,
      revenueGenerated: number
    }> = {}

    timeEntries.forEach(entry => {
      const employeeName = entry.employeeName
      if (!productivityByEmployee[employeeName]) {
        productivityByEmployee[employeeName] = {
          employeeName,
          totalHours: 0,
          entryCount: 0,
          jobsWorked: 0,
          averageHoursPerDay: 0,
          revenueGenerated: 0
        }
      }
      
      productivityByEmployee[employeeName].totalHours += entry.hours
      productivityByEmployee[employeeName].entryCount += 1
      
      // Add revenue if job has billing
      if (entry.job?.billedAmount) {
        productivityByEmployee[employeeName].revenueGenerated += entry.job.billedAmount
      }
    })

    // Calculate unique jobs worked and average hours per day for each employee
    Object.keys(productivityByEmployee).forEach(employeeName => {
      const employeeEntries = timeEntries.filter(entry => entry.employeeName === employeeName)
      const uniqueJobs = new Set(employeeEntries.map(entry => entry.jobId))
      const uniqueDays = new Set(employeeEntries.map(entry => entry.date.toDateString()))
      
      productivityByEmployee[employeeName].jobsWorked = uniqueJobs.size
      productivityByEmployee[employeeName].averageHoursPerDay = 
        uniqueDays.size > 0 ? productivityByEmployee[employeeName].totalHours / uniqueDays.size : 0
    })

    // Sort employees by total hours
    const topEmployeesByHours = Object.values(productivityByEmployee)
      .sort((a, b) => b.totalHours - a.totalHours)

    // Hours by job type
    const hoursByJobType: Record<string, {
      jobType: string,
      totalHours: number,
      jobCount: number,
      averageHoursPerJob: number
    }> = {}

    timeEntries.forEach(entry => {
      const jobType = entry.job?.jobType || 'Other'
      if (!hoursByJobType[jobType]) {
        hoursByJobType[jobType] = {
          jobType,
          totalHours: 0,
          jobCount: 0,
          averageHoursPerJob: 0
        }
      }
      
      hoursByJobType[jobType].totalHours += entry.hours
    })

    // Calculate unique jobs per type and average hours
    Object.keys(hoursByJobType).forEach(jobType => {
      const jobTypeEntries = timeEntries.filter(entry => 
        (entry.job?.jobType || 'Other') === jobType
      )
      const uniqueJobs = new Set(jobTypeEntries.map(entry => entry.jobId))
      hoursByJobType[jobType].jobCount = uniqueJobs.size
      hoursByJobType[jobType].averageHoursPerJob = 
        uniqueJobs.size > 0 ? hoursByJobType[jobType].totalHours / uniqueJobs.size : 0
    })

    // Daily hours breakdown
    const dailyHours: Record<string, {
      date: string,
      totalHours: number,
      employeeCount: number,
      entryCount: number
    }> = {}

    timeEntries.forEach(entry => {
      const dateStr = entry.date.toISOString().split('T')[0]
      if (!dailyHours[dateStr]) {
        dailyHours[dateStr] = {
          date: dateStr,
          totalHours: 0,
          employeeCount: 0,
          entryCount: 0
        }
      }
      
      dailyHours[dateStr].totalHours += entry.hours
      dailyHours[dateStr].entryCount += 1
    })

    // Calculate unique employees per day
    Object.keys(dailyHours).forEach(dateStr => {
      const dayEntries = timeEntries.filter(entry => 
        entry.date.toISOString().split('T')[0] === dateStr
      )
      const uniqueEmployees = new Set(dayEntries.map(entry => entry.employeeName))
      dailyHours[dateStr].employeeCount = uniqueEmployees.size
    })

    const dailyHoursArray = Object.values(dailyHours)
      .sort((a, b) => a.date.localeCompare(b.date))

    // Recent time entries
    const recentEntries = timeEntries
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 20)
      .map(entry => ({
        id: entry.id,
        employeeName: entry.employeeName,
        hours: entry.hours,
        date: entry.date,
        description: entry.description,
        jobNumber: entry.job?.jobNumber,
        jobDescription: entry.job?.description,
        jobType: entry.job?.jobType
      }))

    // Calculate efficiency metrics
    const uniqueEmployees = new Set(timeEntries.map(entry => entry.employeeName)).size
    const uniqueJobs = new Set(timeEntries.map(entry => entry.jobId)).size
    const averageHoursPerEmployee = uniqueEmployees > 0 ? totalHours / uniqueEmployees : 0
    const averageHoursPerJob = uniqueJobs > 0 ? totalHours / uniqueJobs : 0

    return NextResponse.json({
      summary: {
        totalHours,
        totalEntries: timeEntries.length,
        uniqueEmployees,
        uniqueJobs,
        averageHoursPerEmployee,
        averageHoursPerJob
      },
      topEmployeesByHours,
      hoursByJobType: Object.values(hoursByJobType),
      dailyHours: dailyHoursArray,
      recentEntries,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        range: timeRange
      }
    })
  } catch (error) {
    console.error('Error generating crew productivity report:', error)
    return NextResponse.json(
      { error: 'Failed to generate crew productivity report' },
      { status: 500 }
    )
  }
}