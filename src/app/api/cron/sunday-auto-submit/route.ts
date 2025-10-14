import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

/**
 * Sunday 11:59 PM Auto-Submit Cron Job
 *
 * This endpoint should be called every Sunday at 11:59 PM
 * It automatically submits all draft time entries for the current week
 *
 * Cron Schedule: 59 23 * * 0 (Every Sunday at 11:59 PM)
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

    console.log('[CRON] Starting Sunday 11:59 PM auto-submit job...')

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

    let totalEntriesSubmitted = 0
    let employeesAffected = 0
    const submissionDetails: any[] = []

    for (const employee of employees) {
      // Get all draft time entries for this employee for the current week
      const draftEntriesResult = await query(
        `SELECT id, "jobId", date, hours
         FROM "TimeEntry"
         WHERE "userId" = $1
           AND date >= $2
           AND date <= $3
           AND (status = 'draft' OR status IS NULL)`,
        [employee.id, monday.toISOString(), sunday.toISOString()]
      )

      const draftEntries = draftEntriesResult.rows

      if (draftEntries.length > 0) {
        // Auto-submit all draft entries by updating their status
        const entryIds = draftEntries.map((e: any) => e.id)

        await query(
          `UPDATE "TimeEntry"
           SET status = 'submitted',
               "submittedAt" = NOW(),
               "submittedBy" = $1
           WHERE id = ANY($2::text[])`,
          [employee.id, entryIds]
        )

        totalEntriesSubmitted += draftEntries.length
        employeesAffected++

        // Calculate total hours for this employee's submission
        const totalHours = draftEntries.reduce((sum: number, entry: any) => {
          return sum + parseFloat(entry.hours || 0)
        }, 0)

        submissionDetails.push({
          employeeId: employee.id,
          employeeName: employee.name,
          entriesSubmitted: draftEntries.length,
          totalHours: totalHours.toFixed(2)
        })

        // Create notification for employee
        await query(
          `INSERT INTO "NotificationLog" (
            id, "userId", type, subject, message, status, "createdAt"
          ) VALUES (
            gen_random_uuid(),
            $1,
            'TIME_CARD_AUTO_SUBMITTED',
            'Time Card Auto-Submitted',
            $2,
            'unread',
            NOW()
          )`,
          [
            employee.id,
            `Your time card for this week has been automatically submitted (${draftEntries.length} ${draftEntries.length === 1 ? 'entry' : 'entries'}, ${totalHours.toFixed(2)} hours total). The entries are now pending approval.`
          ]
        )

        console.log(`[CRON] Auto-submitted ${draftEntries.length} entries for ${employee.name}`)
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
      employeesAffected,
      totalEntriesSubmitted,
      submissionDetails
    }

    console.log('[CRON] Sunday auto-submit job completed:', result)

    return NextResponse.json(result)

  } catch (error) {
    console.error('[CRON] Error in Sunday auto-submit job:', error)
    return NextResponse.json(
      {
        error: 'Failed to process Sunday auto-submit',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
