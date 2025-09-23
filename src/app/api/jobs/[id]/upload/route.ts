import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { query } from '@/lib/db'
import {
  generateJobFileKey,
  validateFileSize,
  validateFileType,
  getExtensionFromMimeType,
} from '@/lib/aws-s3'
import storage from '@/lib/storage-adapter'
import sharp from 'sharp'

export const runtime = 'nodejs'
export const maxDuration = 30 // 30 seconds for upload

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authResult = await verifyToken(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const jobId = params.id
    const userId = authResult.user.id

    // Check if job exists and user has access
    const jobResult = await query(
      `SELECT id, "jobNumber", description FROM "Job" WHERE id = $1`,
      [jobId]
    )

    if (jobResult.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const category = formData.get('category') as string || 'photos'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!validateFileType(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: images, PDF, Word, Excel, text files' },
        { status: 400 }
      )
    }

    // Validate file size
    if (!validateFileSize(file.size)) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${process.env.AWS_S3_MAX_FILE_SIZE || '10MB'}` },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate S3 key
    const s3Key = generateJobFileKey(jobId, category as any, file.name)
    let thumbnailS3Key = null

    // Process image for thumbnail if it's an image
    if (file.type.startsWith('image/')) {
      try {
        // Generate thumbnail (300x300)
        const thumbnail = await sharp(buffer)
          .resize(300, 300, {
            fit: 'cover',
            withoutEnlargement: true
          })
          .jpeg({ quality: 80 })
          .toBuffer()

        // Upload thumbnail
        thumbnailS3Key = s3Key.replace(/^jobs/, 'jobs').replace(/\/([^\/]+)$/, '/thumbnails/thumb_$1')
        await storage.upload({
          key: thumbnailS3Key,
          body: thumbnail,
          contentType: 'image/jpeg',
          metadata: {
            originalFile: file.name,
            jobId: jobId,
            userId: userId,
          },
        })
      } catch (error) {
        console.error('Error generating thumbnail:', error)
        // Continue without thumbnail
      }
    }

    // Upload original file (to local storage in dev, S3 in production)
    const uploadResult = await storage.upload({
      key: s3Key,
      body: buffer,
      contentType: file.type,
      metadata: {
        originalName: file.name,
        jobId: jobId,
        userId: userId,
        uploadedAt: new Date().toISOString(),
      },
    })

    // Save file record to database
    const insertResult = await query(
      `INSERT INTO "FileUpload"
       (id, "jobId", "userId", "fileName", "fileType", "fileSize", "s3Key", "s3Bucket", "thumbnailS3Key", category, metadata)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        jobId,
        userId,
        file.name,
        file.type,
        file.size,
        s3Key,
        process.env.NODE_ENV === 'production' ? process.env.AWS_S3_BUCKET : 'local',
        thumbnailS3Key,
        category,
        JSON.stringify({
          originalName: file.name,
          extension: getExtensionFromMimeType(file.type),
          uploadedAt: new Date().toISOString(),
        }),
      ]
    )

    return NextResponse.json({
      success: true,
      file: {
        id: insertResult[0].id,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        s3Key: s3Key,
        thumbnailS3Key: thumbnailS3Key,
        category: category,
        url: uploadResult.url,
        uploadedAt: insertResult[0].uploadedAt,
      },
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}

// GET endpoint to list files for a job
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authResult = await verifyToken(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const jobId = params.id

    // Get all files for this job
    const files = await query(
      `SELECT
        f.*,
        u.name as uploadedByName
       FROM "FileUpload" f
       LEFT JOIN "User" u ON f."userId" = u.id
       WHERE f."jobId" = $1 AND f."deletedAt" IS NULL
       ORDER BY f."uploadedAt" DESC`,
      [jobId]
    )

    // Generate URLs for each file
    const filesWithUrls = await Promise.all(
      files.map(async (file) => ({
        ...file,
        url: await storage.getUrl(file.s3Key),
        thumbnailUrl: file.thumbnailS3Key
          ? await storage.getUrl(file.thumbnailS3Key)
          : null,
      }))
    )

    return NextResponse.json({
      success: true,
      files: filesWithUrls,
    })
  } catch (error) {
    console.error('Error fetching files:', error)
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    )
  }
}