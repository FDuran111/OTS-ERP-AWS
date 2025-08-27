import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getStorage } from '@/lib/storage'
import crypto from 'crypto'
import path from 'path'

// Helper function to check if file is an image
function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

// Helper function to generate unique filename
function generateFileName(originalName: string): string {
  const ext = path.extname(originalName)
  const hash = crypto.randomBytes(16).toString('hex')
  const timestamp = Date.now()
  return `${timestamp}-${hash}${ext}`
}

// POST handle file upload with pluggable storage
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const category = (formData.get('category') as string) || 'documents'
    const description = formData.get('description') as string
    const tags = formData.get('tags') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate category
    const validCategories = ['jobs', 'customers', 'materials', 'documents']
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category. Must be one of: ' + validCategories.join(', ') },
        { status: 400 }
      )
    }

    // Get storage driver
    const storage = getStorage()
    
    // Generate file info
    const fileName = generateFileName(file.name)
    const key = `${category}/${fileName}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Upload main file
    const uploadResult = await storage.upload({
      bucket: 'uploads',
      key: key,
      contentType: file.type,
      body: buffer
    })
    
    // Generate thumbnail for images
    let thumbnailPath = null
    let thumbnailUrl = null
    if (isImage(file.type) && category !== 'documents') {
      const thumbnailKey = `${category}/thumb_${fileName}`
      try {
        await storage.upload({
          bucket: 'thumbnails',
          key: thumbnailKey,
          contentType: file.type,
          body: buffer // In production, this should be resized
        })
        thumbnailPath = thumbnailKey
        thumbnailUrl = await storage.getSignedUrl({
          bucket: 'thumbnails',
          key: thumbnailKey,
          expiresInSeconds: 86400, // 24 hours
          operation: 'get'
        })
      } catch (error) {
        console.warn('Thumbnail generation failed:', error)
      }
    }
    
    // Get signed URL for the main file
    const fileUrl = await storage.getSignedUrl({
      bucket: uploadResult.bucket,
      key: uploadResult.key,
      expiresInSeconds: 86400, // 24 hours
      operation: 'get'
    })
    
    // Prepare metadata
    const metadata = {
      bucket: uploadResult.bucket,
      category,
      uploadedAt: new Date().toISOString()
    }

    // Parse tags if provided
    let parsedTags: string[] = []
    if (tags) {
      try {
        parsedTags = JSON.parse(tags)
      } catch {
        // If JSON parsing fails, split by comma
        parsedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      }
    }

    // Save file metadata to database
    const result = await query(`
      INSERT INTO "FileAttachment" (
        "fileName", "originalName", "mimeType", "fileSize", "fileExtension",
        "filePath", "fileUrl", "isImage", "imageWidth", "imageHeight",
        "thumbnailPath", "thumbnailUrl", "description", "tags", "metadata"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      fileName,
      file.name,
      file.type,
      file.size,
      path.extname(file.name),
      uploadResult.key,
      fileUrl,
      isImage(file.type),
      null, // imageWidth - would need image processing library
      null, // imageHeight - would need image processing library
      thumbnailPath,
      thumbnailUrl,
      description || null,
      parsedTags,
      JSON.stringify(metadata)
    ])

    const fileRecord = result.rows[0]

    return NextResponse.json({
      success: true,
      file: {
        id: fileRecord.id,
        fileName: fileRecord.fileName,
        originalName: fileRecord.originalName,
        mimeType: fileRecord.mimeType,
        fileSize: fileRecord.fileSize,
        fileExtension: fileRecord.fileExtension,
        filePath: fileRecord.filePath,
        fileUrl: fileRecord.fileUrl,
        isImage: fileRecord.isImage,
        imageWidth: fileRecord.imageWidth,
        imageHeight: fileRecord.imageHeight,
        thumbnailPath: fileRecord.thumbnailPath,
        thumbnailUrl: fileRecord.thumbnailUrl,
        description: fileRecord.description,
        tags: fileRecord.tags || [],
        metadata: fileRecord.metadata,
        uploadedAt: fileRecord.uploadedAt,
        createdAt: fileRecord.createdAt
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error('File upload error:', error)
    
    // Handle specific error types
    if (error.message?.includes('File too large')) {
      return NextResponse.json(
        { error: 'File size exceeds maximum allowed' },
        { status: 413 }
      )
    }
    
    if (error.message?.includes('Invalid file type')) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 415 }
      )
    }

    if (error.message?.includes('SUPABASE_SERVICE_ROLE_KEY') || error.message?.includes('storage configuration')) {
      return NextResponse.json(
        { error: 'Storage configuration missing. Please check environment variables.' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to upload file', details: error.message },
      { status: 500 }
    )
  }
}