import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { supabaseStorage, SupabaseStorageService } from '@/lib/supabase-storage'

// POST handle file upload with Supabase storage
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

    // Upload file to Supabase storage
    let uploadResult
    if (SupabaseStorageService.isImage(file.type) && category !== 'documents') {
      // Upload as image with thumbnail generation
      uploadResult = await supabaseStorage.uploadImage(
        file,
        category as 'jobs' | 'customers' | 'materials',
        true // generate thumbnail
      )
    } else {
      // Upload as regular file (including documents category)
      uploadResult = await supabaseStorage.uploadFile(
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
      'isImage' in uploadResult ? uploadResult.isImage : SupabaseStorageService.isImage(file.type),
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

    if (error.message?.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      return NextResponse.json(
        { error: 'Storage configuration missing. Please set SUPABASE_SERVICE_ROLE_KEY in environment variables.' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to upload file', details: error.message },
      { status: 500 }
    )
  }
}