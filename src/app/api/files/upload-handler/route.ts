import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Helper to check if file is an image
function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

// Helper to get file extension
function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? `.${parts[parts.length - 1]}` : ''
}

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

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Debug logging (remove in production)
    console.log('Supabase URL exists:', !!supabaseUrl)
    console.log('Service key exists:', !!supabaseServiceKey)
    console.log('Anon key exists:', !!supabaseAnonKey)

    if (!supabaseUrl) {
      return NextResponse.json(
        { error: 'Storage configuration missing: Supabase URL not configured' },
        { status: 500 }
      )
    }

    // Use service role key if available, otherwise fall back to anon key
    const supabaseKey = supabaseServiceKey || supabaseAnonKey
    
    if (!supabaseKey) {
      return NextResponse.json(
        { error: 'Storage configuration missing: No Supabase keys configured' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Generate unique filename
    const timestamp = Date.now()
    const randomId = crypto.randomBytes(8).toString('hex')
    const extension = getFileExtension(file.name)
    const fileName = `${timestamp}-${randomId}${extension}`
    
    // Build storage path with category
    const storagePath = `${category}/${fileName}`
    
    // Convert File to Buffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Upload file to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file', details: uploadError.message },
        { status: 500 }
      )
    }
    
    // Get public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('uploads')
      .getPublicUrl(storagePath)
    
    const fileUrl = publicUrl

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
        "filePath", "fileUrl", "isImage", "description", "tags", "metadata"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      fileName,
      file.name,
      file.type,
      file.size,
      extension,
      storagePath, // Storage path in Supabase
      fileUrl,
      isImage(file.type),
      description || null,
      parsedTags,
      JSON.stringify({
        category,
        storageProvider: 'supabase'
      })
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
    
    return NextResponse.json(
      { error: 'Failed to upload file', details: error.message },
      { status: 500 }
    )
  }
}