import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const uploadSchema = z.object({
  fileName: z.string().min(1),
  originalName: z.string().min(1),
  mimeType: z.string().min(1),
  fileSize: z.number().positive(),
  fileExtension: z.string().min(1),
  filePath: z.string().min(1),
  fileUrl: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
})

// POST upload and store file metadata
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = uploadSchema.parse(body)

    // Determine if file is an image
    const isImage = data.mimeType.startsWith('image/')
    
    // Extract image dimensions from metadata if available
    let imageWidth: number | null = null
    let imageHeight: number | null = null
    
    if (isImage && data.metadata) {
      imageWidth = data.metadata.width || null
      imageHeight = data.metadata.height || null
    }

    const result = await query(`
      INSERT INTO "FileAttachment" (
        "fileName", "originalName", "mimeType", "fileSize", "fileExtension",
        "filePath", "fileUrl", "isImage", "imageWidth", "imageHeight",
        "description", "tags", "metadata"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      data.fileName,
      data.originalName,
      data.mimeType,
      data.fileSize,
      data.fileExtension,
      data.filePath,
      data.fileUrl || null,
      isImage,
      imageWidth,
      imageHeight,
      data.description || null,
      data.tags || [],
      data.metadata ? JSON.stringify(data.metadata) : null
    ])

    const file = result.rows[0]

    return NextResponse.json({
      id: file.id,
      fileName: file.fileName,
      originalName: file.originalName,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      fileExtension: file.fileExtension,
      filePath: file.filePath,
      fileUrl: file.fileUrl,
      isImage: file.isImage,
      imageWidth: file.imageWidth,
      imageHeight: file.imageHeight,
      description: file.description,
      tags: file.tags || [],
      metadata: file.metadata,
      active: file.active,
      uploadedAt: file.uploadedAt,
      createdAt: file.createdAt
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}

// GET file metadata by ID
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      )
    }

    let whereClause = 'WHERE id = $1'
    if (!includeInactive) {
      whereClause += ' AND active = true'
    }

    const result = await query(`
      SELECT * FROM "FileAttachment"
      ${whereClause}
    `, [fileId])

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    const file = result.rows[0]

    return NextResponse.json({
      id: file.id,
      fileName: file.fileName,
      originalName: file.originalName,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      fileExtension: file.fileExtension,
      filePath: file.filePath,
      fileUrl: file.fileUrl,
      isImage: file.isImage,
      imageWidth: file.imageWidth,
      imageHeight: file.imageHeight,
      thumbnailPath: file.thumbnailPath,
      thumbnailUrl: file.thumbnailUrl,
      description: file.description,
      tags: file.tags || [],
      metadata: file.metadata,
      active: file.active,
      uploadedAt: file.uploadedAt,
      updatedAt: file.updatedAt,
      createdAt: file.createdAt
    })

  } catch (error) {
    console.error('Error fetching file:', error)
    return NextResponse.json(
      { error: 'Failed to fetch file' },
      { status: 500 }
    )
  }
}