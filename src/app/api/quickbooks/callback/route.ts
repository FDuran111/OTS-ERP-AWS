import { NextRequest, NextResponse } from 'next/server'
import { quickbooksClient } from '@/lib/quickbooks-client'
import { query } from '@/lib/db'

// GET - Handle QuickBooks OAuth callback
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const realmId = searchParams.get('realmId')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('QuickBooks OAuth error:', error)
      return NextResponse.redirect(
        new URL(`/settings/integrations?error=${encodeURIComponent(error)}`, request.url)
      )
    }

    // Validate required parameters
    if (!code || !realmId) {
      return NextResponse.redirect(
        new URL('/settings/integrations?error=Missing authorization code or realm ID', request.url)
      )
    }

    // Parse and validate state parameter
    let stateData: any = {}
    try {
      if (state) {
        stateData = JSON.parse(state)
      }
    } catch (e) {
      console.warn('Invalid state parameter:', state)
    }

    // Exchange code for tokens
    const tokens = await quickbooksClient.exchangeCodeForTokens(code, realmId)

    // Save connection to database
    const connectionId = await quickbooksClient.saveConnection(tokens)

    // Test the connection by fetching company info
    const connection = await quickbooksClient.getActiveConnection()
    if (connection) {
      const companyInfo = await quickbooksClient.getCompanyInfo(connection)
      
      // Update connection with company details
      await query(`
        UPDATE "QuickBooksConnection" 
        SET 
          "connectionMetadata" = $1,
          "lastSyncAt" = NOW(),
          "updatedAt" = NOW()
        WHERE id = $2
      `, [
        JSON.stringify({
          companyName: companyInfo?.QueryResponse?.CompanyInfo?.[0]?.CompanyName,
          legalName: companyInfo?.QueryResponse?.CompanyInfo?.[0]?.LegalName,
          country: companyInfo?.QueryResponse?.CompanyInfo?.[0]?.Country,
          fiscalYearStartMonth: companyInfo?.QueryResponse?.CompanyInfo?.[0]?.FiscalYearStartMonth
        }),
        connectionId
      ])

      // Log successful connection
      await query(`
        INSERT INTO "QuickBooksSyncLog" (
          "operationType", "entityType", "direction", "status", 
          "responseData", "completedAt"
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `, [
        'CONNECT',
        'CONNECTION',
        'FROM_QB',
        'SUCCESS',
        JSON.stringify(companyInfo)
      ])
    }

    // Redirect to success page
    const returnUrl = stateData.returnUrl || '/settings/integrations'
    return NextResponse.redirect(
      new URL(`${returnUrl}?success=QuickBooks connected successfully`, request.url)
    )

  } catch (error) {
    console.error('Error handling QuickBooks callback:', error)
    
    // Log the error
    try {
      await query(`
        INSERT INTO "QuickBooksSyncLog" (
          "operationType", "entityType", "direction", "status", 
          "errorMessage", "completedAt"
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `, [
        'CONNECT',
        'CONNECTION',
        'FROM_QB',
        'ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      ])
    } catch (logError) {
      console.error('Failed to log QuickBooks error:', logError)
    }

    return NextResponse.redirect(
      new URL(`/settings/integrations?error=${encodeURIComponent(
        error instanceof Error ? error.message : 'QuickBooks connection failed'
      )}`, request.url)
    )
  }
}