import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getStorageConfig } from '@/lib/storage/config';

export async function GET() {
  try {
    // Get storage configuration
    const storageConfig = getStorageConfig();
    
    // Basic health check
    const checks = {
      ok: true,
      timestamp: new Date().toISOString(),
      environment: process.env.NEXT_PUBLIC_ENV || 'unknown',
      storageProvider: storageConfig.provider,
      hasSupabaseConfig: !!(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_SERVICE_ROLE_KEY),
      checks: {
        api: true,
        database: false,
        storageConfig: true
      }
    };
    
    // Try database connection
    try {
      await query('SELECT NOW() as time');
      checks.checks.database = true;
    } catch (dbError) {
      // Database check failed but API is still healthy
      console.error('Database health check failed:', dbError);
      checks.checks.database = false;
    }
    
    // Overall health is ok if API is running (database is optional for health)
    checks.ok = checks.checks.api;
    
    return NextResponse.json(checks, { 
      status: checks.ok ? 200 : 503 
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { 
        ok: false, 
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}