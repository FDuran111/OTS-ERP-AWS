import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { query } from '@/lib/db'
import { deleteFromS3 } from '@/lib/aws-s3'

export async function DELETE(
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

    const { id: fileId } = await params
    const userId = authUser.id

    // Get file details
    const fileResult = await query(
      `SELECT * FROM "FileUpload" WHERE id = $1`,
      [fileId]
    )

    if (fileResult.rows.length === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const file = fileResult.rows[0]

    // Check permission (user must be the uploader or an admin)
    if (file.userid !== userId && authUser.role !== 'OWNER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete from S3
    try {
      await deleteFromS3(file.s3key)

      // Delete thumbnail if exists
      if (file.thumbnails3key) {
        await deleteFromS3(file.thumbnails3key)
      }
    } catch (s3Error) {
      console.error('S3 deletion error:', s3Error)
      // Continue with database deletion even if S3 fails
    }

    // Soft delete from database (mark as deleted)
    await query(
      `UPDATE "FileUpload" SET deletedat = CURRENT_TIMESTAMP WHERE id = $1`,
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