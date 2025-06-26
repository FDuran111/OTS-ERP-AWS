import { NextRequest, NextResponse } from 'next/server'
import { quickbooksClient } from '@/lib/quickbooks-client'
import { query } from '@/lib/db'

// GET - Get QuickBooks connection status
export async function GET() {
  try {
    const connection = await quickbooksClient.getActiveConnection()

    if (!connection) {
      return NextResponse.json({
        connected: false,
        connection: null
      })
    }

    // Get connection statistics
    const statsResult = await query(`
      SELECT 
        qbc."companyId",
        qbc."realmId",
        qbc."isActive",
        qbc."lastSyncAt",
        qbc."tokenExpiresAt",
        qbc."connectionMetadata",
        -- Sync statistics
        COUNT(DISTINCT qbm.id) as "totalMappings",
        COUNT(DISTINCT CASE WHEN qbm."syncStatus" = 'SYNCED' THEN qbm.id END) as "syncedMappings",
        COUNT(DISTINCT CASE WHEN qbm."syncStatus" = 'ERROR' THEN qbm.id END) as "errorMappings",
        COUNT(DISTINCT CASE WHEN qbm."syncStatus" = 'PENDING' THEN qbm.id END) as "pendingMappings",
        -- Recent sync activity
        COUNT(DISTINCT CASE WHEN qbsl."status" = 'SUCCESS' AND qbsl."createdAt" > NOW() - INTERVAL '24 hours' THEN qbsl.id END) as "recentSuccessfulSyncs",
        COUNT(DISTINCT CASE WHEN qbsl."status" = 'ERROR' AND qbsl."createdAt" > NOW() - INTERVAL '24 hours' THEN qbsl.id END) as "recentErrorSyncs"
      FROM "QuickBooksConnection" qbc
      LEFT JOIN "QuickBooksMapping" qbm ON qbc."companyId" = qbc."companyId"
      LEFT JOIN "QuickBooksSyncLog" qbsl ON qbc."companyId" = qbc."companyId"
      WHERE qbc.id = $1
      GROUP BY qbc.id, qbc."companyId", qbc."realmId", qbc."isActive", qbc."lastSyncAt", qbc."tokenExpiresAt", qbc."connectionMetadata"
    `, [connection.id])

    const stats = statsResult.rows[0] || {}

    // Determine connection health
    let healthStatus = 'HEALTHY'
    if (connection.tokenExpiresAt <= new Date()) {
      healthStatus = 'TOKEN_EXPIRED'
    } else if (connection.tokenExpiresAt <= new Date(Date.now() + 24 * 60 * 60 * 1000)) {
      healthStatus = 'TOKEN_EXPIRING'
    } else if (connection.lastSyncAt && connection.lastSyncAt < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
      healthStatus = 'SYNC_STALE'
    }

    return NextResponse.json({
      connected: true,
      connection: {
        id: connection.id,
        companyId: connection.companyId,
        realmId: connection.realmId,
        isActive: connection.isActive,
        lastSyncAt: connection.lastSyncAt,
        tokenExpiresAt: connection.tokenExpiresAt,
        metadata: stats.connectionMetadata ? JSON.parse(stats.connectionMetadata) : {},
        healthStatus,
        stats: {
          totalMappings: parseInt(stats.totalMappings || 0),
          syncedMappings: parseInt(stats.syncedMappings || 0),
          errorMappings: parseInt(stats.errorMappings || 0),
          pendingMappings: parseInt(stats.pendingMappings || 0),
          recentSuccessfulSyncs: parseInt(stats.recentSuccessfulSyncs || 0),
          recentErrorSyncs: parseInt(stats.recentErrorSyncs || 0)
        }
      }
    })

  } catch (error) {
    console.error('Error getting QuickBooks connection:', error)
    return NextResponse.json(
      { error: 'Failed to get connection status' },
      { status: 500 }
    )
  }
}

// DELETE - Disconnect QuickBooks
export async function DELETE() {
  try {
    const connection = await quickbooksClient.getActiveConnection()

    if (!connection) {
      return NextResponse.json(
        { error: 'No active QuickBooks connection found' },
        { status: 404 }
      )
    }

    // Disconnect
    await quickbooksClient.disconnect(connection.id)

    // Log disconnection
    await query(`
      INSERT INTO "QuickBooksSyncLog" (
        "operationType", "entityType", "direction", "status", 
        "completedAt"
      ) VALUES ($1, $2, $3, $4, NOW())
    `, [
      'DISCONNECT',
      'CONNECTION',
      'LOCAL',
      'SUCCESS'
    ])

    return NextResponse.json({
      success: true,
      message: 'QuickBooks connection disconnected successfully'
    })

  } catch (error) {
    console.error('Error disconnecting QuickBooks:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect QuickBooks' },
      { status: 500 }
    )
  }
}

// POST - Test QuickBooks connection
export async function POST() {
  try {
    const connection = await quickbooksClient.getActiveConnection()

    if (!connection) {
      return NextResponse.json(
        { error: 'No active QuickBooks connection found' },
        { status: 404 }
      )
    }

    // Test connection
    const isValid = await quickbooksClient.testConnection(connection)

    if (!isValid) {
      return NextResponse.json(
        { error: 'QuickBooks connection test failed' },
        { status: 400 }
      )
    }

    // Update last sync time
    await query(`
      UPDATE "QuickBooksConnection" 
      SET "lastSyncAt" = NOW(), "updatedAt" = NOW()
      WHERE id = $1
    `, [connection.id])

    // Log successful test
    await query(`
      INSERT INTO "QuickBooksSyncLog" (
        "operationType", "entityType", "direction", "status", 
        "completedAt"
      ) VALUES ($1, $2, $3, $4, NOW())
    `, [
      'TEST',
      'CONNECTION',
      'FROM_QB',
      'SUCCESS'
    ])

    return NextResponse.json({
      success: true,
      message: 'QuickBooks connection is valid'
    })

  } catch (error) {
    console.error('Error testing QuickBooks connection:', error)
    
    // Log test failure
    try {
      await query(`
        INSERT INTO "QuickBooksSyncLog" (
          "operationType", "entityType", "direction", "status", 
          "errorMessage", "completedAt"
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `, [
        'TEST',
        'CONNECTION',
        'FROM_QB',
        'ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      ])
    } catch (logError) {
      console.error('Failed to log test error:', logError)
    }

    return NextResponse.json(
      { error: 'QuickBooks connection test failed' },
      { status: 500 }
    )
  }
}