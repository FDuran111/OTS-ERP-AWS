/**
 * Environment Isolation Guard
 * Prevents staging environment from accidentally connecting to production resources
 */

const PROD_INDICATORS = [
  'prod',
  'production',
  'live',
  'prd'
]

interface EnvCheckResult {
  isValid: boolean
  violations: string[]
}

/**
 * Check if a connection string or URL contains production indicators
 */
function containsProductionIndicator(value: string | undefined): boolean {
  if (!value) return false
  
  const lowerValue = value.toLowerCase()
  return PROD_INDICATORS.some(indicator => lowerValue.includes(indicator))
}

/**
 * Check if we're in an AWS-only environment
 */
const isAwsEnv = ['staging', 'production'].includes(process.env.NEXT_PUBLIC_ENV ?? '')

/**
 * Assert that staging environment is properly isolated from production
 * AND that AWS environments don't use Supabase
 * Throws an error if misconfigured
 */
export function assertEnvIsolation(): void {
  const env = process.env.NEXT_PUBLIC_ENV
  
  // Skip checks for development
  if (!env || env === 'development') {
    return
  }

  const violations: string[] = []

  // AWS-ONLY CHECKS: No Supabase allowed in staging/production
  if (isAwsEnv) {
    // Check for any Supabase environment variables
    const supabaseVars = Object.keys(process.env).filter(key => 
      key.includes('SUPABASE') && process.env[key]
    )
    
    if (supabaseVars.length > 0) {
      violations.push(
        `Supabase variables detected in ${env} environment: ${supabaseVars.join(', ')}. ` +
        'Supabase must not be used in staging/production - these environments are locked to AWS services only.'
      )
    }
    
    // Check if DATABASE_URL contains Supabase
    const dbUrl = process.env.DATABASE_URL || ''
    if (dbUrl.includes('supabase') || dbUrl.endsWith('.supabase.co') || dbUrl.includes('.supabase.com')) {
      violations.push(
        `DATABASE_URL points to Supabase in ${env} environment. ` +
        'Must use AWS RDS for staging/production.'
      )
    }
    
    // Check if STORAGE_BUCKET contains Supabase
    if (process.env.STORAGE_BUCKET?.includes('supabase')) {
      violations.push(
        `STORAGE_BUCKET contains 'supabase' in ${env} environment. ` +
        'Must use AWS S3 for staging/production.'
      )
    }
  }

  // STAGING-ONLY CHECKS: No production resources
  if (env === 'staging') {
    // Check DATABASE_URL for production indicators
    if (containsProductionIndicator(process.env.DATABASE_URL)) {
      violations.push('DATABASE_URL contains production indicators')
    }

    // Check Supabase URLs
    if (containsProductionIndicator(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
      violations.push('NEXT_PUBLIC_SUPABASE_URL contains production indicators')
    }

    // Check S3/Storage bucket names and endpoints
    if (containsProductionIndicator(process.env.AWS_S3_BUCKET)) {
      violations.push('AWS_S3_BUCKET contains production indicators')
    }

    if (containsProductionIndicator(process.env.STORAGE_BUCKET)) {
      violations.push('STORAGE_BUCKET contains production indicators')
    }

    // Check API endpoints
    if (containsProductionIndicator(process.env.NEXT_PUBLIC_API_URL)) {
      violations.push('NEXT_PUBLIC_API_URL contains production indicators')
    }

    if (containsProductionIndicator(process.env.NEXTAUTH_URL)) {
      violations.push('NEXTAUTH_URL contains production indicators')
    }

    // Check QuickBooks endpoints
    if (containsProductionIndicator(process.env.QB_REDIRECT_URI)) {
      violations.push('QB_REDIRECT_URI contains production indicators')
    }
  }

  // If any violations found, throw error
  if (violations.length > 0) {
    const errorMessage = `
🚨 ENVIRONMENT ISOLATION VIOLATION DETECTED 🚨

Staging environment is configured to connect to production resources!
This is a critical security issue that must be fixed immediately.

Violations detected:
${violations.map(v => `  ❌ ${v}`).join('\n')}

Current environment: ${env}

To fix this:
1. Ensure all staging environment variables point to staging resources
2. Check your .env.local or environment configuration
3. Never use production credentials in staging

The application will not start until this is resolved.
    `.trim()

    console.error(errorMessage)
    throw new Error('Environment isolation violation: Staging pointing to production resources')
  }
}

/**
 * Get current environment isolation status
 * Useful for monitoring and debugging
 */
export function getEnvIsolationStatus(): EnvCheckResult {
  const env = process.env.NEXT_PUBLIC_ENV
  
  if (env !== 'staging') {
    return {
      isValid: true,
      violations: []
    }
  }

  const violations: string[] = []

  // Perform same checks as assertEnvIsolation
  const checks = [
    { name: 'DATABASE_URL', value: process.env.DATABASE_URL },
    { name: 'NEXT_PUBLIC_SUPABASE_URL', value: process.env.NEXT_PUBLIC_SUPABASE_URL },
    { name: 'AWS_S3_BUCKET', value: process.env.AWS_S3_BUCKET },
    { name: 'STORAGE_BUCKET', value: process.env.STORAGE_BUCKET },
    { name: 'NEXT_PUBLIC_API_URL', value: process.env.NEXT_PUBLIC_API_URL },
    { name: 'NEXTAUTH_URL', value: process.env.NEXTAUTH_URL },
    { name: 'QB_REDIRECT_URI', value: process.env.QB_REDIRECT_URI }
  ]

  for (const check of checks) {
    if (containsProductionIndicator(check.value)) {
      violations.push(`${check.name} contains production indicators`)
    }
  }

  return {
    isValid: violations.length === 0,
    violations
  }
}

/**
 * Log environment isolation status
 * Useful for startup diagnostics
 */
export function logEnvIsolationStatus(): void {
  const env = process.env.NEXT_PUBLIC_ENV
  
  if (env === 'staging') {
    const status = getEnvIsolationStatus()
    
    if (status.isValid) {
      console.log('✅ Environment isolation check passed: Staging is properly isolated')
    } else {
      console.error('❌ Environment isolation check failed:', status.violations)
    }
  } else if (env === 'production') {
    console.log('🔒 Running in production environment')
  } else {
    console.log(`🔧 Running in ${env || 'development'} environment`)
  }
}