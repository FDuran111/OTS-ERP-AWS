import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { fileStorage } from '@/lib/file-storage'
import { supabaseStorage } from '@/lib/supabase-storage'
import { auth } from '@/lib/auth'
import path from 'path'

// DELETE file and its database record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    // Check authentication
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
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

    // Delete from storage (both local and Supabase)
    const isProduction = process.env.NODE_ENV === 'production'
    const hasSupabaseKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    
    try {
      if (isProduction && hasSupabaseKey) {
        // Delete from Supabase Storage
        // Extract the path from the URL
        let filePath = file.filePath
        
        // If we have a fileUrl (Supabase URL), extract the path from it
        if (file.fileUrl && file.fileUrl.includes('supabase')) {
          const url = new URL(file.fileUrl)
          const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/)
          if (pathMatch) {
            filePath = pathMatch[1]
          }
        } else if (file.filePath && !file.filePath.startsWith('http')) {
          // Use filePath as is if it's not a URL
          filePath = file.filePath
        }
        
        // Delete main file
        if (filePath) {
          await supabaseStorage.deleteFile(filePath)
        }
        
        // Delete thumbnail if exists
        if (file.thumbnailUrl || file.thumbnailPath) {
          let thumbnailPath = file.thumbnailPath
          
          // Try to extract from thumbnailUrl first
          if (file.thumbnailUrl && file.thumbnailUrl.includes('supabase')) {
            const url = new URL(file.thumbnailUrl)
            const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/)
            if (pathMatch) {
              thumbnailPath = pathMatch[1]
            }
          } else if (file.thumbnailPath && !file.thumbnailPath.startsWith('http')) {
            // Use thumbnailPath as is if it's not a URL
            thumbnailPath = file.thumbnailPath
          }
          
          try {
            if (thumbnailPath) {
              await supabaseStorage.deleteThumbnail(thumbnailPath)
            }
          } catch (error) {
            console.warn('Failed to delete thumbnail:', error)
          }
        }
      } else {
        // Delete from local storage
        if (file.filePath) {
          await fileStorage.deleteFile(file.filePath)
        }
        
        // Delete thumbnail if exists
        if (file.thumbnailPath) {
          try {
            await fileStorage.deleteFile(file.thumbnailPath)
          } catch (error) {
            console.warn('Failed to delete thumbnail:', error)
          }
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

    return NextResponse.json({
      success: true,
      file: result.rows[0]
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