import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/lib/storage-adapter'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json(
        { error: 'File key is required' },
        { status: 400 }
      )
    }

    // Get URL using storage adapter (will use local path in dev, signed URL in prod)
    const url = await storage.getUrl(key)

    return NextResponse.json({
      success: true,
      url
    })

  } catch (error: any) {
    console.error('Error getting file URL:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get file URL' },
      { status: 500 }
    )
  }
}
