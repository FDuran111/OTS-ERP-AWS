import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {}
  }

  // Check environment variables
  debugInfo.checks.envVars = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    JWT_SECRET: !!process.env.JWT_SECRET,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET'
  }

  // Test database connection
  try {
    const result = await query('SELECT NOW() as current_time, version() as version')
    debugInfo.checks.database = {
      connected: true,
      time: result.rows[0].current_time,
      version: result.rows[0].version
    }
  } catch (error) {
    debugInfo.checks.database = {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  // Check if User table exists
  try {
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'User'
      )
    `)
    debugInfo.checks.userTable = tableCheck.rows[0].exists
  } catch (error) {
    debugInfo.checks.userTable = false
  }

  // Check JWT functionality
  try {
    const { generateToken, verifyToken } = await import('@/lib/auth')
    const testToken = generateToken({ id: 'test', email: 'test@test.com', name: 'Test', role: 'EMPLOYEE' })
    const verified = verifyToken(testToken)
    debugInfo.checks.jwt = {
      canGenerate: true,
      canVerify: !!verified
    }
  } catch (error) {
    debugInfo.checks.jwt = {
      canGenerate: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  return NextResponse.json(debugInfo)
}