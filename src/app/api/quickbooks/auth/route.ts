import { NextRequest, NextResponse } from 'next/server'
import { quickbooksClient } from '@/lib/quickbooks-client'

// GET - Initiate QuickBooks OAuth flow
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const returnUrl = searchParams.get('returnUrl') || '/settings/integrations'

    // Generate state parameter to prevent CSRF attacks
    const state = JSON.stringify({
      returnUrl,
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(2)
    })

    // Get authorization URL
    const authUrl = quickbooksClient.getAuthorizationUrl(state)

    return NextResponse.json({
      success: true,
      authUrl
    })

  } catch (error) {
    console.error('Error initiating QuickBooks OAuth:', error)
    return NextResponse.json(
      { error: 'Failed to initiate QuickBooks authorization' },
      { status: 500 }
    )
  }
}