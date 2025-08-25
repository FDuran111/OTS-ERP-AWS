import { NextRequest, NextResponse } from 'next/server';
import { getStorageConfig, isAwsEnv } from '@/lib/storage/config';
import { getEnvIsolationStatus } from '@/lib/assertEnvIsolation';
import { verifyToken } from '@/lib/auth';

/**
 * Admin endpoint to check environment configuration status
 * Requires OWNER_ADMIN role for access
 * Returns only safe, non-sensitive configuration information
 */
export async function GET(request: NextRequest) {
  try {
    // Require OWNER_ADMIN authentication
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }
    
    const user = verifyToken(token);
    
    if (!user || user.role !== 'OWNER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - OWNER_ADMIN role required' },
        { status: 403 }
      );
    }
    
    const env = process.env.NEXT_PUBLIC_ENV || 'development';
    const storageConfig = getStorageConfig();
    const isolationStatus = getEnvIsolationStatus();
    
    // Check for Supabase configuration (without exposing values)
    const supabaseConfigured = Object.keys(process.env)
      .some(key => key.includes('SUPABASE') && !!process.env[key]);
    
    // Check database configuration (extract only hostname, no credentials)
    const dbUrl = process.env.DATABASE_URL || '';
    let dbProvider = 'unknown';
    let dbHostname = '';
    
    try {
      const url = new URL(dbUrl.replace('postgresql://', 'https://'));
      // Only extract hostname, no port/path/credentials
      dbHostname = url.hostname;
      
      if (dbHostname.includes('supabase')) {
        dbProvider = 'supabase';
      } else if (dbHostname.includes('rds.amazonaws.com')) {
        dbProvider = 'aws-rds';
      } else if (dbHostname.includes('localhost') || dbHostname.includes('127.0.0.1')) {
        dbProvider = 'local';
      }
    } catch (error) {
      // Invalid or missing DATABASE_URL
      dbProvider = 'not-configured';
      dbHostname = 'not-configured';
    }
    
    // Build SAFE status report (no sensitive data)
    const status = {
      environment: env,
      timestamp: new Date().toISOString(),
      
      // Storage configuration (safe fields only)
      storageProvider: storageConfig.provider,
      bucket: storageConfig.bucket, // Bucket name is safe to expose
      
      // Database configuration (hostname only, no connection strings)
      dbHost: dbHostname,
      dbProvider: dbProvider,
      
      // Supabase detection (boolean only)
      supabaseConfigured: supabaseConfigured,
      
      // Compliance status (high-level only, no detailed errors)
      compliance: {
        awsLockEnforced: false,
        hasIssues: false
      }
    };
    
    // Check AWS lock compliance (without exposing details)
    if (isAwsEnv) {
      const isCompliant = 
        storageConfig.provider === 's3' &&
        dbProvider === 'aws-rds' &&
        !supabaseConfigured &&
        isolationStatus.isValid;
      
      status.compliance.awsLockEnforced = isCompliant;
      status.compliance.hasIssues = !isCompliant;
    } else {
      // Not applicable for non-AWS environments
      status.compliance.awsLockEnforced = true;
      status.compliance.hasIssues = false;
    }
    
    // Return status with appropriate HTTP code
    const httpStatus = status.compliance.awsLockEnforced ? 200 : 500;
    
    return NextResponse.json(status, { status: httpStatus });
    
  } catch (error: any) {
    // Log error internally but don't expose details
    console.error('Environment status check error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}