import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

/**
 * Sunday 8 PM Reminder Cron Job
 *
 * This endpoint should be called every Sunday at 8:00 PM
 * It sends reminders to all employees who have unsubmitted time entries for the current week
 *
 * Cron Schedule: 0 20 * * 0 (Every Sunday at 8:00 PM)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is being called from an authorized source
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[CRON] Starting Sunday 8 PM reminder job...')

    // Get the current week's date range (Monday to Sunday)
    const now = new Date()
    const dayOfWeek = now.getDay() // 0 = Sunday

    // Calculate Monday of current week
    const monday = new Date(now)
    monday.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1))
    monday.setHours(0, 0, 0, 0)

    // Calculate Sunday of current week (today)
    const sunday = new Date(now)
    sunday.setHours(23, 59, 59, 999)

    console.log('[CRON] Week range:', { monday, sunday })

    // Find all active employees
    const employeesResult = await query(
      `SELECT id, name, email
       FROM "User"
       WHERE role = 'EMPLOYEE' AND active = true`,
      []
    )

    const employees = employeesResult.rows
    console.log(`[CRON] Found ${employees.length} active employees`)

    let remindersCreated = 0
    let employeesWithDraftEntries = 0

    for (const employee of employees) {
      // Check if employee has any draft time entries for this week
      const draftEntriesResult = await query(
        `SELECT COUNT(*) as count
         FROM "TimeEntry"
         WHERE "userId" = $1
           AND date >= $2
           AND date <= $3
           AND (status = 'draft' OR status IS NULL)`,
        [employee.id, monday.toISOString(), sunday.toISOString()]
      )

      const draftCount = parseInt(draftEntriesResult.rows[0]?.count || '0')

      if (draftCount > 0) {
        employeesWithDraftEntries++

        // Create reminder notification
        await query(
          `INSERT INTO "NotificationLog" (
            id, "userId", type, subject, message, status, "createdAt"
          ) VALUES (
            gen_random_uuid(),
            $1,
            'TIME_CARD_REMINDER',
            'Reminder: Submit Your Time Card',
            $2,
            'unread',
            NOW()
          )`,
          [
            employee.id,
            `You have ${draftCount} unsubmitted time ${draftCount === 1 ? 'entry' : 'entries'} for this week. Please review and submit your time card by 11:59 PM tonight. Your time card will be automatically submitted at midnight if not submitted manually.`
          ]
        )

        remindersCreated++
        console.log(`[CRON] Created reminder for ${employee.name} (${draftCount} draft entries)`)
      }
    }

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      weekRange: {
        start: monday.toISOString(),
        end: sunday.toISOString()
      },
      employeesChecked: employees.length,
      employeesWithDraftEntries,
      remindersCreated
    }

    console.log('[CRON] Sunday reminder job completed:', result)

    return NextResponse.json(result)

  } catch (error) {
    console.error('[CRON] Error in Sunday reminder job:', error)
    return NextResponse.json(
      {
        error: 'Failed to process Sunday reminder',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
