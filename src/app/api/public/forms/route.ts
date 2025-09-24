import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'
import { headers } from 'next/headers'
import crypto from 'crypto'

const serviceRequestSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(10, 'Phone number is required'),
  companyName: z.string().optional(),
  serviceType: z.string().min(1, 'Service type is required'),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']).default('MEDIUM'),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  formId: z.string().optional(),
  pageUrl: z.string().optional(),
  referrer: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
})

function verifyApiKey(request: NextRequest): boolean {
  const headersList = headers()
  const apiKey = headersList.get('x-api-key') || request.headers.get('x-api-key')

  if (!apiKey) return false

  const validApiKey = process.env.WEBSITE_API_KEY || 'ots-website-2024-prod'

  return apiKey === validApiKey
}

function getPriorityFromUrgency(urgency: string): string {
  switch(urgency) {
    case 'EMERGENCY':
      return 'URGENT'
    case 'HIGH':
      return 'HIGH'
    case 'MEDIUM':
      return 'MEDIUM'
    case 'LOW':
      return 'LOW'
    default:
      return 'MEDIUM'
  }
}

function getSourceInfo(data: any): string {
  let source = 'Website Form'

  if (data.formId) {
    source += ` - ${data.formId}`
  }

  if (data.utmSource) {
    source += ` (${data.utmSource}`
    if (data.utmMedium) source += `/${data.utmMedium}`
    if (data.utmCampaign) source += `/${data.utmCampaign}`
    source += ')'
  }

  return source
}

export async function POST(request: NextRequest) {
  try {
    if (!verifyApiKey(request)) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid API key' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('[Public Form API] Received submission:', {
      formId: body.formId,
      email: body.email,
      serviceType: body.serviceType
    })

    const data = serviceRequestSchema.parse(body)

    const leadId = crypto.randomUUID()
    const now = new Date()

    const nextFollowUp = data.preferredDate
      ? new Date(data.preferredDate)
      : new Date(Date.now() + 24 * 60 * 60 * 1000)

    const leadResult = await query(
      `INSERT INTO "Lead" (
        id, "firstName", "lastName", "companyName", email, phone,
        street, city, state, zip, source, "estimatedValue",
        priority, description, notes, "nextFollowUpDate",
        "lastContactDate", status, "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *`,
      [
        leadId,
        data.firstName,
        data.lastName,
        data.companyName || null,
        data.email,
        data.phone,
        data.street || null,
        data.city || null,
        data.state || null,
        data.zip || null,
        getSourceInfo(data),
        null,
        getPriorityFromUrgency(data.urgency),
        data.description,
        `Service Type: ${data.serviceType}\nPreferred Date: ${data.preferredDate || 'Not specified'}\nPreferred Time: ${data.preferredTime || 'Not specified'}`,
        nextFollowUp,
        now,
        'WARM_LEAD',
        now,
        now
      ]
    )

    const lead = leadResult.rows[0]

    await query(
      `INSERT INTO "LeadActivity" (
        id, "leadId", type, description, "completedDate", "createdBy", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        crypto.randomUUID(),
        leadId,
        'FORM_SUBMISSION',
        `Service request form submitted from website.\nService Type: ${data.serviceType}\nUrgency: ${data.urgency}\nPage: ${data.pageUrl || 'Unknown'}`,
        now,
        'SYSTEM',
        now,
        now
      ]
    )

    if (data.urgency === 'EMERGENCY') {
      try {
        await query(
          `INSERT INTO "NotificationLog" (
            id, type, recipient, subject, message, status, "sentAt", "createdAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            crypto.randomUUID(),
            'EMERGENCY_LEAD',
            'admin@ortmeier.com',
            'EMERGENCY Service Request',
            `Emergency service request from ${data.firstName} ${data.lastName}\nPhone: ${data.phone}\nService: ${data.serviceType}`,
            'PENDING',
            now,
            now
          ]
        )
      } catch (notifError) {
        console.error('[Public Form API] Failed to create emergency notification:', notifError)
      }
    }

    console.log('[Public Form API] Lead created successfully:', lead.id)

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      message: 'Your service request has been received. We will contact you shortly.',
      estimatedResponseTime: data.urgency === 'EMERGENCY'
        ? '1-2 hours'
        : data.urgency === 'HIGH'
        ? '4-6 hours'
        : '24 hours'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[Public Form API] Validation error:', error.errors)
      return NextResponse.json(
        {
          error: 'Invalid form data',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      )
    }

    console.error('[Public Form API] Server error:', error)
    return NextResponse.json(
      { error: 'Failed to process your request. Please try again or call us directly.' },
      { status: 500 }
    )
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  const allowedOrigins = [
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:4000',
    'https://111-consulting-group.github.io',
    'https://ortmeier.com',
    process.env.WEBSITE_URL
  ].filter(Boolean)

  const corsOrigin = allowedOrigins.includes(origin || '') ? origin : allowedOrigins[0]

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': corsOrigin || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
      'Access-Control-Max-Age': '86400',
    },
  })
}