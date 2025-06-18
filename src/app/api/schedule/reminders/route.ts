import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { addDays, differenceInDays } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const now = new Date()
    const in30Days = addDays(now, 30)

    // Get all scheduled jobs in the next 30 days
    const upcomingJobsResult = await query(
      `SELECT 
        j.*,
        c."firstName",
        c."lastName",
        c."companyName"
      FROM "Job" j
      INNER JOIN "Customer" c ON j."customerId" = c.id
      WHERE j."scheduledDate" >= $1
      AND j."scheduledDate" <= $2
      AND j.status IN ('SCHEDULED', 'DISPATCHED')
      ORDER BY j."scheduledDate" ASC`,
      [now, in30Days]
    )

    // Process jobs into reminders
    const reminders = upcomingJobsResult.rows.map(job => {
      const scheduledDate = new Date(job.scheduledDate)
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

      const customerName = job.companyName || 
        `${job.firstName} ${job.lastName}`

      return {
        id: `reminder-${job.id}`,
        jobId: job.id,
        jobNumber: job.jobNumber,
        title: job.description || 'Scheduled Job',
        customer: customerName,
        scheduledDate: scheduledDate.toISOString(),
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