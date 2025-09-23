import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { query } from '@/lib/db'
import { deleteFromS3 } from '@/lib/aws-s3'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authResult = await verifyToken(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const fileId = params.id
    const userId = authResult.user.id

    // Get file details
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

    // Delete from S3
    try {
      await deleteFromS3(file.s3Key)

      // Delete thumbnail if exists
      if (file.thumbnailS3Key) {
        await deleteFromS3(file.thumbnailS3Key)
      }
    } catch (s3Error) {
      console.error('S3 deletion error:', s3Error)
      // Continue with database deletion even if S3 fails
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