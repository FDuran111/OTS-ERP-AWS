import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET file storage statistics
export async function GET(request: NextRequest) {
  try {
    // Get storage statistics using our database function
    const statsResult = await query('SELECT * FROM get_file_storage_stats()')
    const stats = statsResult.rows[0]

    // Get top file types
    const fileTypesResult = await query(`
      SELECT 
        "mimeType",
        COUNT(*) as "fileCount",
        SUM("fileSize") as "totalSize",
        ROUND(AVG("fileSize")::numeric, 2) as "avgSize"
      FROM "FileAttachment"
      WHERE active = true
      GROUP BY "mimeType"
      ORDER BY "totalSize" DESC
      LIMIT 10
    `)

    // Get attachment distribution
    const distributionResult = await query(`
      SELECT 
        'Job' as "entityType",
        COUNT(*) as "attachmentCount"
      FROM "JobAttachment"
      UNION ALL
      SELECT 
        'Customer' as "entityType",
        COUNT(*) as "attachmentCount"
      FROM "CustomerAttachment"
      UNION ALL
      SELECT 
        'Material' as "entityType",
        COUNT(*) as "attachmentCount"
      FROM "MaterialAttachment"
    `)

    // Get recent upload activity (last 30 days)
    const activityResult = await query(`
      SELECT 
        DATE_TRUNC('day', "uploadedAt") as "date",
        COUNT(*) as "uploads",
        SUM("fileSize") as "totalSize"
      FROM "FileAttachment"
      WHERE "uploadedAt" >= CURRENT_DATE - INTERVAL '30 days'
        AND active = true
      GROUP BY DATE_TRUNC('day', "uploadedAt")
      ORDER BY "date" DESC
    `)

    // Get largest files
    const largestFilesResult = await query(`
      SELECT 
        id,
        "fileName",
        "originalName",
        "mimeType",
        "fileSize",
        "uploadedAt"
      FROM "FileAttachment"
      WHERE active = true
      ORDER BY "fileSize" DESC
      LIMIT 10
    `)

    return NextResponse.json({
      summary: {
        totalFiles: parseInt(stats.total_files || 0),
        totalSizeBytes: parseInt(stats.total_size_bytes || 0),
        totalSizeMB: parseFloat(stats.total_size_mb || 0),
        totalImages: parseInt(stats.total_images || 0),
        imageSizeBytes: parseInt(stats.image_size_bytes || 0),
        jobAttachments: parseInt(stats.job_attachments || 0),
        customerAttachments: parseInt(stats.customer_attachments || 0),
        materialAttachments: parseInt(stats.material_attachments || 0),
        recentUploads: parseInt(stats.recent_uploads || 0)
      },
      
      fileTypes: fileTypesResult.rows.map(row => ({
        mimeType: row.mimeType,
        fileCount: parseInt(row.fileCount),
        totalSize: parseInt(row.totalSize),
        avgSize: parseFloat(row.avgSize)
      })),
      
      distribution: distributionResult.rows.map(row => ({
        entityType: row.entityType,
        attachmentCount: parseInt(row.attachmentCount)
      })),
      
      recentActivity: activityResult.rows.map(row => ({
        date: row.date,
        uploads: parseInt(row.uploads),
        totalSize: parseInt(row.totalSize)
      })),
      
      largestFiles: largestFilesResult.rows.map(row => ({
        id: row.id,
        fileName: row.fileName,
        originalName: row.originalName,
        mimeType: row.mimeType,
        fileSize: parseInt(row.fileSize),
        uploadedAt: row.uploadedAt
      }))
    })

  } catch (error) {
    console.error('Error fetching storage statistics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch storage statistics' },
      { status: 500 }
    )
  }
}

// POST cleanup orphaned files
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'cleanup') {
      // Run the cleanup function
      const result = await query('SELECT * FROM cleanup_orphaned_files()')
      const cleanup = result.rows[0]

      return NextResponse.json({
        deletedFiles: parseInt(cleanup.deleted_files || 0),
        freedSpaceMB: parseFloat(cleanup.freed_space_mb || 0),
        message: 'Cleanup completed successfully'
      })
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "cleanup"' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error during cleanup:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup files' },
      { status: 500 }
    )
  }
}