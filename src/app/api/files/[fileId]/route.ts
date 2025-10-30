import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getStorage } from '@/lib/storage'
import { bucketFor, keyFor } from '@/lib/file-keys'
import { urlFor } from '@/lib/file-urls'
import { verifyToken } from '@/lib/auth'

// DELETE file and its database record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    // Check authentication
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    try {
      verifyToken(token)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const fileId = resolvedParams.fileId

    // Get file details from database
    const fileResult = await query(
      'SELECT * FROM "FileAttachment" WHERE id = $1',
      [fileId]
    )

    if (fileResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    const file = fileResult.rows[0]

    // Delete from storage using the adapter
    const storage = getStorage()
    
    try {
      // Determine bucket and key from file path
      let bucket = 'uploads'
      let key = file.filePath
      
      // Handle different path formats
      if (file.filePath) {
        // If it's a full URL, extract the key
        if (file.filePath.startsWith('http')) {
          if (file.fileUrl && file.fileUrl.includes('supabase')) {
            const url = new URL(file.fileUrl)
            const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/)
            if (pathMatch) {
              bucket = pathMatch[1]
              key = pathMatch[2]
            }
          }
        } else {
          // Use path as-is for key
          // Check if it starts with a bucket prefix
          if (file.filePath.startsWith('uploads/')) {
            bucket = 'uploads'
            key = file.filePath.replace('uploads/', '')
          } else if (file.filePath.startsWith('thumbnails/')) {
            bucket = 'thumbnails'
            key = file.filePath.replace('thumbnails/', '')
          } else {
            // Assume it's just the key
            key = file.filePath
          }
        }
        
        // Delete main file
        await storage.delete({ bucket, key })
      }
      
      // Delete thumbnail if exists
      if (file.thumbnailPath || file.thumbnailUrl) {
        try {
          let thumbBucket = 'thumbnails'
          let thumbKey = file.thumbnailPath
          
          if (file.thumbnailUrl && file.thumbnailUrl.includes('supabase')) {
            const url = new URL(file.thumbnailUrl)
            const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/)
            if (pathMatch) {
              thumbBucket = pathMatch[1]
              thumbKey = pathMatch[2]
            }
          } else if (file.thumbnailPath) {
            if (file.thumbnailPath.startsWith('thumbnails/')) {
              thumbKey = file.thumbnailPath.replace('thumbnails/', '')
            } else {
              thumbKey = file.thumbnailPath
            }
          }
          
          if (thumbKey) {
            await storage.delete({ bucket: thumbBucket, key: thumbKey })
          }
        } catch (error) {
          console.warn('Failed to delete thumbnail:', error)
        }
      }
    } catch (storageError) {
      console.error('Storage deletion error:', storageError)
      // Continue with database deletion even if storage deletion fails
    }

    // Delete related records first (due to foreign key constraints)
    await query('DELETE FROM "JobAttachment" WHERE "fileId" = $1', [fileId])
    await query('DELETE FROM "CustomerAttachment" WHERE "fileId" = $1', [fileId])
    await query('DELETE FROM "MaterialAttachment" WHERE "fileId" = $1', [fileId])

    // Delete the file record from database
    await query('DELETE FROM "FileAttachment" WHERE id = $1', [fileId])

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    })

  } catch (error: any) {
    console.error('File deletion error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete file',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

// GET file details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const resolvedParams = await params
    const fileId = resolvedParams.fileId

    const result = await query(
      `SELECT 
        fa.*,
        CASE 
          WHEN ja.id IS NOT NULL THEN 'job'
          WHEN ca.id IS NOT NULL THEN 'customer'
          WHEN ma.id IS NOT NULL THEN 'material'
          ELSE 'unattached'
        END as "attachmentType",
        COALESCE(ja."jobId", ca."customerId", ma."materialId") as "parentId"
      FROM "FileAttachment" fa
      LEFT JOIN "JobAttachment" ja ON fa.id = ja."fileId"
      LEFT JOIN "CustomerAttachment" ca ON fa.id = ca."fileId"
      LEFT JOIN "MaterialAttachment" ma ON fa.id = ma."fileId"
      WHERE fa.id = $1`,
      [fileId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    const file = result.rows[0]

    // Generate fresh presigned URLs if file has S3 keys
    const storage = getStorage()
    let fileUrl = file.fileUrl
    let thumbnailUrl = file.thumbnailUrl

    try {
      if (file.filePath && !file.fileUrl) {
        // Generate fresh URL from S3 key
        fileUrl = await storage.getSignedUrl({
          bucket: 'uploads',
          key: file.filePath,
          expiresInSeconds: 86400,
          operation: 'get'
        })
      }

      if (file.thumbnailPath && !file.thumbnailUrl) {
        // Generate fresh thumbnail URL from S3 key
        thumbnailUrl = await storage.getSignedUrl({
          bucket: 'thumbnails',
          key: file.thumbnailPath,
          expiresInSeconds: 86400,
          operation: 'get'
        })
      }
    } catch (urlError) {
      console.error('Error generating URLs:', urlError)
      // Continue with existing URLs if generation fails
    }

    return NextResponse.json({
      success: true,
      file: {
        ...file,
        fileUrl,
        thumbnailUrl
      }
    })

  } catch (error: any) {
    console.error('Error fetching file:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch file',
        details: error.message 
      },
      { status: 500 }
    )
  }
}