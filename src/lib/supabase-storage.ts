import { createClient } from '@supabase/supabase-js'
import { FileUploadResult, ImageProcessingResult } from './file-storage'
import path from 'path'
import crypto from 'crypto'

// Initialize Supabase client for storage operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xudcmdliqyarbfdqufbq.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Storage bucket names
const BUCKET_NAME = 'uploads'
const THUMBNAIL_BUCKET = 'thumbnails'

export class SupabaseStorageService {
  private bucketName: string

  constructor(bucketName: string = BUCKET_NAME) {
    this.bucketName = bucketName
  }

  /**
   * Initialize storage buckets if they don't exist
   */
  async initialize(): Promise<void> {
    try {
      // Check if main bucket exists
      const { data: buckets } = await supabase.storage.listBuckets()
      const bucketExists = buckets?.some(b => b.name === this.bucketName)
      
      if (!bucketExists) {
        // Create public bucket for uploads
        await supabase.storage.createBucket(this.bucketName, {
          public: true,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'text/csv'
          ]
        })
      }

      // Check if thumbnail bucket exists
      const thumbnailExists = buckets?.some(b => b.name === THUMBNAIL_BUCKET)
      if (!thumbnailExists) {
        await supabase.storage.createBucket(THUMBNAIL_BUCKET, {
          public: true,
          fileSizeLimit: 5242880, // 5MB
          allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        })
      }
    } catch (error) {
      console.error('Failed to initialize storage buckets:', error)
    }
  }

  /**
   * Generate unique filename
   */
  generateFileName(originalName: string): string {
    const ext = path.extname(originalName)
    const hash = crypto.randomBytes(16).toString('hex')
    const timestamp = Date.now()
    return `${timestamp}-${hash}${ext}`
  }

  /**
   * Upload file to Supabase Storage
   */
  async uploadFile(
    file: File,
    category: 'jobs' | 'customers' | 'materials' | 'documents' = 'documents'
  ): Promise<FileUploadResult> {
    await this.initialize()

    const fileName = this.generateFileName(file.name)
    const filePath = `${category}/${fileName}`
    
    // Convert file to ArrayBuffer then to Uint8Array for Supabase
    const arrayBuffer = await file.arrayBuffer()
    const fileData = new Uint8Array(arrayBuffer)

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .upload(filePath, fileData, {
        contentType: file.type,
        upsert: false
      })

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`)
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(this.bucketName)
      .getPublicUrl(filePath)

    return {
      fileName,
      originalName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      fileExtension: path.extname(file.name),
      filePath: data.path,
      fileUrl: publicUrl,
      metadata: {
        bucket: this.bucketName,
        category,
        uploadedAt: new Date().toISOString()
      }
    }
  }

  /**
   * Upload image with thumbnail generation
   */
  async uploadImage(
    file: File,
    category: 'jobs' | 'customers' | 'materials' = 'jobs',
    generateThumbnail: boolean = true
  ): Promise<ImageProcessingResult> {
    // Upload the main image
    const uploadResult = await this.uploadFile(file, category)
    
    let thumbnailUrl: string | undefined
    let thumbnailPath: string | undefined

    if (generateThumbnail) {
      try {
        // For MVP, we'll use the same image as thumbnail
        // In production, you'd want to use an image processing service
        const thumbnailFileName = `thumb_${uploadResult.fileName}`
        const thumbPath = `${category}/${thumbnailFileName}`
        
        // Upload same file as thumbnail (in production, resize it first)
        const arrayBuffer = await file.arrayBuffer()
        const fileData = new Uint8Array(arrayBuffer)
        
        const { data, error } = await supabase.storage
          .from(THUMBNAIL_BUCKET)
          .upload(thumbPath, fileData, {
            contentType: file.type,
            upsert: false
          })

        if (!error && data) {
          const { data: { publicUrl } } = supabase.storage
            .from(THUMBNAIL_BUCKET)
            .getPublicUrl(thumbPath)
          
          thumbnailUrl = publicUrl
          thumbnailPath = data.path
        }
      } catch (error) {
        console.warn('Failed to generate thumbnail:', error)
      }
    }

    return {
      ...uploadResult,
      isImage: true,
      thumbnailUrl,
      thumbnailPath
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([filePath])
      
      if (error) {
        console.error('Failed to delete file:', error)
      }
    } catch (error) {
      console.error('Failed to delete file:', error)
    }
  }

  /**
   * Get signed URL for temporary access (useful for private files)
   */
  async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string | null> {
    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .createSignedUrl(filePath, expiresIn)
    
    if (error) {
      console.error('Failed to create signed URL:', error)
      return null
    }
    
    return data.signedUrl
  }

  /**
   * Check if file type is an image
   */
  static isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/')
  }
}

// Export singleton instance
export const supabaseStorage = new SupabaseStorageService()