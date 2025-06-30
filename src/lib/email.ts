import { query } from './db'

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
}

export interface JobAssignmentEmailData {
  jobNumber: string
  jobTitle: string
  customerName: string
  address?: string
  scheduledDate?: string
  scheduledTime?: string
  assignedBy: string
  notes?: string
  crewMembers?: string[]
}

export class EmailService {
  private static instance: EmailService
  private provider: 'resend' | 'sendgrid' | 'smtp' | 'console'
  private apiKey?: string
  private fromEmail: string
  private fromName: string

  private constructor() {
    // Check for email provider configuration
    this.provider = (process.env.EMAIL_PROVIDER as any) || 'console'
    this.apiKey = process.env.EMAIL_API_KEY
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@ots.com'
    this.fromName = process.env.EMAIL_FROM_NAME || 'Ortmeier Technical Service'

    if (this.provider !== 'console' && !this.apiKey) {
      console.warn('Email provider configured but no API key found. Falling back to console.')
      this.provider = 'console'
    }
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const from = options.from || `${this.fromName} <${this.fromEmail}>`

      switch (this.provider) {
        case 'resend':
          return await this.sendViaResend({ ...options, from })
        case 'sendgrid':
          return await this.sendViaSendGrid({ ...options, from })
        case 'smtp':
          return await this.sendViaSMTP({ ...options, from })
        default:
          return await this.sendViaConsole({ ...options, from })
      }
    } catch (error) {
      console.error('Error sending email:', error)
      return false
    }
  }

  private async sendViaConsole(options: EmailOptions): Promise<boolean> {
    console.log('=== EMAIL NOTIFICATION ===')
    console.log('To:', options.to)
    console.log('Subject:', options.subject)
    console.log('From:', options.from)
    console.log('Content:')
    console.log(options.text || 'See HTML content')
    console.log('========================')
    
    // Log to database for tracking
    await this.logEmailSent(options.to, options.subject, 'console')
    
    return true
  }

  private async sendViaResend(options: EmailOptions): Promise<boolean> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: options.from,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
          reply_to: options.replyTo,
        }),
      })

      const result = await response.json()
      
      if (response.ok) {
        await this.logEmailSent(options.to, options.subject, 'resend', result.id)
        return true
      } else {
        console.error('Resend API error:', result)
        return false
      }
    } catch (error) {
      console.error('Error sending via Resend:', error)
      return false
    }
  }

  private async sendViaSendGrid(options: EmailOptions): Promise<boolean> {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: options.to }],
          }],
          from: { 
            email: this.fromEmail,
            name: this.fromName,
          },
          subject: options.subject,
          content: [
            {
              type: 'text/html',
              value: options.html,
            },
            ...(options.text ? [{
              type: 'text/plain',
              value: options.text,
            }] : []),
          ],
        }),
      })

      if (response.ok) {
        await this.logEmailSent(options.to, options.subject, 'sendgrid')
        return true
      } else {
        const error = await response.text()
        console.error('SendGrid API error:', error)
        return false
      }
    } catch (error) {
      console.error('Error sending via SendGrid:', error)
      return false
    }
  }

  private async sendViaSMTP(options: EmailOptions): Promise<boolean> {
    // Placeholder for SMTP implementation
    // Would require nodemailer or similar package
    console.warn('SMTP provider not implemented. Falling back to console.')
    return this.sendViaConsole(options)
  }

  private async logEmailSent(
    to: string, 
    subject: string, 
    provider: string, 
    messageId?: string
  ): Promise<void> {
    try {
      // Check if EmailLog table exists
      const tableCheck = await query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'EmailLog'
        )`
      )
      
      if (!tableCheck.rows[0]?.exists) {
        return
      }

      await query(
        `INSERT INTO "EmailLog" (recipient, subject, provider, message_id, sent_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [to, subject, provider, messageId]
      )
    } catch (error) {
      console.error('Error logging email:', error)
    }
  }

  // Job Assignment Email Template
  async sendJobAssignmentEmail(
    recipientEmail: string,
    data: JobAssignmentEmailData
  ): Promise<boolean> {
    const subject = `New Job Assignment: ${data.jobNumber} - ${data.jobTitle}`
    
    const scheduledInfo = data.scheduledDate 
      ? `<p><strong>Scheduled:</strong> ${new Date(data.scheduledDate).toLocaleDateString()} ${data.scheduledTime || ''}</p>`
      : '<p><strong>Status:</strong> Unscheduled - Please contact office for scheduling</p>'

    const crewInfo = data.crewMembers && data.crewMembers.length > 0
      ? `<p><strong>Crew:</strong> ${data.crewMembers.join(', ')}</p>`
      : ''

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1976d2; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f5f5f5; padding: 20px; margin-top: 20px; }
          .job-details { background-color: white; padding: 20px; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          strong { color: #1976d2; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Ortmeier Technical Service</h1>
            <h2>New Job Assignment</h2>
          </div>
          
          <div class="content">
            <p>You have been assigned to a new job:</p>
            
            <div class="job-details">
              <h3>${data.jobNumber} - ${data.jobTitle}</h3>
              <p><strong>Customer:</strong> ${data.customerName}</p>
              ${data.address ? `<p><strong>Location:</strong> ${data.address}</p>` : ''}
              ${scheduledInfo}
              ${crewInfo}
              ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
              <p><strong>Assigned by:</strong> ${data.assignedBy}</p>
            </div>
            
            <p style="margin-top: 20px;">Please log in to the system for more details and to track your time.</p>
          </div>
          
          <div class="footer">
            <p>This is an automated message from Ortmeier Technical Service</p>
            <p>Please do not reply to this email</p>
          </div>
        </div>
      </body>
      </html>
    `

    const text = `
New Job Assignment

Job: ${data.jobNumber} - ${data.jobTitle}
Customer: ${data.customerName}
${data.address ? `Location: ${data.address}` : ''}
${data.scheduledDate ? `Scheduled: ${new Date(data.scheduledDate).toLocaleDateString()} ${data.scheduledTime || ''}` : 'Status: Unscheduled - Please contact office for scheduling'}
${data.crewMembers && data.crewMembers.length > 0 ? `Crew: ${data.crewMembers.join(', ')}` : ''}
${data.notes ? `Notes: ${data.notes}` : ''}
Assigned by: ${data.assignedBy}

Please log in to the system for more details and to track your time.

---
This is an automated message from Ortmeier Technical Service
    `

    return await this.sendEmail({
      to: recipientEmail,
      subject,
      html,
      text,
    })
  }

  // Check if user has email notifications enabled
  async shouldSendNotification(userId: string, notificationType: string): Promise<boolean> {
    try {
      const result = await query(
        `SELECT email_notifications, ${notificationType} 
         FROM "UserNotificationSettings" 
         WHERE user_id = $1`,
        [userId]
      )

      if (result.rows.length === 0) {
        // Default to true if no settings found
        return true
      }

      const settings = result.rows[0]
      return settings.email_notifications && settings[notificationType]
    } catch (error) {
      console.error('Error checking notification settings:', error)
      // Default to true on error
      return true
    }
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance()