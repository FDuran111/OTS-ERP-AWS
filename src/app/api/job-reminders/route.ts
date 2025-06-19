import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    const status = searchParams.get('status') || 'ACTIVE'
    const daysAhead = parseInt(searchParams.get('daysAhead') || '30')

    let whereClause = 'WHERE r.status = $1'
    let params: any[] = [status]

    if (jobId) {
      whereClause += ' AND r."jobId" = $2'
      params.push(jobId)
    } else {
      // For dashboard view, only show reminders for upcoming dates
      whereClause += ' AND r."reminderDate" >= NOW() AND r."reminderDate" <= NOW() + INTERVAL \'$2 days\''
      params.push(daysAhead)
    }

    const remindersResult = await query(
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
      ${whereClause}
      ORDER BY r."reminderDate" ASC`,
      params
    )

    const reminders = remindersResult.rows.map(row => ({
      id: row.id,
      jobId: row.jobId,
      jobNumber: row.jobNumber,
      jobDescription: row.jobDescription,
      jobScheduledDate: row.scheduledDate,
      jobStatus: row.jobStatus,
      customer: row.companyName || `${row.firstName} ${row.lastName}`,
      type: row.type,
      title: row.title,
      message: row.message,
      reminderDate: row.reminderDate,
      priority: row.priority,
      status: row.status,
      createdAt: row.createdAt,
      acknowledgedAt: row.acknowledgedAt,
      snoozedUntil: row.snoozedUntil,
    }))

    return NextResponse.json({ reminders })
  } catch (error) {
    console.error('Error fetching job reminders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job reminders' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      jobId,
      type,
      title,
      message,
      reminderDate,
      priority = 'MEDIUM'
    } = await request.json()

    if (!jobId || !type || !reminderDate) {
      return NextResponse.json(
        { error: 'Missing required fields: jobId, type, reminderDate' },
        { status: 400 }
      )
    }

    const result = await query(
      `INSERT INTO "JobReminder" (
        "jobId", type, title, message, "reminderDate", priority, status, "createdAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', NOW())
      RETURNING *`,
      [jobId, type, title, message, new Date(reminderDate), priority]
    )

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error creating job reminder:', error)
    return NextResponse.json(
      { error: 'Failed to create job reminder' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const action = searchParams.get('action')

    if (!id) {
      return NextResponse.json(
        { error: 'Reminder ID is required' },
        { status: 400 }
      )
    }

    let updateQuery = ''
    let params: any[] = []

    switch (action) {
      case 'acknowledge':
        updateQuery = `UPDATE "JobReminder" SET status = 'ACKNOWLEDGED', "acknowledgedAt" = NOW() WHERE id = $1`
        params = [id]
        break
      
      case 'snooze':
        const { snoozedUntil } = await request.json()
        if (!snoozedUntil) {
          return NextResponse.json(
            { error: 'snoozedUntil date is required for snooze action' },
            { status: 400 }
          )
        }
        updateQuery = `UPDATE "JobReminder" SET status = 'SNOOZED', "snoozedUntil" = $2 WHERE id = $1`
        params = [id, new Date(snoozedUntil)]
        break
      
      case 'dismiss':
        updateQuery = `UPDATE "JobReminder" SET status = 'DISMISSED', "acknowledgedAt" = NOW() WHERE id = $1`
        params = [id]
        break
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: acknowledge, snooze, or dismiss' },
          { status: 400 }
        )
    }

    await query(updateQuery, params)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating job reminder:', error)
    return NextResponse.json(
      { error: 'Failed to update job reminder' },
      { status: 500 }
    )
  }
}