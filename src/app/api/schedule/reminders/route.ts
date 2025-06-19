import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { addDays, differenceInDays, format } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const daysAhead = parseInt(searchParams.get('daysAhead') || '30')
    const includeAcknowledged = searchParams.get('includeAcknowledged') === 'true'
    
    const now = new Date()
    const futureDate = addDays(now, daysAhead)

    // First, try to get reminders from JobReminder table if it exists
    let reminders: any[] = []
    
    try {
      const jobRemindersResult = await query(
        `SELECT 
          r.*,
          j."jobNumber",
          j.description as "jobDescription", 
          j."scheduledDate",
          j.status as "jobStatus",
          c."firstName",
          c."lastName",
          c."companyName"
        FROM "JobReminder" r
        INNER JOIN "Job" j ON r."jobId" = j.id
        INNER JOIN "Customer" c ON j."customerId" = c.id
        WHERE r."reminderDate" >= $1 
        AND r."reminderDate" <= $2
        ${includeAcknowledged ? '' : 'AND r.status IN (\'ACTIVE\', \'SNOOZED\')'}
        ORDER BY r."reminderDate" ASC, r.priority DESC`,
        [now, futureDate]
      )

      reminders = jobRemindersResult.rows.map(row => ({
        id: row.id,
        jobId: row.jobId,
        jobNumber: row.jobNumber,
        title: row.title,
        message: row.message,
        customer: row.companyName || `${row.firstName} ${row.lastName}`,
        scheduledDate: row.scheduledDate,
        reminderDate: row.reminderDate,
        daysUntil: differenceInDays(new Date(row.reminderDate), now),
        priority: row.priority.toLowerCase(),
        type: row.type.toLowerCase(),
        status: row.status,
        acknowledgedAt: row.acknowledgedAt,
        snoozedUntil: row.snoozedUntil,
        isEnhanced: true
      }))
    } catch (tableError) {
      // JobReminder table doesn't exist yet, fall back to generating from Job table
      console.log('JobReminder table not available, using fallback method')
      
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
        [now, futureDate]
      )

      // Generate reminders from scheduled jobs
      reminders = upcomingJobsResult.rows.map(job => {
        const scheduledDate = new Date(job.scheduledDate)
        const daysUntil = differenceInDays(scheduledDate, now)
        
        let priority: 'high' | 'medium' | 'low' = 'low'
        let type: 'job_start' | 'deadline_warning' | 'overdue' = 'job_start'

        if (daysUntil <= 0) {
          priority = 'high'
          type = 'overdue'
        } else if (daysUntil <= 1) {
          priority = 'high'
          type = 'job_start'
        } else if (daysUntil <= 3) {
          priority = 'high'
          type = 'job_start'
        } else if (daysUntil <= 7) {
          priority = 'medium'
          type = 'job_start'
        }

        const customerName = job.companyName || `${job.firstName} ${job.lastName}`

        return {
          id: `fallback-${job.id}`,
          jobId: job.id,
          jobNumber: job.jobNumber,
          title: `Job Starting: ${job.description || 'Scheduled Job'}`,
          message: `Job "${job.description || 'Scheduled Job'}" is scheduled to start on ${format(scheduledDate, 'MMM dd, yyyy')}`,
          customer: customerName,
          scheduledDate: scheduledDate.toISOString(),
          reminderDate: scheduledDate.toISOString(),
          daysUntil,
          priority,
          type,
          status: 'ACTIVE',
          isEnhanced: false
        }
      })
    }

    // Filter active reminders (within 14 days and not dismissed)
    const activeReminders = reminders.filter(reminder => 
      reminder.daysUntil <= 14 && 
      reminder.daysUntil >= -1 && // Include 1 day overdue
      (!reminder.status || reminder.status !== 'DISMISSED')
    )

    return NextResponse.json({
      reminders: activeReminders,
      total: activeReminders.length,
      enhancedSystem: reminders.length > 0 ? reminders[0]?.isEnhanced : false,
    })
  } catch (error) {
    console.error('Error fetching reminders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reminders' },
      { status: 500 }
    )
  }
}

// Create a new reminder
export async function POST(request: NextRequest) {
  try {
    const {
      jobId,
      type = 'CUSTOM',
      title,
      message,
      reminderDate,
      priority = 'MEDIUM'
    } = await request.json()

    if (!jobId || !title || !reminderDate) {
      return NextResponse.json(
        { error: 'Missing required fields: jobId, title, reminderDate' },
        { status: 400 }
      )
    }

    // Try to insert into JobReminder table
    try {
      const result = await query(
        `INSERT INTO "JobReminder" (
          "jobId", type, title, message, "reminderDate", priority, status, "createdAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', NOW())
        RETURNING *`,
        [jobId, type, title, message, new Date(reminderDate), priority]
      )

      return NextResponse.json(result.rows[0])
    } catch (tableError) {
      return NextResponse.json(
        { error: 'Enhanced reminder system not available. Please create JobReminder table first.' },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error('Error creating reminder:', error)
    return NextResponse.json(
      { error: 'Failed to create reminder' },
      { status: 500 }
    )
  }
}