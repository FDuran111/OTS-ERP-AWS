import { NextRequest, NextResponse } from 'next/server'
import { quickbooksSync } from '@/lib/quickbooks-sync'

// POST - Sync customers to QuickBooks
export async function POST(request: NextRequest) {
  try {
    const { direction = 'toQB' } = await request.json()

    let result
    if (direction === 'toQB') {
      result = await quickbooksSync.syncCustomersToQuickBooks()
    } else if (direction === 'fromQB') {
      result = await quickbooksSync.syncCustomersFromQuickBooks()
    } else if (direction === 'bidirectional') {
      const toQBResult = await quickbooksSync.syncCustomersToQuickBooks()
      const fromQBResult = await quickbooksSync.syncCustomersFromQuickBooks()
      
      result = {
        success: toQBResult.success && fromQBResult.success,
        toQB: toQBResult,
        fromQB: fromQBResult,
        created: toQBResult.created + fromQBResult.created,
        updated: toQBResult.updated + fromQBResult.updated,
        errors: toQBResult.errors + fromQBResult.errors,
        errorDetails: [...toQBResult.errorDetails, ...fromQBResult.errorDetails]
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid direction. Use "toQB", "fromQB", or "bidirectional"' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      direction,
      result
    })

  } catch (error) {
    console.error('Error syncing customers:', error)
    return NextResponse.json(
      { error: 'Failed to sync customers' },
      { status: 500 }
    )
  }
}

// GET - Get customer sync status
export async function GET() {
  try {
    const { query } = await import('@/lib/db')
    
    // Get sync statistics
    const syncStats = await query(`
      SELECT 
        COUNT(DISTINCT c.id) as "totalCustomers",
        COUNT(DISTINCT qbm.id) as "mappedCustomers",
        COUNT(DISTINCT CASE WHEN qbm."syncStatus" = 'SYNCED' THEN qbm.id END) as "syncedCustomers",
        COUNT(DISTINCT CASE WHEN qbm."syncStatus" = 'ERROR' THEN qbm.id END) as "errorCustomers",
        COUNT(DISTINCT CASE WHEN qbm."syncStatus" = 'PENDING' THEN qbm.id END) as "pendingCustomers",
        MAX(qbm."lastSyncAt") as "lastSyncAt"
      FROM "Customer" c
      LEFT JOIN "QuickBooksMapping" qbm ON c.id = qbm."localEntityId" 
        AND qbm."localEntityType" = 'CUSTOMER'
    `)

    const stats = syncStats.rows[0]

    // Get recent sync activity
    const recentSyncs = await query(`
      SELECT 
        "operationType",
        "direction", 
        "status",
        "errorMessage",
        "completedAt"
      FROM "QuickBooksSyncLog"
      WHERE "entityType" = 'CUSTOMER'
      ORDER BY "completedAt" DESC
      LIMIT 10
    `)

    return NextResponse.json({
      success: true,
      stats: {
        totalCustomers: parseInt(stats.totalCustomers),
        mappedCustomers: parseInt(stats.mappedCustomers),
        syncedCustomers: parseInt(stats.syncedCustomers),
        errorCustomers: parseInt(stats.errorCustomers),
        pendingCustomers: parseInt(stats.pendingCustomers),
        lastSyncAt: stats.lastSyncAt,
        syncPercentage: stats.totalCustomers > 0 ? 
          Math.round((stats.syncedCustomers / stats.totalCustomers) * 100) : 0
      },
      recentActivity: recentSyncs.rows
    })

  } catch (error) {
    console.error('Error getting customer sync status:', error)
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    )
  }
}