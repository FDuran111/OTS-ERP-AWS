import { NextRequest, NextResponse } from 'next/server'
import { quickbooksSync } from '@/lib/quickbooks-sync'

// POST - Run full QuickBooks sync
export async function POST() {
  try {
    const result = await quickbooksSync.runFullSync()

    const totalCreated = result.customers.toQB.created + result.customers.fromQB.created + result.items.fromQB.created
    const totalUpdated = result.customers.toQB.updated + result.customers.fromQB.updated + result.items.fromQB.updated
    const totalErrors = result.customers.toQB.errors + result.customers.fromQB.errors + result.items.fromQB.errors

    const allErrorDetails = [
      ...result.customers.toQB.errorDetails,
      ...result.customers.fromQB.errorDetails,
      ...result.items.fromQB.errorDetails
    ]

    return NextResponse.json({
      success: totalErrors === 0,
      summary: {
        totalCreated,
        totalUpdated,
        totalErrors,
        hasErrors: totalErrors > 0
      },
      details: result,
      errorDetails: allErrorDetails
    })

  } catch (error) {
    console.error('Error running full QuickBooks sync:', error)
    return NextResponse.json(
      { error: 'Failed to run full sync' },
      { status: 500 }
    )
  }
}

// GET - Get overall sync status
export async function GET() {
  try {
    const { query } = await import('@/lib/db')
    
    // Get overall sync statistics
    const overallStats = await query(`
      SELECT 
        -- Customer stats
        (SELECT COUNT(*) FROM "Customer") as "totalCustomers",
        (SELECT COUNT(*) FROM "QuickBooksMapping" WHERE "localEntityType" = 'CUSTOMER') as "mappedCustomers",
        (SELECT COUNT(*) FROM "QuickBooksMapping" WHERE "localEntityType" = 'CUSTOMER' AND "syncStatus" = 'SYNCED') as "syncedCustomers",
        (SELECT COUNT(*) FROM "QuickBooksMapping" WHERE "localEntityType" = 'CUSTOMER' AND "syncStatus" = 'ERROR') as "errorCustomers",
        
        -- Item stats
        (SELECT COUNT(*) FROM "QuickBooksItem") as "totalItems",
        (SELECT COUNT(*) FROM "QuickBooksItem" WHERE "active" = true) as "activeItems",
        
        -- Recent sync activity
        (SELECT COUNT(*) FROM "QuickBooksSyncLog" WHERE "status" = 'SUCCESS' AND "createdAt" > NOW() - INTERVAL '24 hours') as "recentSuccessfulSyncs",
        (SELECT COUNT(*) FROM "QuickBooksSyncLog" WHERE "status" = 'ERROR' AND "createdAt" > NOW() - INTERVAL '24 hours') as "recentErrorSyncs",
        
        -- Last sync times
        (SELECT MAX("lastSyncAt") FROM "QuickBooksConnection") as "lastConnectionSync",
        (SELECT MAX("lastSyncAt") FROM "QuickBooksMapping") as "lastEntitySync"
    `)

    const stats = overallStats.rows[0]

    // Get sync configuration
    const syncConfig = await query(`
      SELECT 
        "entityType",
        "syncEnabled",
        "syncDirection",
        "syncFrequency",
        "lastSyncAt",
        "autoCreateInQB"
      FROM "QuickBooksSyncConfig"
      ORDER BY "entityType"
    `)

    // Get recent errors
    const recentErrors = await query(`
      SELECT 
        "entityType",
        "operationType",
        "errorMessage",
        "createdAt"
      FROM "QuickBooksSyncLog"
      WHERE "status" = 'ERROR' 
        AND "createdAt" > NOW() - INTERVAL '24 hours'
      ORDER BY "createdAt" DESC
      LIMIT 5
    `)

    return NextResponse.json({
      success: true,
      overview: {
        customers: {
          total: parseInt(stats.totalCustomers),
          mapped: parseInt(stats.mappedCustomers),
          synced: parseInt(stats.syncedCustomers),
          errors: parseInt(stats.errorCustomers),
          syncPercentage: stats.totalCustomers > 0 ? 
            Math.round((stats.syncedCustomers / stats.totalCustomers) * 100) : 0
        },
        items: {
          total: parseInt(stats.totalItems),
          active: parseInt(stats.activeItems)
        },
        activity: {
          recentSuccessfulSyncs: parseInt(stats.recentSuccessfulSyncs),
          recentErrorSyncs: parseInt(stats.recentErrorSyncs),
          lastConnectionSync: stats.lastConnectionSync,
          lastEntitySync: stats.lastEntitySync
        }
      },
      syncConfiguration: syncConfig.rows,
      recentErrors: recentErrors.rows
    })

  } catch (error) {
    console.error('Error getting sync status:', error)
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    )
  }
}