import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// POST endpoint to fix file URLs in the database
export async function POST(request: NextRequest) {
  try {
    // Update FileAttachment table URLs
    const result = await query(`
      UPDATE "FileAttachment"
      SET 
        "fileUrl" = '/api' || "fileUrl",
        "thumbnailUrl" = CASE 
          WHEN "thumbnailUrl" IS NOT NULL THEN '/api' || "thumbnailUrl"
          ELSE NULL
        END,
        "updatedAt" = NOW()
      WHERE "fileUrl" LIKE '/uploads/%'
        AND "fileUrl" NOT LIKE '/api/uploads/%'
      RETURNING id, "fileUrl", "thumbnailUrl"
    `)

    return NextResponse.json({
      success: true,
      message: `Updated ${result.rowCount} file URLs`,
      updatedRecords: result.rows
    })
  } catch (error: any) {
    console.error('Error updating file URLs:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update file URLs',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check current file URLs
export async function GET() {
  try {
    // Get statistics about file URLs
    const stats = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE "fileUrl" LIKE '/uploads/%') as old_urls,
        COUNT(*) FILTER (WHERE "fileUrl" LIKE '/api/uploads/%') as new_urls,
        COUNT(*) as total_files
      FROM "FileAttachment"
      WHERE active = true
    `)

    // Get a sample of files with old URLs
    const oldUrlFiles = await query(`
      SELECT 
        id,
        "fileName",
        "fileUrl",
        "thumbnailUrl",
        "uploadedAt"
      FROM "FileAttachment"
      WHERE "fileUrl" LIKE '/uploads/%'
        AND active = true
      LIMIT 10
    `)

    return NextResponse.json({
      success: true,
      stats: stats.rows[0],
      sampleOldUrls: oldUrlFiles.rows
    })
  } catch (error: any) {
    console.error('Error checking file URLs:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check file URLs',
        details: error.message 
      },
      { status: 500 }
    )
  }
}