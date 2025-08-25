/**
 * Storage Provider Abstraction
 * Supports multiple storage backends (S3, Supabase) with environment-based configuration
 */

export interface StorageFile {
  name: string
  size: number
  lastModified?: Date
  contentType?: string
  url?: string
}

export interface StorageUploadOptions {
  contentType?: string
  metadata?: Record<string, string>
  public?: boolean
}

export interface StorageListOptions {
  prefix?: string
  maxKeys?: number
  delimiter?: string
}

export interface StorageProvider {
  /**
   * Upload a file to storage
   */
  upload(key: string, file: Buffer | Blob | File, options?: StorageUploadOptions): Promise<{ key: string; url?: string }>
  
  /**
   * Get a file from storage
   */
  get(key: string): Promise<{ data: Buffer | Blob; contentType?: string }>
  
  /**
   * Remove a file from storage
   */
  remove(key: string): Promise<void>
  
  /**
   * Get a signed URL for temporary access
   */
  getSignedUrl(key: string, expiresIn?: number): Promise<string>
  
  /**
   * List files in storage
   */
  list(options?: StorageListOptions): Promise<StorageFile[]>
  
  /**
   * Get public URL if file is publicly accessible
   */
  getPublicUrl?(key: string): string
  
  /**
   * Check if a file exists
   */
  exists?(key: string): Promise<boolean>
}

// Import providers
import { S3StorageProvider } from './s3'
import { getStorageConfig, isAwsEnv } from './config'

let storageProvider: StorageProvider | null = null

/**
 * Get the configured storage provider
 * Uses singleton pattern to reuse the same provider instance
 */
export async function getStorageProvider(): Promise<StorageProvider> {
  if (!storageProvider) {
    const config = getStorageConfig()
    
    switch (config.provider) {
      case 's3':
        storageProvider = new S3StorageProvider(config)
        break
      case 'supabase':
        // Only import Supabase provider if not in AWS environment
        if (isAwsEnv) {
          throw new Error(
            'CONFIGURATION ERROR: Supabase storage cannot be used in staging/production. ' +
            'These environments are locked to AWS services only.'
          )
        }
        // Dynamic import to avoid bundling Supabase in AWS builds
        const { SupabaseStorageProvider } = await import('./supabase')
        storageProvider = new SupabaseStorageProvider(config)
        break
      default:
        throw new Error(`Unknown storage provider: ${config.provider}`)
    }
    
    console.log(`📦 Storage provider initialized: ${config.provider} (prefix: ${config.prefix})`)
  }
  
  return storageProvider
}

/**
 * Get storage provider synchronously (S3 only, for AWS environments)
 * @deprecated Use getStorageProvider() which returns a Promise
 */
export function getStorageProviderSync(): StorageProvider {
  const config = getStorageConfig()
  
  if (config.provider !== 's3') {
    throw new Error('Synchronous storage provider only supports S3')
  }
  
  if (!storageProvider) {
    storageProvider = new S3StorageProvider(config)
    console.log(`📦 Storage provider initialized (sync): ${config.provider} (prefix: ${config.prefix})`)
  }
  
  return storageProvider
}

/**
 * Reset the storage provider (useful for testing)
 */
export function resetStorageProvider(): void {
  storageProvider = null
}

/**
 * Utility function to ensure keys have the correct environment prefix
 */
export function ensureKeyPrefix(key: string, prefix: string): string {
  // Remove leading slash if present
  key = key.replace(/^\//, '')
  
  // If key already has the prefix, return as is
  if (key.startsWith(prefix)) {
    return key
  }
  
  // Add prefix
  return `${prefix}${key}`
}

/**
 * Utility function to remove environment prefix from key
 */
export function removeKeyPrefix(key: string, prefix: string): string {
  if (key.startsWith(prefix)) {
    return key.slice(prefix.length)
  }
  return key
}