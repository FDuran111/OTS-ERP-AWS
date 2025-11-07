import { NextResponse } from 'next/server'

/**
 * Health check endpoint for Render.com
 *
 * This endpoint is used by Render to verify the application is running correctly.
 * Returns 200 OK if healthy, 503 Service Unavailable if unhealthy.
 *
 * URL: /api/health
 */
export async function GET() {
  try {
    // Basic health check - verify app is responding
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NEXT_PUBLIC_ENV || 'unknown',
      uptime: process.uptime(),
    }

    // Optional: Add database connectivity check
    // Uncomment if you want to verify database is reachable
    /*
    try {
      const { query } = await import('@/lib/db')
      await query('SELECT 1')
      health.database = 'connected'
    } catch (dbError) {
      health.database = 'disconnected'
      health.status = 'degraded'
    }
    */

    return NextResponse.json(health, { status: 200 })

  } catch (error) {
    // Something went wrong - return unhealthy status
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    )
  }
}
