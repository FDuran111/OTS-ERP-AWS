import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let supabaseClient: SupabaseClient | null = null

if (supabaseUrl && supabaseKey) {
  supabaseClient = createClient(supabaseUrl, supabaseKey)
} else {
  console.warn('Supabase credentials not configured. Supabase storage will not be available.')
}

// Bucket name configuration
const BUCKET_NAME = process.env.STORAGE_BUCKET || process.env.SUPABASE_STORAGE_BUCKET || 'uploads'
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '52428800') // 50MB default

export interface UploadParams {
  key: string
  body: Buffer | Uint8Array | string
  contentType: string
  metadata?: Record<string, string>
}

export interface FileUploadResult {
  key: string
  bucket: string
  url: string
  size: number
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadToSupabase(params: UploadParams): Promise<FileUploadResult> {
  if (!supabaseClient) {
    throw new Error('Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.')
  }

  const { key, body, contentType, metadata } = params

  // Convert string to Buffer if needed
  const fileBody = typeof body === 'string' ? Buffer.from(body) : body

  // Upload file to Supabase Storage
  const { data, error } = await supabaseClient.storage
    .from(BUCKET_NAME)
    .upload(key, fileBody, {
      contentType,
      upsert: false, // Don't overwrite existing files
      metadata,
    })

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`)
  }

  // Get public URL (or signed URL if bucket is private)
  const url = await getPublicUrl(key)

  return {
    key: data.path,
    bucket: BUCKET_NAME,
    url,
    size: fileBody instanceof Buffer ? fileBody.length : new Blob([fileBody]).size,
  }
}

/**
 * Get a public or signed URL for accessing a file
 */
export async function getPublicUrl(key: string, expiresIn: number = 3600): Promise<string> {
  if (!supabaseClient) {
    throw new Error('Supabase not configured.')
  }

  // For private buckets, create a signed URL
  const { data, error } = await supabaseClient.storage
    .from(BUCKET_NAME)
    .createSignedUrl(key, expiresIn)

  if (error) {
    // If signed URL fails (e.g., public bucket), fall back to public URL
    const { data: publicData } = supabaseClient.storage
      .from(BUCKET_NAME)
      .getPublicUrl(key)

    return publicData.publicUrl
  }

  return data.signedUrl
}

/**
 * Get a signed upload URL for direct browser uploads
 */
export async function getSignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  if (!supabaseClient) {
    throw new Error('Supabase not configured.')
  }

  // Supabase doesn't have presigned upload URLs like S3
  // Instead, clients upload directly using the storage API
  // Return the upload endpoint for client-side uploads
  const { data } = await supabaseClient.storage
    .from(BUCKET_NAME)
    .createSignedUploadUrl(key)

  if (!data) {
    throw new Error('Failed to create signed upload URL')
  }

  return data.signedUrl
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFromSupabase(key: string): Promise<void> {
  if (!supabaseClient) {
    throw new Error('Supabase not configured.')
  }

  const { error } = await supabaseClient.storage
    .from(BUCKET_NAME)
    .remove([key])

  if (error) {
    throw new Error(`Supabase delete failed: ${error.message}`)
  }
}

/**
 * List files in a directory
 */
export async function listFiles(prefix: string = '', limit: number = 100): Promise<any[]> {
  if (!supabaseClient) {
    throw new Error('Supabase not configured.')
  }

  const { data, error } = await supabaseClient.storage
    .from(BUCKET_NAME)
    .list(prefix, {
      limit,
      sortBy: { column: 'created_at', order: 'desc' },
    })

  if (error) {
    throw new Error(`Supabase list failed: ${error.message}`)
  }

  return data || []
}

/**
 * Generate storage key for job files
 */
export function generateJobFileKey(
  jobId: string,
  category: 'photo' | 'document' | 'invoice' | 'attachment',
  fileName: string
): string {
  const timestamp = Date.now()
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')

  // Add environment prefix for isolation
  const env = process.env.NEXT_PUBLIC_ENV || 'dev'
  const prefix = env === 'production' ? 'prod' : env === 'staging' ? 'staging' : 'dev'

  return `${prefix}/jobs/${jobId}/${category}/${timestamp}_${sanitizedFileName}`
}

/**
 * Generate storage key for thumbnails
 */
export function generateThumbnailKey(originalKey: string): string {
  const parts = originalKey.split('/')
  const fileName = parts.pop()
  return [...parts, 'thumbnails', `thumb_${fileName}`].join('/')
}

/**
 * Validate file size
 */
export function validateFileSize(size: number): boolean {
  return size <= MAX_FILE_SIZE
}

/**
 * Validate file type
 */
export function validateFileType(mimeType: string): boolean {
  const allowedTypes = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // Text
    'text/plain',
    'text/csv',
  ]

  return allowedTypes.includes(mimeType)
}

/**
 * Get file extension from mime type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'text/plain': 'txt',
    'text/csv': 'csv',
  }

  return mimeToExt[mimeType] || 'bin'
}

export { supabaseClient, BUCKET_NAME, MAX_FILE_SIZE }
