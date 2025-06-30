import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { query } from '@/lib/db'
import { verifyToken, hashPassword, comparePassword } from '@/lib/auth'

// Validation schemas
const CompanySettingsSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  business_address: z.string().optional().nullable(),
  phone_number: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  license_number: z.string().optional().nullable(),
  tax_id: z.string().optional().nullable(),
  default_hourly_rate: z.number().min(0).optional().nullable(),
  invoice_terms: z.string().optional().nullable(),
})

const NotificationSettingsSchema = z.object({
  email_notifications: z.boolean().optional(),
  sms_notifications: z.boolean().optional(),
  new_job_assignments: z.boolean().optional(),
  schedule_changes: z.boolean().optional(),
  invoice_reminders: z.boolean().optional(),
  material_low_stock_alerts: z.boolean().optional(),
  customer_messages: z.boolean().optional(),
  daily_summary: z.boolean().optional(),
})

const SecuritySettingsSchema = z.object({
  two_factor_auth: z.boolean().optional(),
  current_password: z.string().optional(),
  new_password: z.string().min(6).optional(),
  confirm_password: z.string().optional(),
}).refine((data) => {
  if (data.new_password && data.new_password !== data.confirm_password) {
    return false
  }
  return true
}, {
  message: "Passwords don't match",
  path: ["confirm_password"],
})

const AppearanceSettingsSchema = z.object({
  dark_mode: z.boolean().optional(),
  show_job_numbers: z.boolean().optional(),
  compact_view: z.boolean().optional(),
  show_tooltips: z.boolean().optional(),
})

const SettingsUpdateSchema = z.object({
  type: z.enum(['company', 'notifications', 'security', 'appearance']),
  data: z.union([
    CompanySettingsSchema,
    NotificationSettingsSchema,
    SecuritySettingsSchema,
    AppearanceSettingsSchema,
  ]),
})

// Helper function to check if table exists
async function tableExists(tableName: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = $1
      )`,
      [tableName]
    )
    return result.rows[0]?.exists || false
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error)
    return false
  }
}

// GET - Fetch all settings
export async function GET(request: NextRequest) {
  try {
    // Get user ID from JWT token
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Decode JWT to get user ID
    const userPayload = verifyToken(token)
    const userId = userPayload.id

    // Initialize default settings
    let companySettings = {
      company_name: 'Ortmeier Technical Service',
      business_address: null,
      phone_number: null,
      email: null,
      license_number: null,
      tax_id: null,
      default_hourly_rate: 125.00,
      invoice_terms: 'Net 30',
    }
    
    let notificationSettings = {
      email_notifications: true,
      sms_notifications: false,
      new_job_assignments: true,
      schedule_changes: true,
      invoice_reminders: true,
      material_low_stock_alerts: false,
      customer_messages: true,
      daily_summary: false,
    }
    
    let securitySettings = {
      two_factor_auth: false,
    }
    
    let appearanceSettings = {
      dark_mode: true,
      show_job_numbers: true,
      compact_view: true,
      show_tooltips: false,
    }

    // Check if tables exist and fetch data if they do
    if (await tableExists('CompanySettings')) {
      const companyResult = await query(
        'SELECT * FROM "CompanySettings" ORDER BY id DESC LIMIT 1'
      )
      if (companyResult.rows.length > 0) {
        companySettings = companyResult.rows[0]
      }
    }

    if (await tableExists('UserNotificationSettings')) {
      const notificationResult = await query(
        'SELECT * FROM "UserNotificationSettings" WHERE user_id = $1',
        [userId]
      )
      if (notificationResult.rows.length > 0) {
        notificationSettings = notificationResult.rows[0]
      }
    }

    if (await tableExists('UserSecuritySettings')) {
      const securityResult = await query(
        'SELECT two_factor_auth FROM "UserSecuritySettings" WHERE user_id = $1',
        [userId]
      )
      if (securityResult.rows.length > 0) {
        securitySettings = securityResult.rows[0]
      }
    }

    if (await tableExists('UserAppearanceSettings')) {
      const appearanceResult = await query(
        'SELECT * FROM "UserAppearanceSettings" WHERE user_id = $1',
        [userId]
      )
      if (appearanceResult.rows.length > 0) {
        appearanceSettings = appearanceResult.rows[0]
      }
    }

    return NextResponse.json({
      company: companySettings,
      notifications: notificationSettings,
      security: securitySettings,
      appearance: appearanceSettings,
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// POST - Update settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = SettingsUpdateSchema.parse(body)

    // Get user ID from JWT token
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Decode JWT to get user ID
    const userPayload = verifyToken(token)
    const userId = userPayload.id

    switch (type) {
      case 'company':
        const companyData = CompanySettingsSchema.parse(data)
        
        // Check if table exists
        if (!(await tableExists('CompanySettings'))) {
          console.warn('CompanySettings table does not exist')
          return NextResponse.json({ 
            success: false, 
            message: 'Settings tables not initialized. Please contact administrator.' 
          })
        }
        
        // Check if company settings exist
        const existingCompany = await query(
          'SELECT id FROM "CompanySettings" ORDER BY id DESC LIMIT 1'
        )

        if (existingCompany.rows.length > 0) {
          // Update existing settings
          await query(
            `UPDATE "CompanySettings" SET 
             company_name = $1, business_address = $2, phone_number = $3, 
             email = $4, license_number = $5, tax_id = $6, 
             default_hourly_rate = $7, invoice_terms = $8
             WHERE id = $9`,
            [
              companyData.company_name,
              companyData.business_address || null,
              companyData.phone_number || null,
              companyData.email || null,
              companyData.license_number || null,
              companyData.tax_id || null,
              companyData.default_hourly_rate || null,
              companyData.invoice_terms || null,
              existingCompany.rows[0].id,
            ]
          )
        } else {
          // Insert new settings
          await query(
            `INSERT INTO "CompanySettings" 
             (company_name, business_address, phone_number, email, license_number, tax_id, default_hourly_rate, invoice_terms)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              companyData.company_name,
              companyData.business_address || null,
              companyData.phone_number || null,
              companyData.email || null,
              companyData.license_number || null,
              companyData.tax_id || null,
              companyData.default_hourly_rate || null,
              companyData.invoice_terms || null,
            ]
          )
        }
        break

      case 'notifications':
        const notificationData = NotificationSettingsSchema.parse(data)
        
        // Check if table exists
        if (!(await tableExists('UserNotificationSettings'))) {
          console.warn('UserNotificationSettings table does not exist')
          return NextResponse.json({ 
            success: false, 
            message: 'Settings tables not initialized. Please contact administrator.' 
          })
        }
        
        // Upsert notification settings
        await query(
          `INSERT INTO "UserNotificationSettings" 
           (user_id, email_notifications, sms_notifications, new_job_assignments, 
            schedule_changes, invoice_reminders, material_low_stock_alerts, 
            customer_messages, daily_summary)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (user_id) DO UPDATE SET
           email_notifications = EXCLUDED.email_notifications,
           sms_notifications = EXCLUDED.sms_notifications,
           new_job_assignments = EXCLUDED.new_job_assignments,
           schedule_changes = EXCLUDED.schedule_changes,
           invoice_reminders = EXCLUDED.invoice_reminders,
           material_low_stock_alerts = EXCLUDED.material_low_stock_alerts,
           customer_messages = EXCLUDED.customer_messages,
           daily_summary = EXCLUDED.daily_summary`,
          [
            userId,
            notificationData.email_notifications,
            notificationData.sms_notifications,
            notificationData.new_job_assignments,
            notificationData.schedule_changes,
            notificationData.invoice_reminders,
            notificationData.material_low_stock_alerts,
            notificationData.customer_messages,
            notificationData.daily_summary,
          ]
        )
        break

      case 'security':
        const securityData = SecuritySettingsSchema.parse(data)
        
        // Handle password change if provided
        if (securityData.new_password && securityData.current_password) {
          // Verify current password
          const userResult = await query(
            'SELECT password FROM "User" WHERE id = $1',
            [userId]
          )
          
          if (userResult.rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
          }
          
          const isCurrentPasswordValid = await comparePassword(
            securityData.current_password,
            userResult.rows[0].password
          )
          
          if (!isCurrentPasswordValid) {
            return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
          }
          
          // Hash and update new password
          const hashedPassword = await hashPassword(securityData.new_password)
          
          await query(
            'UPDATE "User" SET password = $1 WHERE id = $2',
            [hashedPassword, userId]
          )
          
          // Only update password timestamp if table exists
          if (await tableExists('UserSecuritySettings')) {
            await query(
              `INSERT INTO "UserSecuritySettings" (user_id, password_changed_at)
               VALUES ($1, CURRENT_TIMESTAMP)
               ON CONFLICT (user_id) DO UPDATE SET
               password_changed_at = CURRENT_TIMESTAMP`,
              [userId]
            )
          }
        }

        // Only update security settings if table exists
        if (await tableExists('UserSecuritySettings')) {
          await query(
            `INSERT INTO "UserSecuritySettings" (user_id, two_factor_auth)
             VALUES ($1, $2)
             ON CONFLICT (user_id) DO UPDATE SET
             two_factor_auth = EXCLUDED.two_factor_auth`,
            [userId, securityData.two_factor_auth]
          )
        } else {
          console.warn('UserSecuritySettings table does not exist')
          if (!securityData.new_password) {
            return NextResponse.json({ 
              success: false, 
              message: 'Settings tables not initialized. Please contact administrator.' 
            })
          }
        }
        break

      case 'appearance':
        const appearanceData = AppearanceSettingsSchema.parse(data)
        
        // Check if table exists
        if (!(await tableExists('UserAppearanceSettings'))) {
          console.warn('UserAppearanceSettings table does not exist')
          return NextResponse.json({ 
            success: false, 
            message: 'Settings tables not initialized. Please contact administrator.' 
          })
        }
        
        // Upsert appearance settings
        await query(
          `INSERT INTO "UserAppearanceSettings" 
           (user_id, dark_mode, show_job_numbers, compact_view, show_tooltips)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (user_id) DO UPDATE SET
           dark_mode = EXCLUDED.dark_mode,
           show_job_numbers = EXCLUDED.show_job_numbers,
           compact_view = EXCLUDED.compact_view,
           show_tooltips = EXCLUDED.show_tooltips`,
          [
            userId,
            appearanceData.dark_mode,
            appearanceData.show_job_numbers,
            appearanceData.compact_view,
            appearanceData.show_tooltips,
          ]
        )
        break
    }

    return NextResponse.json({ success: true, message: 'Settings updated successfully' })
  } catch (error) {
    console.error('Error updating settings:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}