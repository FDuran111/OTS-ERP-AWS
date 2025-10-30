import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { storage } from '@/lib/storage-adapter'
import sharp from 'sharp'

// GET all photos for a time entry
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const result = await query(
      `SELECT * FROM "TimeEntryPhoto"
       WHERE "timeEntryId" = $1
       ORDER BY "uploadedAt" DESC`,
      [resolvedParams.id]
    )

    // Generate fresh presigned URLs for each photo
    const photosWithUrls = await Promise.all(
      result.rows.map(async (photo) => {
        try {
          // Generate fresh URLs (valid for 24 hours)
          const photoUrl = await storage.getUrl(photo.photoUrl)
          const thumbnailUrl = photo.thumbnailUrl ? await storage.getUrl(photo.thumbnailUrl) : null

          return {
            ...photo,
            photoUrl,
            thumbnailUrl
          }
        } catch (error) {
          console.error('Error generating URL for photo:', photo.id, error)
          // Return photo with original keys if URL generation fails
          return photo
        }
      })
    )

    return NextResponse.json(photosWithUrls)
  } catch (error) {
    console.error('Error fetching photos:', error)
    return NextResponse.json(
      { error: 'Failed to fetch photos' },
      { status: 500 }
    )
  }
}

// POST upload a photo to a time entry
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const caption = formData.get('caption') as string | null
    const uploadedBy = formData.get('uploadedBy') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!uploadedBy) {
      return NextResponse.json(
        { error: 'uploadedBy is required' },
        { status: 400 }
      )
    }

    // Validate file type (images only)
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (10MB max before compression)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Generate unique filenames
    const timestamp = Date.now()
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const photoKey = `time-entry-photos/${resolvedParams.id}/${timestamp}-${sanitizedFilename}`
    const thumbnailKey = `time-entry-photos/${resolvedParams.id}/thumb-${timestamp}-${sanitizedFilename}`

    // Compress main image (max 1920px width, 85% quality)
    const compressedImage = await sharp(buffer)
      .resize(1920, null, {
        withoutEnlargement: true,
        fit: 'inside'
      })
      .jpeg({ quality: 85 })
      .toBuffer()

    // Create thumbnail (300px width)
    const thumbnail = await sharp(buffer)
      .resize(300, null, {
        withoutEnlargement: true,
        fit: 'inside'
      })
      .jpeg({ quality: 80 })
      .toBuffer()

    // Upload both images
    const [photoResult, thumbnailResult] = await Promise.all([
      storage.upload({
        key: photoKey,
        body: compressedImage,
        contentType: 'image/jpeg'
      }),
      storage.upload({
        key: thumbnailKey,
        body: thumbnail,
        contentType: 'image/jpeg'
      })
    ])

    // Insert photo record into database (store S3 keys, not presigned URLs)
    const photoRecord = await query(
      `INSERT INTO "TimeEntryPhoto" (
        id, "timeEntryId", "uploadedBy", "photoUrl", "thumbnailUrl",
        "caption", "fileSize", "mimeType", "uploadedAt"
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW()
      ) RETURNING *`,
      [
        resolvedParams.id,
        uploadedBy,
        photoResult.key, // Store S3 key, not URL
        thumbnailResult.key, // Store S3 key, not URL
        caption || null,
        compressedImage.length,
        'image/jpeg'
      ]
    )

    // Generate fresh presigned URLs for response
    const photo = photoRecord.rows[0]
    const photoUrlForResponse = await storage.getUrl(photo.photoUrl)
    const thumbnailUrlForResponse = await storage.getUrl(photo.thumbnailUrl)

    return NextResponse.json({
      success: true,
      photo: {
        ...photo,
        photoUrl: photoUrlForResponse,
        thumbnailUrl: thumbnailUrlForResponse
      }
    })

  } catch (error: any) {
    console.error('Error uploading photo:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload photo' },
      { status: 500 }
    )
  }
}

// DELETE a photo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const { searchParams } = new URL(request.url)
    const photoId = searchParams.get('photoId')

    if (!photoId) {
      return NextResponse.json(
        { error: 'photoId is required' },
        { status: 400 }
      )
    }

    // Get photo info before deleting
    const photoResult = await query(
      `SELECT * FROM "TimeEntryPhoto" WHERE id = $1 AND "timeEntryId" = $2`,
      [photoId, resolvedParams.id]
    )

    if (photoResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      )
    }

    const photo = photoResult.rows[0]

    // Delete from storage
    try {
      await Promise.all([
        storage.delete(photo.photoUrl),
        photo.thumbnailUrl ? storage.delete(photo.thumbnailUrl) : Promise.resolve()
      ])
    } catch (storageError) {
      console.error('Error deleting from storage:', storageError)
      // Continue with database deletion even if storage fails
    }

    // Delete from database
    await query(
      `DELETE FROM "TimeEntryPhoto" WHERE id = $1`,
      [photoId]
    )

    return NextResponse.json({
      success: true,
      message: 'Photo deleted successfully'
    })

  } catch (error: any) {
    console.error('Error deleting photo:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete photo' },
      { status: 500 }
    )
  }
}
