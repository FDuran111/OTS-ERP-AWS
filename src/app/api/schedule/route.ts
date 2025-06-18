import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
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

    // Get scheduled jobs with customer information
    const jobsResult = await query(`
      SELECT 
        j.*,
        c."firstName",
        c."lastName",
        c."companyName",
        c.phone,
        c.address,
        c.city,
        c.state
      FROM "Job" j
      INNER JOIN "Customer" c ON j."customerId" = c.id
      WHERE j.status IN ('SCHEDULED', 'DISPATCHED', 'IN_PROGRESS')
      ORDER BY j."createdAt" DESC
    `)

    const jobs = jobsResult.rows

    // Skip time entries for now to avoid database issues

    // Group jobs by date
    const scheduleData: Record<string, any[]> = {}
    
    jobs.forEach(job => {
      const jobDate = job.scheduledDate || job.startDate
      if (!jobDate) return
      
      const dateKey = format(new Date(jobDate), 'yyyy-MM-dd')
      
      if (!scheduleData[dateKey]) {
        scheduleData[dateKey] = []
      }
      
      const customerName = job.companyName || 
        `${job.firstName} ${job.lastName}`
      
      const jobTime = job.scheduledTime || 
        (job.startDate ? format(new Date(job.startDate), 'h:mm a') : '9:00 AM')
      
      scheduleData[dateKey].push({
        id: job.id,
        time: jobTime,
        jobNumber: job.jobNumber,
        title: job.description,
        customer: customerName,
        customerPhone: job.phone,
        address: `${job.address || ''} ${job.city || ''} ${job.state || ''}`.trim(),
        status: job.status,
        priority: job.priority || 'medium',
        jobType: job.type,
        estimatedHours: parseFloat(job.estimatedHours) || 0,
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