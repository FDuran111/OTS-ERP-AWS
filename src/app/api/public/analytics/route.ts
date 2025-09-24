import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'
import { headers } from 'next/headers'
import crypto from 'crypto'

const pageViewSchema = z.object({
  pageUrl: z.string().url(),
  pageTitle: z.string(),
  referrer: z.string().optional(),
  sessionId: z.string().optional(),
  visitorId: z.string().optional(),
  userAgent: z.string().optional(),
  screenResolution: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmTerm: z.string().optional(),
  utmContent: z.string().optional(),
  eventType: z.enum(['page_view', 'form_start', 'form_abandon', 'click', 'scroll']).default('page_view'),
  eventData: z.record(z.any()).optional(),
})

function verifyApiKey(request: NextRequest): boolean {
  const headersList = headers()
  const apiKey = headersList.get('x-api-key') || request.headers.get('x-api-key')

  if (!apiKey) return false

  const validApiKey = process.env.WEBSITE_API_KEY || 'ots-website-2024-prod'

  return apiKey === validApiKey
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') || 'unknown'
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
    const data = pageViewSchema.parse(body)

    const now = new Date()
    const clientIp = getClientIp(request)

    const metadata = {
      userAgent: data.userAgent || request.headers.get('user-agent') || 'unknown',
      screenResolution: data.screenResolution,
      ip: clientIp,
      utm: {
        source: data.utmSource,
        medium: data.utmMedium,
        campaign: data.utmCampaign,
        term: data.utmTerm,
        content: data.utmContent,
      },
      eventData: data.eventData,
    }

    await query(
      `INSERT INTO "CustomerActivity" (
        id, "customerId", "activityType", description, "activityDate",
        metadata, "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        crypto.randomUUID(),
        data.visitorId || 'anonymous',
        data.eventType.toUpperCase(),
        `${data.pageTitle} - ${data.pageUrl}`,
        now,
        JSON.stringify(metadata),
        now,
        now
      ]
    )

    if (data.eventType === 'form_start' || data.eventType === 'form_abandon') {
      console.log(`[Analytics] Form ${data.eventType === 'form_start' ? 'started' : 'abandoned'} on ${data.pageUrl}`)

      try {
        await query(
          `INSERT INTO "NotificationLog" (
            id, type, recipient, subject, message, status, metadata, "createdAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            crypto.randomUUID(),
            'FORM_ANALYTICS',
            'analytics',
            `Form ${data.eventType === 'form_start' ? 'Started' : 'Abandoned'}`,
            `Visitor ${data.visitorId || 'anonymous'} ${data.eventType === 'form_start' ? 'started' : 'abandoned'} a form on ${data.pageUrl}`,
            'INFO',
            JSON.stringify({
              pageUrl: data.pageUrl,
              sessionId: data.sessionId,
              visitorId: data.visitorId,
              timestamp: now.toISOString()
            }),
            now
          ]
        )
      } catch (error) {
        console.error('[Analytics] Failed to log form event:', error)
      }
    }

    return NextResponse.json({
      success: true,
      sessionId: data.sessionId || crypto.randomUUID(),
      timestamp: now.toISOString()
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid tracking data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[Analytics API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!verifyApiKey(request)) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid API key' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const endDate = searchParams.get('endDate') || new Date().toISOString()

    const result = await query(
      `SELECT
        DATE("activityDate") as date,
        "activityType",
        COUNT(*) as count,
        COUNT(DISTINCT "customerId") as unique_visitors
      FROM "CustomerActivity"
      WHERE "activityDate" BETWEEN $1 AND $2
        AND "activityType" IN ('PAGE_VIEW', 'FORM_START', 'FORM_ABANDON')
      GROUP BY DATE("activityDate"), "activityType"
      ORDER BY date DESC, "activityType"`,
      [startDate, endDate]
    )

    const topPages = await query(
      `SELECT
        description as page,
        COUNT(*) as views,
        COUNT(DISTINCT "customerId") as unique_visitors
      FROM "CustomerActivity"
      WHERE "activityDate" BETWEEN $1 AND $2
        AND "activityType" = 'PAGE_VIEW'
      GROUP BY description
      ORDER BY views DESC
      LIMIT 10`,
      [startDate, endDate]
    )

    const formMetrics = await query(
      `SELECT
        COUNT(CASE WHEN "activityType" = 'FORM_START' THEN 1 END) as forms_started,
        COUNT(CASE WHEN "activityType" = 'FORM_ABANDON' THEN 1 END) as forms_abandoned,
        COUNT(DISTINCT CASE WHEN "activityType" = 'FORM_START' THEN "customerId" END) as unique_form_starters
      FROM "CustomerActivity"
      WHERE "activityDate" BETWEEN $1 AND $2`,
      [startDate, endDate]
    )

    return NextResponse.json({
      dateRange: { startDate, endDate },
      dailyMetrics: result.rows,
      topPages: topPages.rows,
      formMetrics: formMetrics.rows[0] || {
        forms_started: 0,
        forms_abandoned: 0,
        unique_form_starters: 0
      }
    })

  } catch (error) {
    console.error('[Analytics API] Error fetching metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
      'Access-Control-Max-Age': '86400',
    },
  })
}