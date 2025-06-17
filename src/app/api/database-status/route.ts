import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test basic database connectivity
    const startTime = Date.now()
    await prisma.$queryRaw`SELECT 1 as test`
    const connectionTime = Date.now() - startTime

    // Get database info
    const dbResult = await prisma.$queryRaw<[{version: string}]>`SELECT version() as version`
    const version = dbResult[0]?.version || 'Unknown'

    // Count basic tables to see if schema exists
    const userCount = await prisma.user.count()
    const materialCount = await prisma.material.count()
    const jobCount = await prisma.job.count()

    return NextResponse.json({
      status: 'connected',
      connectionTime: `${connectionTime}ms`,
      database: {
        version,
        connected: true,
      },
      schema: {
        users: userCount,
        materials: materialCount,
        jobs: jobCount,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Database status check failed:', error)
    
    let errorType = 'unknown'
    let suggestion = 'Check database configuration and network connectivity.'
    
    if (error instanceof Error) {
      if (error.message.includes('Can\'t reach database server')) {
        errorType = 'connection_timeout'
        suggestion = 'The Supabase database may be paused. Check the Supabase dashboard and resume the project if needed.'
      } else if (error.message.includes('password authentication failed')) {
        errorType = 'authentication_failed'
        suggestion = 'Database credentials may be incorrect. Check DATABASE_URL environment variable.'
      } else if (error.message.includes('database') && error.message.includes('does not exist')) {
        errorType = 'database_not_found'
        suggestion = 'The specified database does not exist. Check DATABASE_URL configuration.'
      }
    }

    return NextResponse.json(
      { 
        status: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType,
        suggestion,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}