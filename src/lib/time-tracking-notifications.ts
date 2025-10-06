import { query } from './db'
import { emailService } from './email'

export interface TimeEntryNotificationData {
  timeEntryId: string
  employeeId: string
  employeeName: string
  employeeEmail: string
  date: string
  hours: number
  jobNumber?: string
  jobTitle?: string
  reason?: string
  adminName?: string
}

export class TimeTrackingNotificationService {
  private static instance: TimeTrackingNotificationService

  private constructor() {}

  static getInstance(): TimeTrackingNotificationService {
    if (!TimeTrackingNotificationService.instance) {
      TimeTrackingNotificationService.instance = new TimeTrackingNotificationService()
    }
    return TimeTrackingNotificationService.instance
  }

  async sendTimeEntryApprovedNotification(data: TimeEntryNotificationData): Promise<void> {
    const subject = `Time Entry Approved for ${data.date}`
    const message = `Your time entry for ${data.date} (${data.hours} hours${data.jobNumber ? ` on job ${data.jobNumber}` : ''}) has been approved${data.adminName ? ` by ${data.adminName}` : ''}.`

    await this.createNotification({
      userId: data.employeeId,
      type: 'TIME_ENTRY_APPROVED',
      subject,
      message,
      metadata: {
        timeEntryId: data.timeEntryId,
        date: data.date,
        hours: data.hours,
        jobNumber: data.jobNumber,
      },
      link: '/time',
    })

    await this.sendEmail({
      to: data.employeeEmail,
      subject,
      message,
      employeeName: data.employeeName,
    })
  }

  async sendTimeEntryRejectedNotification(data: TimeEntryNotificationData): Promise<void> {
    const subject = `Time Entry Needs Revision - ${data.date}`
    const message = `Your time entry for ${data.date} needs revision. ${data.reason || 'Please review and resubmit.'}${data.adminName ? ` - ${data.adminName}` : ''}`

    await this.createNotification({
      userId: data.employeeId,
      type: 'TIME_ENTRY_REJECTED',
      subject,
      message,
      metadata: {
        type: 'TIME_ENTRY_REJECTED', // Add type to metadata for dialog detection
        timeEntryId: data.timeEntryId,
        date: data.date,
        hours: data.hours,
        jobNumber: data.jobNumber,
        reason: data.reason,
      },
      link: '/time',
      priority: 'high',
    })

    await this.sendEmail({
      to: data.employeeEmail,
      subject,
      message,
      employeeName: data.employeeName,
      urgent: true,
    })
  }

  async sendTimeEntrySubmittedNotification(
    adminUsers: { id: string; email: string; name: string }[],
    data: TimeEntryNotificationData
  ): Promise<void> {
    const subject = `Time Entry Submitted - ${data.employeeName}`
    const message = `${data.employeeName} submitted a time entry for ${data.date} (${data.hours} hours${data.jobNumber ? ` on job ${data.jobNumber}` : ''}) for approval.`

    for (const admin of adminUsers) {
      await this.createNotification({
        userId: admin.id,
        type: 'TIME_ENTRY_SUBMITTED',
        subject,
        message,
        metadata: {
          timeEntryId: data.timeEntryId,
          employeeId: data.employeeId,
          employeeName: data.employeeName,
          date: data.date,
          hours: data.hours,
          jobNumber: data.jobNumber,
        },
        link: '/admin/time-approval',
        priority: 'medium',
      })

      await this.sendEmail({
        to: admin.email,
        subject,
        message,
        employeeName: admin.name,
      })
    }
  }

  async sendWeeklyTimesheetReminder(
    employeeId: string,
    employeeName: string,
    employeeEmail: string,
    weekEnding: string
  ): Promise<void> {
    const subject = `Reminder: Submit Your Timesheet`
    const message = `Don't forget to submit your timesheet for the week ending ${weekEnding}. Please review your hours and submit by end of day.`

    await this.createNotification({
      userId: employeeId,
      type: 'TIMESHEET_REMINDER',
      subject,
      message,
      metadata: {
        weekEnding,
      },
      link: '/time',
      priority: 'medium',
    })

    await this.sendEmail({
      to: employeeEmail,
      subject,
      message,
      employeeName,
    })
  }

  async sendOvertimeAlertNotification(
    data: TimeEntryNotificationData & { overtimeHours: number; weekEnding: string }
  ): Promise<void> {
    const subject = `Overtime Alert - Week Ending ${data.weekEnding}`
    const message = `You have ${data.overtimeHours} hours of overtime for the week ending ${data.weekEnding}. Total hours: ${data.hours}.`

    await this.createNotification({
      userId: data.employeeId,
      type: 'OVERTIME_ALERT',
      subject,
      message,
      metadata: {
        weekEnding: data.weekEnding,
        totalHours: data.hours,
        overtimeHours: data.overtimeHours,
      },
      link: '/time',
      priority: 'low',
    })
  }

  private async createNotification(params: {
    userId: string
    type: string
    subject: string
    message: string
    metadata?: any
    link?: string
    priority?: 'low' | 'medium' | 'high'
  }): Promise<void> {
    try {
      await query(
        `INSERT INTO "NotificationLog" 
        ("userId", type, subject, message, metadata, status, channel, "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          params.userId,
          params.type,
          params.subject,
          params.message,
          JSON.stringify({
            ...params.metadata,
            link: params.link,
            priority: params.priority || 'low',
          }),
          'PENDING',
          'IN_APP',
        ]
      )
    } catch (error) {
      console.error('Error creating notification:', error)
    }
  }

  private async sendEmail(params: {
    to: string
    subject: string
    message: string
    employeeName: string
    urgent?: boolean
  }): Promise<void> {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${params.urgent ? '#d32f2f' : '#1976d2'}; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f5f5f5; padding: 20px; margin-top: 20px; }
            .message { background-color: white; padding: 20px; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .btn { display: inline-block; background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Ortmeier Tree Service</h1>
              <h2>Time Tracking ${params.urgent ? 'Alert' : 'Notification'}</h2>
            </div>
            
            <div class="content">
              <p>Hi ${params.employeeName},</p>
              
              <div class="message">
                <p>${params.message}</p>
              </div>
              
              <p style="margin-top: 20px;">Log in to the system to view details and take action.</p>
              <a href="#" class="btn">View Time Entries</a>
            </div>
            
            <div class="footer">
              <p>This is an automated message from Ortmeier Tree Service</p>
              <p>Please do not reply to this email</p>
            </div>
          </div>
        </body>
        </html>
      `

      await emailService.sendEmail({
        to: params.to,
        subject: params.subject,
        html,
        text: params.message,
      })
    } catch (error) {
      console.error('Error sending email:', error)
    }
  }

  async getAdminUsers(): Promise<{ id: string; email: string; name: string }[]> {
    try {
      const result = await query(
        `SELECT id, email, "firstName", "lastName"
         FROM "User"
         WHERE role IN ('ADMIN', 'MANAGER', 'HR_MANAGER')
         AND email IS NOT NULL
         AND "isActive" = true`
      )

      return result.rows.map(row => ({
        id: row.id,
        email: row.email,
        name: `${row.firstName} ${row.lastName}`,
      }))
    } catch (error) {
      console.error('Error getting admin users:', error)
      return []
    }
  }
}

export const timeTrackingNotifications = TimeTrackingNotificationService.getInstance()
