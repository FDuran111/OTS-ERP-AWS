import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getStorage } from '@/lib/storage'

/**
 * Health Check Endpoint
 * Returns the status of various services
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  // Initialize service statuses
  let dbStatus: 'ok' | 'fail' | 'skipped' = 'skipped'
  let storageStatus: 'ok' | 'fail' = 'fail'
  let storageDriver = process.env.STORAGE_DRIVER || 'SUPABASE'
  
  // Check database connectivity
  try {
    if (process.env.DATABASE_URL) {
      await query('SELECT 1')
      dbStatus = 'ok'
    } else {
      dbStatus = 'skipped' // No database configured
    }
  } catch (error) {
    console.error('Database health check failed:', error)
    dbStatus = 'fail'
  }
  
  // Check storage connectivity
  try {
    const storage = getStorage()
    const testBucket = process.env.S3_BUCKET || 'uploads'
    
    // Try to generate a signed URL (read-only test)
    await storage.getSignedUrl({
      bucket: testBucket,
      key: 'healthcheck.txt',
      expiresInSeconds: 60,
      operation: 'get'
    })
    
    storageStatus = 'ok'
  } catch (error) {
    console.error('Storage health check failed:', error)
    storageStatus = 'fail'
  }
  
  // Determine overall status
  let overallStatus: 'ok' | 'degraded' | 'fail' = 'ok'
  
  if (dbStatus === 'fail' || storageStatus === 'fail') {
    if (dbStatus === 'fail' && storageStatus === 'fail') {
      overallStatus = 'fail'
    } else {
      overallStatus = 'degraded'
    }
  }
  
  // Build response
  const response = {
    status: overallStatus,
    time: new Date().toISOString(),
    services: {
      db: dbStatus,
      storage: storageStatus,
      driver: storageDriver.toUpperCase()
    },
    version: process.env.APP_VERSION || null,
    responseTime: Date.now() - startTime
  }
  
  // Set appropriate status code
  let statusCode = 200
  if (overallStatus === 'fail') {
    statusCode = 503 // Service Unavailable
  } else if (overallStatus === 'degraded') {
    statusCode = 200 // Still return 200 for degraded to avoid triggering alarms
  }
  
  return NextResponse.json(response, { status: statusCode })
}