import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || process.env.AWS_REGION || 'us-east-1',
  // Credentials must be explicitly provided
  ...(process.env.AWS_ACCESS_KEY_ID && {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  }),
})

// Bucket name must be explicitly configured - no production fallback
const BUCKET_NAME = process.env.AWS_S3_BUCKET || process.env.S3_BUCKET
if (!BUCKET_NAME) {
  console.warn('AWS_S3_BUCKET not configured. S3 storage will not be available.')
}

const MAX_FILE_SIZE = parseInt(process.env.AWS_S3_MAX_FILE_SIZE || process.env.MAX_FILE_SIZE || '10485760') // 10MB default

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
 * Upload a file to S3
 */
export async function uploadToS3(params: UploadParams): Promise<FileUploadResult> {
  if (!BUCKET_NAME) {
    throw new Error('S3 bucket not configured. Set AWS_S3_BUCKET environment variable.')
  }

  const { key, body, contentType, metadata } = params

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
    Metadata: metadata,
    // ServerSideEncryption: 'AES256', // Enable if needed
  })

  await s3Client.send(command)

  // Generate a presigned URL for the uploaded file (expires in 1 hour)
  const url = await getPresignedUrl(key, 3600)

  return {
    key,
    bucket: BUCKET_NAME,
    url,
    size: body instanceof Buffer ? body.length : new Blob([body]).size,
  }
}

/**
 * Get a presigned URL for downloading a file
 */
export async function getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  if (!BUCKET_NAME) {
    throw new Error('S3 bucket not configured. Set AWS_S3_BUCKET environment variable.')
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  return await getSignedUrl(s3Client, command, { expiresIn })
}

/**
 * Get a presigned URL for uploading a file directly from browser
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  if (!BUCKET_NAME) {
    throw new Error('S3 bucket not configured. Set AWS_S3_BUCKET environment variable.')
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  })

  return await getSignedUrl(s3Client, command, { expiresIn })
}

/**
 * Delete a file from S3
 */
export async function deleteFromS3(key: string): Promise<void> {
  if (!BUCKET_NAME) {
    throw new Error('S3 bucket not configured. Set AWS_S3_BUCKET environment variable.')
  }

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  await s3Client.send(command)
}

/**
 * Generate S3 key for job files
 */
export function generateJobFileKey(
  jobId: string,
  category: 'photo' | 'document' | 'invoice' | 'attachment',
  fileName: string
): string {
  const timestamp = Date.now()
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `jobs/${jobId}/${category}/${timestamp}_${sanitizedFileName}`
}

/**
 * Generate S3 key for thumbnails
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

export { s3Client, BUCKET_NAME, MAX_FILE_SIZE }