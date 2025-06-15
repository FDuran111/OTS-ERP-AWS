import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addDays, differenceInDays, isAfter, isBefore } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const now = new Date()
    const in30Days = addDays(now, 30)

    // Get all scheduled jobs in the next 30 days
    const upcomingJobs = await prisma.job.findMany({
      where: {
        scheduledDate: {
          gte: now,
          lte: in30Days,
        },
        status: {
          in: ['SCHEDULED', 'DISPATCHED']
        }
      },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            companyName: true,
          }
        }
      },
      orderBy: {
        scheduledDate: 'asc'
      }
    })

    // Process jobs into reminders
    const reminders = upcomingJobs.map(job => {
      const scheduledDate = new Date(job.scheduledDate!)
      const daysUntil = differenceInDays(scheduledDate, now)
      
      let priority: 'high' | 'medium' | 'low' = 'low'
      let type: 'start_reminder' | 'deadline_warning' | 'overdue' = 'start_reminder'

      // Determine priority and type based on days until start
      if (daysUntil <= 1) {
        priority = 'high'
        type = 'start_reminder'
      } else if (daysUntil <= 3) {
        priority = 'high'
        type = 'start_reminder'
      } else if (daysUntil <= 7) {
        priority = 'medium'
        type = 'start_reminder'
      } else {
        priority = 'low'
        type = 'start_reminder'
      }

      // Handle overdue jobs (shouldn't happen with our filter, but good to have)
      if (daysUntil < 0) {
        priority = 'high'
        type = 'overdue'
      }

      const customerName = job.customer.companyName || 
        `${job.customer.firstName} ${job.customer.lastName}`

      return {
        id: `reminder-${job.id}`,
        jobId: job.id,
        jobNumber: job.jobNumber,
        title: job.description || 'Scheduled Job',
        customer: customerName,
        scheduledDate: job.scheduledDate!.toISOString(),
        daysUntil,
        priority,
        type,
      }
    })

    // Filter to only show reminders for jobs starting in 7 days or less
    const activeReminders = reminders.filter(reminder => 
      reminder.daysUntil <= 7 && reminder.daysUntil >= 0
    )

    return NextResponse.json({
      reminders: activeReminders,
      total: activeReminders.length,
      upcomingTotal: reminders.length,
    })
  } catch (error) {
    console.error('Error fetching reminders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reminders' },
      { status: 500 }
    )
  }
}