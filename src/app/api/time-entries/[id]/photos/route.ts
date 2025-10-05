import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { query } from '@/lib/db'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { mkdir } from 'fs/promises'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: entryId } = await context.params
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await query(
      `SELECT 
        tep.*,
        u."firstName",
        u."lastName"
       FROM "TimeEntryPhoto" tep
       LEFT JOIN "User" u ON tep."uploadedBy" = u.id
       WHERE tep."timeEntryId" = $1
       ORDER BY tep."uploadedAt" DESC`,
      [entryId]
    )

    const photos = result.rows.map(row => ({
      id: row.id,
      photoUrl: row.photoUrl,
      thumbnailUrl: row.thumbnailUrl,
      caption: row.caption,
      uploadedBy: `${row.firstName} ${row.lastName}`,
      uploadedAt: row.uploadedAt,
      fileSize: row.fileSize,
      mimeType: row.mimeType,
    }))

    return NextResponse.json({ photos })
  } catch (error) {
    console.error('Get photos error:', error)
    return NextResponse.json(
      { error: 'Failed to get photos' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: entryId } = await context.params
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userPayload = verifyToken(token)
    const userId = userPayload.id

    const formData = await request.formData()
    const file = formData.get('photo') as File
    const caption = formData.get('caption') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No photo provided' },
        { status: 400 }
      )
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      )
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const timestamp = Date.now()
    const filename = `${entryId}_${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'time-entries')
    
    await mkdir(uploadDir, { recursive: true })
    
    const filepath = join(uploadDir, filename)
    await writeFile(filepath, buffer)
    
    const photoUrl = `/uploads/time-entries/${filename}`

    const result = await query(
      `INSERT INTO "TimeEntryPhoto" 
       ("timeEntryId", "uploadedBy", "photoUrl", caption, "fileSize", "mimeType", "uploadedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [entryId, userId, photoUrl, caption || null, file.size, file.type]
    )

    return NextResponse.json({
      message: 'Photo uploaded successfully',
      photo: {
        id: result.rows[0].id,
        photoUrl: result.rows[0].photoUrl,
        caption: result.rows[0].caption,
        uploadedAt: result.rows[0].uploadedAt,
      },
    })
  } catch (error) {
    console.error('Upload photo error:', error)
    return NextResponse.json(
      { error: 'Failed to upload photo' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: entryId } = await context.params
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userPayload = verifyToken(token)
    const userId = userPayload.id

    const searchParams = request.nextUrl.searchParams
    const photoId = searchParams.get('photoId')

    if (!photoId) {
      return NextResponse.json(
        { error: 'Photo ID is required' },
        { status: 400 }
      )
    }

    const result = await query(
      `DELETE FROM "TimeEntryPhoto"
       WHERE id = $1 AND "uploadedBy" = $2
       RETURNING *`,
      [photoId, userId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Photo not found or unauthorized' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Photo deleted successfully',
    })
  } catch (error) {
    console.error('Delete photo error:', error)
    return NextResponse.json(
      { error: 'Failed to delete photo' },
      { status: 500 }
    )
  }
}
