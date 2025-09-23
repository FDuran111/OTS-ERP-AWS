import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { query } from '@/lib/db'
import storage from '@/lib/storage-adapter'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { uploadId: string } }
) {
  try {
    // Verify authentication
    const authResult = await verifyToken(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const fileId = params.uploadId
    const userId = authResult.user.id

    // Get file details from our new FileUpload table
    const fileResult = await query(
      `SELECT * FROM "FileUpload" WHERE id = $1`,
      [fileId]
    )

    if (fileResult.length === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const file = fileResult[0]

    // Check permission (user must be the uploader or an admin)
    if (file.userId !== userId && authResult.user.role !== 'OWNER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete from storage (local in dev, S3 in production)
    try {
      await storage.delete(file.s3Key)

      // Delete thumbnail if exists
      if (file.thumbnailS3Key) {
        await storage.delete(file.thumbnailS3Key)
      }
    } catch (storageError) {
      console.error('Storage deletion error:', storageError)
      // Continue with database deletion even if storage fails
    }

    // Soft delete from database (mark as deleted)
    await query(
      `UPDATE "FileUpload" SET "deletedAt" = CURRENT_TIMESTAMP WHERE id = $1`,
      [fileId]
    )

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    )
  }
}