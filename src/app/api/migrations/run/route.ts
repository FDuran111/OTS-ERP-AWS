import { NextRequest, NextResponse } from 'next/server'
import { runAllMigrations } from '@/lib/db-migrations/migration-runner'

// This endpoint should be called once on application startup
// In production, this should be part of your deployment process
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication to protect this endpoint
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.MIGRATION_AUTH_TOKEN
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    console.log('Starting database migrations...')
    await runAllMigrations()
    
    return NextResponse.json({
      success: true,
      message: 'Migrations completed successfully'
    })
  } catch (error) {
    console.error('Migration failed:', error)
    
    return NextResponse.json(
      { 
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}