import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { fileStorage, FileStorageService } from '@/lib/file-storage'
import { supabaseStorage, SupabaseStorageService } from '@/lib/supabase-storage'

// POST handle file upload with storage
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

    // Upload file to storage
    // Use Supabase Storage in production (if available), local storage in development
    const isProduction = process.env.NODE_ENV === 'production'
    const hasSupabaseKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    
    // Debug logging
    console.log('Upload environment:', {
      NODE_ENV: process.env.NODE_ENV,
      isProduction,
      hasSupabaseKey,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET'
    })
    
    // In production, always try to use Supabase Storage
    const storageService = isProduction ? supabaseStorage : fileStorage
    
    let uploadResult
    if (FileStorageService.isImage(file.type) && category !== 'documents') {
      // Upload as image with thumbnail generation
      uploadResult = await storageService.uploadImage(
        file,
        category as 'jobs' | 'customers' | 'materials',
        true // generate thumbnail
      )
    } else {
      // Upload as regular file (including documents category)
      uploadResult = await storageService.uploadFile(
        file,
        category as 'jobs' | 'customers' | 'materials' | 'documents'
      )
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
      uploadResult.fileName,
      uploadResult.originalName,
      uploadResult.mimeType,
      uploadResult.fileSize,
      uploadResult.fileExtension,
      uploadResult.filePath,
      uploadResult.fileUrl,
      'isImage' in uploadResult ? uploadResult.isImage : FileStorageService.isImage(file.type),
      'imageWidth' in uploadResult ? uploadResult.imageWidth : null,
      'imageHeight' in uploadResult ? uploadResult.imageHeight : null,
      'thumbnailPath' in uploadResult ? uploadResult.thumbnailPath : null,
      'thumbnailUrl' in uploadResult ? uploadResult.thumbnailUrl : null,
      description || null,
      parsedTags,
      uploadResult.metadata ? JSON.stringify(uploadResult.metadata) : null
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
    if (error.message.includes('File size exceeds')) {
      return NextResponse.json(
        { error: error.message },
        { status: 413 }
      )
    }
    
    if (error.message.includes('File type') && error.message.includes('not allowed')) {
      return NextResponse.json(
        { error: error.message },
        { status: 415 }
      )
    }
    
    // Handle Supabase configuration error
    if (error.message.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      return NextResponse.json(
        { 
          error: 'File storage is not configured. Please set SUPABASE_SERVICE_ROLE_KEY environment variable in production.',
          details: error.message 
        },
        { status: 500 }
      )
    }
    
    // Handle permission errors
    if (error.message.includes('EACCES') || error.message.includes('permission denied')) {
      return NextResponse.json(
        { 
          error: 'File storage permission error. The server cannot write to the local filesystem in production. Please configure Supabase Storage.',
          details: error.message 
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to upload file: ' + error.message },
      { status: 500 }
    )
  }
}

// GET upload configuration and limits
export async function GET() {
  return NextResponse.json({
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
    allowedMimeTypes: [
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
    ],
    categories: ['jobs', 'customers', 'materials', 'documents'],
    attachmentTypes: {
      jobs: [
        'BEFORE_PHOTO',
        'AFTER_PHOTO', 
        'PROGRESS_PHOTO',
        'PROBLEM_PHOTO',
        'SOLUTION_PHOTO',
        'PERMIT',
        'INVOICE',
        'CONTRACT',
        'SPEC_SHEET',
        'DIAGRAM',
        'RECEIPT'
      ],
      customers: [
        'PROFILE_PHOTO',
        'ID_DOCUMENT',
        'CONTRACT',
        'AGREEMENT',
        'SIGNATURE'
      ],
      materials: [
        'PRODUCT_PHOTO',
        'SPEC_SHEET',
        'WARRANTY',
        'MANUAL',
        'CERTIFICATE',
        'INVOICE'
      ]
    },
    jobCategories: [
      'ELECTRICAL',
      'PERMITS',
      'SAFETY',
      'DOCUMENTATION',
      'BILLING'
    ],
    jobPhases: [
      'PLANNING',
      'INSTALLATION',
      'TESTING',
      'COMPLETION',
      'FOLLOW_UP'
    ]
  })
}