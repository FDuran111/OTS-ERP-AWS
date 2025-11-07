import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { query } from '@/lib/db'
import {
  generateJobFileKey,
  validateFileSize,
  validateFileType,
  getExtensionFromMimeType,
} from '@/lib/supabase-storage'
import storage from '@/lib/storage-adapter'
import sharp from 'sharp'

export const runtime = 'nodejs'
export const maxDuration = 30 // 30 seconds for upload

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let authUser
    try {
      authUser = verifyToken(token)
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { id: jobId } = await params
    const userId = authUser.id

    // Check if job exists and user has access
    const jobResult = await query(
      `SELECT id, "jobNumber", description FROM "Job" WHERE id = $1`,
      [jobId]
    )

    if (jobResult.rows.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const category = formData.get('category') as string || 'photo'

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
        { error: `File too large. Maximum size: ${process.env.MAX_FILE_SIZE ? Math.round(parseInt(process.env.MAX_FILE_SIZE) / 1024 / 1024) + 'MB' : '50MB'}` },
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

    // Save file record to database (note: all column names are lowercase in the database)
    const insertResult = await query(
      `INSERT INTO "FileUpload"
       (id, jobid, userid, filename, filetype, filesize, s3key, s3bucket, thumbnails3key, category, metadata)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        jobId,
        userId,
        file.name,
        file.type,
        file.size,
        s3Key,
        process.env.STORAGE_BUCKET || 'uploads',
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
        id: insertResult.rows[0].id,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        s3Key: s3Key,
        thumbnailS3Key: thumbnailS3Key,
        category: category,
        url: uploadResult.url,
        uploadedAt: insertResult.rows[0].uploadedat,
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let authUser
    try {
      authUser = verifyToken(token)
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { id: jobId } = await params

    // Get all files for this job (note: all column names are lowercase in the database)
    const files = await query(
      `SELECT
        f.*,
        u.name as uploadedByName
       FROM "FileUpload" f
       LEFT JOIN "User" u ON f.userid = u.id
       WHERE f.jobid = $1 AND f.deletedat IS NULL
       ORDER BY f.uploadedat DESC`,
      [jobId]
    )

    // Get all time entry photos for this job
    const timeEntryPhotos = await query(
      `SELECT
        p.id,
        p."photoUrl" as s3key,
        p."thumbnailUrl" as thumbnails3key,
        p."caption" as filename,
        p."fileSize" as filesize,
        p."mimeType" as filetype,
        p."uploadedAt" as uploadedat,
        u.name as uploadedByName,
        'time_entry_photo' as category,
        te.id as "timeEntryId",
        te.date as "timeEntryDate"
       FROM "TimeEntryPhoto" p
       LEFT JOIN "TimeEntry" te ON p."timeEntryId" = te.id
       LEFT JOIN "User" u ON p."uploadedBy" = u.id
       WHERE te."jobId" = $1
       ORDER BY p."uploadedAt" DESC`,
      [jobId]
    )

    // Generate URLs for job files
    const filesWithUrls = await Promise.all(
      files.rows.map(async (file: any) => ({
        ...file,
        url: await storage.getUrl(file.s3key),
        thumbnailUrl: file.thumbnails3key
          ? await storage.getUrl(file.thumbnails3key)
          : null,
      }))
    )

    // Generate URLs for time entry photos
    const photosWithUrls = await Promise.all(
      timeEntryPhotos.rows.map(async (photo: any) => ({
        ...photo,
        url: await storage.getUrl(photo.s3key),
        thumbnailUrl: photo.thumbnails3key
          ? await storage.getUrl(photo.thumbnails3key)
          : null,
        // Add flag to distinguish from regular files
        isTimeEntryPhoto: true,
      }))
    )

    // Combine both arrays
    const allFiles = [...filesWithUrls, ...photosWithUrls].sort((a, b) => {
      return new Date(b.uploadedat).getTime() - new Date(a.uploadedat).getTime()
    })

    return NextResponse.json({
      success: true,
      files: allFiles,
      jobFileCount: filesWithUrls.length,
      timeEntryPhotoCount: photosWithUrls.length,
    })
  } catch (error) {
    console.error('Error fetching files:', error)
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    )
  }
}