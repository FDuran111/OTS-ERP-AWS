import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

// Mapping of file extensions to MIME types
const mimeTypes: { [key: string]: string } = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.zip': 'application/zip',
  '.rar': 'application/x-rar-compressed',
  '.7z': 'application/x-7z-compressed',
}

// GET handler to serve uploaded files
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params
    const filePath = resolvedParams.path.join('/')
    
    // Construct the full path to the file
    const fullPath = path.join(process.cwd(), 'public', 'uploads', filePath)
    
    // Security check: ensure the path doesn't go outside uploads directory
    const normalizedPath = path.normalize(fullPath)
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    
    if (!normalizedPath.startsWith(uploadsDir)) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 403 }
      )
    }
    
    // Check if file exists
    if (!existsSync(fullPath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }
    
    // Read the file
    const fileBuffer = await readFile(fullPath)
    
    // Determine MIME type
    const ext = path.extname(fullPath).toLowerCase()
    const mimeType = mimeTypes[ext] || 'application/octet-stream'
    
    // Create response with appropriate headers
    const response = new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
    
    // Add content-disposition header for downloads (non-images)
    if (!mimeType.startsWith('image/')) {
      const fileName = path.basename(fullPath)
      response.headers.set(
        'Content-Disposition',
        `attachment; filename="${fileName}"`
      )
    }
    
    return response
    
  } catch (error) {
    console.error('Error serving file:', error)
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    )
  }
}