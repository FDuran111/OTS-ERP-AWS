import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'
import crypto from 'crypto'

export interface FileUploadResult {
  fileName: string
  originalName: string
  mimeType: string
  fileSize: number
  fileExtension: string
  filePath: string
  fileUrl: string
  metadata?: Record<string, any>
}

export interface ImageProcessingResult extends FileUploadResult {
  isImage: true
  imageWidth?: number
  imageHeight?: number
  thumbnailPath?: string
  thumbnailUrl?: string
}

// Configuration
const UPLOAD_DIR = process.env.UPLOAD_DIR || './public/uploads'
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB default
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed'
]

export class FileStorageService {
  private uploadDir: string

  constructor(uploadDir: string = UPLOAD_DIR) {
    this.uploadDir = uploadDir
  }

  /**
   * Initialize storage directories
   */
  async initialize(): Promise<void> {
    const dirs = [
      this.uploadDir,
      path.join(this.uploadDir, 'jobs'),
      path.join(this.uploadDir, 'customers'),
      path.join(this.uploadDir, 'materials'),
      path.join(this.uploadDir, 'documents'),
      path.join(this.uploadDir, 'thumbnails')
    ]

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true })
      }
    }
  }

  /**
   * Validate file upload
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`
      }
    }

    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} is not allowed`
      }
    }

    return { valid: true }
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
   * Get upload directory based on category
   */
  getUploadPath(category: 'jobs' | 'customers' | 'materials' | 'documents' = 'documents'): string {
    return path.join(this.uploadDir, category)
  }

  /**
   * Upload file to storage
   */
  async uploadFile(
    file: File,
    category: 'jobs' | 'customers' | 'materials' | 'documents' = 'documents'
  ): Promise<FileUploadResult> {
    // Validate file
    const validation = this.validateFile(file)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    // Initialize directories
    await this.initialize()

    // Generate filename and paths
    const fileName = this.generateFileName(file.name)
    const uploadPath = this.getUploadPath(category)
    const filePath = path.join(uploadPath, fileName)
    const fileUrl = `/api/uploads/${category}/${fileName}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Write file to disk
    await writeFile(filePath, buffer)

    // Extract file metadata
    const metadata: Record<string, any> = {
      uploadedBy: 'system', // This should come from auth context
      uploadCategory: category,
      uploadDate: new Date().toISOString()
    }

    // Extract image metadata if it's an image
    if (file.type.startsWith('image/')) {
      try {
        const imageInfo = await this.getImageInfo(buffer)
        metadata.width = imageInfo.width
        metadata.height = imageInfo.height
      } catch (error) {
        console.warn('Failed to extract image metadata:', error)
      }
    }

    return {
      fileName,
      originalName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      fileExtension: path.extname(file.name),
      filePath,
      fileUrl,
      metadata
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
    // Validate that it's an image
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image')
    }

    // Upload the main file
    const uploadResult = await this.uploadFile(file, category)

    // Get image dimensions
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    let imageWidth: number | undefined
    let imageHeight: number | undefined
    let thumbnailPath: string | undefined
    let thumbnailUrl: string | undefined

    try {
      const imageInfo = await this.getImageInfo(buffer)
      imageWidth = imageInfo.width
      imageHeight = imageInfo.height

      // Generate thumbnail if requested
      if (generateThumbnail) {
        const thumbnailResult = await this.generateThumbnail(buffer, uploadResult.fileName)
        thumbnailPath = thumbnailResult.path
        thumbnailUrl = thumbnailResult.url
      }
    } catch (error) {
      console.warn('Failed to process image:', error)
    }

    return {
      ...uploadResult,
      isImage: true,
      imageWidth,
      imageHeight,
      thumbnailPath,
      thumbnailUrl
    }
  }

  /**
   * Get basic image information
   */
  private async getImageInfo(buffer: Buffer): Promise<{ width: number; height: number }> {
    // This is a simple implementation that reads basic image headers
    // For production, consider using a library like 'sharp' or 'image-size'
    
    if (buffer.length < 10) {
      throw new Error('Invalid image buffer')
    }

    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      // PNG format
      if (buffer.length >= 24) {
        const width = buffer.readUInt32BE(16)
        const height = buffer.readUInt32BE(20)
        return { width, height }
      }
    }

    // JPEG signature: FF D8
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
      // JPEG format - more complex parsing would be needed for exact dimensions
      // For now, return a default size or use a library
      return { width: 800, height: 600 } // placeholder
    }

    // Default fallback
    return { width: 800, height: 600 }
  }

  /**
   * Generate thumbnail for an image
   */
  private async generateThumbnail(
    buffer: Buffer,
    originalFileName: string
  ): Promise<{ path: string; url: string }> {
    // For this simple implementation, we'll just copy the original file as thumbnail
    // In production, use a library like 'sharp' to actually resize the image
    
    const thumbnailDir = path.join(this.uploadDir, 'thumbnails')
    const thumbnailFileName = `thumb_${originalFileName}`
    const thumbnailPath = path.join(thumbnailDir, thumbnailFileName)
    const thumbnailUrl = `/api/uploads/thumbnails/${thumbnailFileName}`

    // Ensure thumbnail directory exists
    if (!existsSync(thumbnailDir)) {
      await mkdir(thumbnailDir, { recursive: true })
    }

    // For now, just copy the original (in production, resize it)
    await writeFile(thumbnailPath, buffer)

    return {
      path: thumbnailPath,
      url: thumbnailUrl
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      const { unlink } = await import('fs/promises')
      await unlink(filePath)
    } catch (error) {
      console.error('Failed to delete file:', error)
      // Don't throw error for file deletion failures
    }
  }

  /**
   * Get file size in bytes
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Check if file type is an image
   */
  static isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/')
  }

  /**
   * Get file category from MIME type
   */
  static getCategoryFromMimeType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'images'
    if (mimeType.startsWith('video/')) return 'videos'
    if (mimeType.includes('pdf')) return 'documents'
    if (mimeType.includes('word') || mimeType.includes('doc')) return 'documents'
    if (mimeType.includes('excel') || mimeType.includes('sheet')) return 'spreadsheets'
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return 'archives'
    return 'other'
  }
}

// Export singleton instance
export const fileStorage = new FileStorageService()