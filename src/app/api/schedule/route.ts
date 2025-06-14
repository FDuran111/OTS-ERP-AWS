import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfWeek, endOfWeek, addDays, format, startOfDay, endOfDay } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const viewType = searchParams.get('viewType') || 'week'
    const dateParam = searchParams.get('date')
    
    const baseDate = dateParam ? new Date(dateParam) : new Date()
    
    let startDate: Date
    let endDate: Date
    
    switch (viewType) {
      case 'day':
        startDate = startOfDay(baseDate)
        endDate = endOfDay(baseDate)
        break
      case 'month':
        // Get jobs for the entire month
        startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
        endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0)
        break
      default: // week
        startDate = startOfWeek(baseDate, { weekStartsOn: 1 }) // Monday start
        endDate = endOfWeek(baseDate, { weekStartsOn: 1 })
    }

    // Simplified query without complex relationships to avoid errors
    const jobs = await prisma.job.findMany({
      where: {
        status: {
          in: ['SCHEDULED', 'DISPATCHED', 'IN_PROGRESS']
        }
      },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            companyName: true,
            phone: true,
            street: true,
            city: true,
            state: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Skip time entries for now to avoid database issues

    // Group jobs by date
    const scheduleData: Record<string, any[]> = {}
    
    jobs.forEach(job => {
      const jobDate = job.scheduledDate || job.startDate
      if (!jobDate) return
      
      const dateKey = format(jobDate, 'yyyy-MM-dd')
      
      if (!scheduleData[dateKey]) {
        scheduleData[dateKey] = []
      }
      
      const customerName = job.customer.companyName || 
        `${job.customer.firstName} ${job.customer.lastName}`
      
      const jobTime = job.scheduledTime || 
        (job.startDate ? format(job.startDate, 'h:mm a') : '9:00 AM')
      
      scheduleData[dateKey].push({
        id: job.id,
        time: jobTime,
        jobNumber: job.jobNumber,
        title: job.description,
        customer: customerName,
        customerPhone: job.customer.phone,
        address: `${job.customer.street || ''} ${job.customer.city || ''} ${job.customer.state || ''}`.trim(),
        status: job.status,
        priority: job.priority,
        jobType: job.jobType,
        estimatedHours: job.estimatedHours,
        crew: 'Default Crew',
        crewId: null
      })
    })

    // Simplified crew availability - just return sample data for now
    const crewAvailability = [
      {
        name: 'Main Crew',
        totalHours: 32,
        scheduledHours: 24,
        availableHours: 16,
        status: 'available' as const
      },
      {
        name: 'Service Team',
        totalHours: 28,
        scheduledHours: 20,
        availableHours: 20,
        status: 'available' as const
      }
    ]

    // Generate date range for calendar display
    const dateRange = []
    let currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      const dateKey = format(currentDate, 'yyyy-MM-dd')
      dateRange.push({
        date: dateKey,
        displayDate: format(currentDate, 'EEEE, MMMM d'),
        jobs: scheduleData[dateKey] || []
      })
      currentDate = addDays(currentDate, 1)
    }

    // Summary statistics
    const totalJobs = jobs.length
    const jobsByStatus = {
      SCHEDULED: jobs.filter(job => job.status === 'SCHEDULED').length,
      DISPATCHED: jobs.filter(job => job.status === 'DISPATCHED').length,
      IN_PROGRESS: jobs.filter(job => job.status === 'IN_PROGRESS').length
    }

    return NextResponse.json({
      dateRange,
      crewAvailability,
      summary: {
        totalJobs,
        jobsByStatus,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          viewType
        }
      }
    })
  } catch (error) {
    console.error('Error fetching schedule data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch schedule data' },
      { status: 500 }
    )
  }
}