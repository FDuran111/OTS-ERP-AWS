import { NextResponse } from 'next/server'
import { query, testConnection } from '@/lib/db'

export async function GET() {
  try {
    // Test basic database connectivity
    const startTime = Date.now()
    const isConnected = await testConnection()
    const connectionTime = Date.now() - startTime

    if (!isConnected) {
      throw new Error('Database connection test failed')
    }

    // Get database info
    const dbResult = await query('SELECT version() as version')
    const version = dbResult.rows[0]?.version || 'Unknown'

    // Count basic tables to see if schema exists
    const [userCount, materialCount, jobCount] = await Promise.all([
      query('SELECT COUNT(*) as count FROM "User"'),
      query('SELECT COUNT(*) as count FROM "Material"'),
      query('SELECT COUNT(*) as count FROM "Job"')
    ])

    return NextResponse.json({
      status: 'connected',
      connectionTime: `${connectionTime}ms`,
      database: {
        version,
        connected: true,
      },
      schema: {
        users: parseInt(userCount.rows[0].count),
        materials: parseInt(materialCount.rows[0].count),
        jobs: parseInt(jobCount.rows[0].count),
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Database status check failed:', error)
    
    let errorType = 'unknown'
    let suggestion = 'Check database configuration and network connectivity.'
    
    if (error instanceof Error) {
      if (error.message.includes('Can\'t reach database server') || error.message.includes('ECONNREFUSED')) {
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