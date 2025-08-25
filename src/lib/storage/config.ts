/**
 * Storage Configuration
 * Centralizes all storage-related configuration based on environment
 */

// Check if we're in an AWS-only environment
export const isAwsEnv = ['staging', 'production'].includes(process.env.NEXT_PUBLIC_ENV ?? '')

export interface StorageConfig {
  provider: 'supabase' | 's3'
  bucket: string
  region?: string
  prefix: string
  publicUrl?: string
  credentials?: {
    accessKeyId?: string
    secretAccessKey?: string
  }
  supabase?: {
    url?: string
    anonKey?: string
    serviceRoleKey?: string
  }
}

/**
 * Get storage configuration based on environment variables
 */
export function getStorageConfig(): StorageConfig {
  const env = process.env.NEXT_PUBLIC_ENV || 'development'
  
  // HARD LOCK: Force S3 for staging/production
  let provider: 's3' | 'supabase'
  if (isAwsEnv) {
    // AWS environments MUST use S3
    if (process.env.STORAGE_PROVIDER && process.env.STORAGE_PROVIDER !== 's3') {
      throw new Error(
        `CONFIGURATION ERROR: ${env} environment MUST use S3 storage. ` +
        `STORAGE_PROVIDER is set to '${process.env.STORAGE_PROVIDER}' but must be 's3' or unset. ` +
        `Staging and production environments are locked to AWS services only.`
      )
    }
    provider = 's3'
  } else {
    // Development/local can use either provider
    provider = (process.env.STORAGE_PROVIDER || 'supabase') as 's3' | 'supabase'
  }
  
  // Determine prefix based on environment
  let prefix = ''
  switch (env) {
    case 'production':
      prefix = 'prod/'
      break
    case 'staging':
      prefix = 'staging/'
      break
    case 'development':
      prefix = 'dev/'
      break
    default:
      prefix = `${env}/`
  }
  
  // Build configuration based on provider
  const config: StorageConfig = {
    provider,
    bucket: '',
    prefix,
  }
  
  if (provider === 's3') {
    // S3 Configuration
    config.bucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET || 'ots-arp-aws-uploads'
    config.region = process.env.S3_REGION || process.env.AWS_REGION || 'us-east-2'
    config.publicUrl = process.env.S3_PUBLIC_URL || `https://${config.bucket}.s3.${config.region}.amazonaws.com`
    
    // AWS credentials (will use IAM role in production, but can override for local dev)
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    }
  } else {
    // Supabase Configuration
    config.bucket = process.env.STORAGE_BUCKET || process.env.SUPABASE_STORAGE_BUCKET || 'uploads'
    config.supabase = {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    }
    config.publicUrl = `${config.supabase.url}/storage/v1/object/public/${config.bucket}`
  }
  
  // Override prefix if explicitly set
  if (process.env.STORAGE_PREFIX) {
    config.prefix = process.env.STORAGE_PREFIX
    // Ensure prefix ends with slash
    if (!config.prefix.endsWith('/')) {
      config.prefix += '/'
    }
  }
  
  // Validate configuration
  validateStorageConfig(config)
  
  return config
}

/**
 * Validate storage configuration
 */
function validateStorageConfig(config: StorageConfig): void {
  if (!config.bucket) {
    throw new Error('Storage bucket not configured')
  }
  
  if (config.provider === 's3') {
    if (!config.region) {
      throw new Error('S3 region not configured')
    }
  } else if (config.provider === 'supabase') {
    if (!config.supabase?.url || !config.supabase?.anonKey) {
      throw new Error('Supabase URL and anon key required for Supabase storage')
    }
  }
  
  // Warn about missing prefix in production
  if (process.env.NEXT_PUBLIC_ENV === 'production' && !config.prefix.startsWith('prod')) {
    console.warn('⚠️ Production environment should use "prod/" prefix for storage')
  }
  
  // Warn about using production prefix in non-production
  if (process.env.NEXT_PUBLIC_ENV !== 'production' && config.prefix.startsWith('prod')) {
    throw new Error('Non-production environment cannot use "prod/" prefix')
  }
}

/**
 * Get the full storage path with environment prefix
 */
export function getStoragePath(key: string): string {
  const config = getStorageConfig()
  
  // Remove leading slash if present
  key = key.replace(/^\//, '')
  
  // If key already has the prefix, return as is
  if (key.startsWith(config.prefix)) {
    return key
  }
  
  // Add prefix
  return `${config.prefix}${key}`
}

/**
 * Parse a storage path to extract the environment and key
 */
export function parseStoragePath(path: string): { env: string; key: string } {
  const parts = path.split('/')
  
  if (parts[0] === 'prod' || parts[0] === 'staging' || parts[0] === 'dev') {
    return {
      env: parts[0],
      key: parts.slice(1).join('/'),
    }
  }
  
  // No environment prefix
  return {
    env: 'unknown',
    key: path,
  }
}