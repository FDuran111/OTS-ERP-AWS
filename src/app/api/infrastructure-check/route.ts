import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Check database configuration
    const dbDriver = process.env.DB_DRIVER || 'SUPABASE';
    const hasRDSConfig = !!(process.env.RDS_ENDPOINT || process.env.RDS_PROXY_ENDPOINT);
    const hasDatabaseURL = !!process.env.DATABASE_URL;
    
    // Parse DATABASE_URL to see what it points to
    let dbHost = 'unknown';
    let dbType = 'unknown';
    if (process.env.DATABASE_URL) {
      try {
        const url = new URL(process.env.DATABASE_URL.replace('postgresql://', 'http://'));
        dbHost = url.hostname;
        if (dbHost.includes('rds.amazonaws.com')) {
          dbType = 'AWS RDS';
        } else if (dbHost.includes('supabase')) {
          dbType = 'Supabase';
        } else {
          dbType = 'Other PostgreSQL';
        }
      } catch (e) {
        // URL parsing failed
      }
    }
    
    // Check storage configuration
    const storageDriver = process.env.STORAGE_DRIVER || 'SUPABASE';
    const hasS3Bucket = !!process.env.S3_BUCKET;
    const hasS3Credentials = !!(process.env.AWS_ACCESS_KEY_ID || process.env.AWS_REGION);
    
    // Get data counts
    const customerCount = await query('SELECT COUNT(*) FROM customers');
    const jobCount = await query('SELECT COUNT(*) FROM jobs');
    const phaseCount = await query('SELECT COUNT(*) FROM job_phases');
    const userCount = await query('SELECT COUNT(*) FROM "User"');
    
    // Check for Supabase-specific tables (if any remain)
    let supabaseTables = [];
    try {
      const tablesResult = await query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND (
          table_name LIKE 'auth_%' 
          OR table_name LIKE 'storage_%'
          OR table_name = 'schema_migrations'
        )
        ORDER BY table_name
      `);
      supabaseTables = tablesResult.rows.map((r: any) => r.table_name);
    } catch (e) {
      // Ignore errors
    }
    
    return NextResponse.json({
      infrastructure: {
        database: {
          driver: dbDriver,
          type: dbType,
          host: dbHost,
          isAWS: dbType === 'AWS RDS',
          isSupabase: dbType === 'Supabase',
          hasDatabaseURL,
          hasRDSConfig
        },
        storage: {
          driver: storageDriver,
          isAWS: storageDriver === 'S3',
          isSupabase: storageDriver === 'SUPABASE',
          hasS3Bucket,
          hasS3Credentials,
          s3Bucket: process.env.S3_BUCKET || 'not configured'
        }
      },
      data: {
        users: userCount.rows[0].count,
        customers: customerCount.rows[0].count,
        jobs: jobCount.rows[0].count,
        jobPhases: phaseCount.rows[0].count,
        supabaseTables: supabaseTables.length > 0 ? supabaseTables : 'none'
      },
      summary: {
        usingAWSDatabase: dbType === 'AWS RDS',
        usingAWSStorage: storageDriver === 'S3',
        fullyOnAWS: dbType === 'AWS RDS' && storageDriver === 'S3',
        hasSupabaseData: supabaseTables.length > 0,
        dataLocation: dbType === 'AWS RDS' ? 'All data is in AWS RDS' : 'Data location unknown'
      }
    });
    
  } catch (error: any) {
    console.error('Infrastructure check error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}