import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { query } from '@/lib/db'
import { emailService } from '@/lib/email'
import { verifyToken } from '@/lib/auth'

const notifyCrewSchema = z.object({
  crewMemberIds: z.array(z.string()).min(1, 'At least one crew member must be selected'),
  notes: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await context.params
    const body = await request.json()
    const { crewMemberIds, notes } = notifyCrewSchema.parse(body)

    // Get current user from token
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userPayload = verifyToken(token)
    const currentUserId = userPayload.id

    // Get current user details
    const currentUserResult = await query(
      'SELECT "firstName", "lastName" FROM "User" WHERE id = $1',
      [currentUserId]
    )
    
    if (currentUserResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const currentUser = currentUserResult.rows[0]
    const assignedBy = `${currentUser.firstName} ${currentUser.lastName}`

    // Get job details
    const jobResult = await query(
      `SELECT j.*, c."firstName", c."lastName", c."companyName"
       FROM "Job" j
       INNER JOIN "Customer" c ON j."customerId" = c.id
       WHERE j.id = $1`,
      [jobId]
    )

    if (jobResult.rows.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const job = jobResult.rows[0]
    const customerName = job.companyName || `${job.firstName} ${job.lastName}`

    // Get crew member details
    const crewResult = await query(
      `SELECT id, "firstName", "lastName", email 
       FROM "User" 
       WHERE id = ANY($1::uuid[])`,
      [crewMemberIds]
    )

    if (crewResult.rows.length === 0) {
      return NextResponse.json({ error: 'No valid crew members found' }, { status: 404 })
    }

    const crewMembers = crewResult.rows
    const crewNames = crewMembers.map(cm => `${cm.firstName} ${cm.lastName}`)

    // Send notifications to each crew member
    const notificationResults = []
    
    for (const crewMember of crewMembers) {
      // Check if user has notifications enabled
      const shouldSend = await emailService.shouldSendNotification(
        crewMember.id,
        'new_job_assignments'
      )

      if (!shouldSend) {
        notificationResults.push({
          userId: crewMember.id,
          name: `${crewMember.firstName} ${crewMember.lastName}`,
          status: 'skipped',
          reason: 'Notifications disabled',
        })
        continue
      }

      if (!crewMember.email) {
        notificationResults.push({
          userId: crewMember.id,
          name: `${crewMember.firstName} ${crewMember.lastName}`,
          status: 'failed',
          reason: 'No email address',
        })
        continue
      }

      // Build address string
      let address = job.address || ''
      if (job.city) address += address ? `, ${job.city}` : job.city
      if (job.state) address += address ? `, ${job.state}` : job.state
      if (job.zip) address += address ? ` ${job.zip}` : job.zip

      // Send email
      const success = await emailService.sendJobAssignmentEmail(
        crewMember.email,
        {
          jobNumber: job.jobNumber,
          jobTitle: job.title,
          customerName,
          address: address || undefined,
          scheduledDate: job.scheduledDate,
          scheduledTime: job.scheduledTime,
          assignedBy,
          notes,
          crewMembers: crewNames,
        }
      )

      notificationResults.push({
        userId: crewMember.id,
        name: `${crewMember.firstName} ${crewMember.lastName}`,
        status: success ? 'sent' : 'failed',
        email: crewMember.email,
      })

      // Log notification attempt
      try {
        await query(
          `INSERT INTO "NotificationLog" 
           (user_id, job_id, notification_type, status, sent_at)
           VALUES ($1, $2, 'job_assignment', $3, CURRENT_TIMESTAMP)`,
          [crewMember.id, jobId, success ? 'sent' : 'failed']
        )
      } catch (error) {
        // NotificationLog table might not exist
        console.error('Error logging notification:', error)
      }
    }

    // Return summary
    const sentCount = notificationResults.filter(r => r.status === 'sent').length
    const failedCount = notificationResults.filter(r => r.status === 'failed').length
    const skippedCount = notificationResults.filter(r => r.status === 'skipped').length

    return NextResponse.json({
      success: true,
      summary: {
        total: notificationResults.length,
        sent: sentCount,
        failed: failedCount,
        skipped: skippedCount,
      },
      details: notificationResults,
    })

  } catch (error) {
    console.error('Error sending crew notifications:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    )
  }
}