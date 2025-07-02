import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get all table names
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)

    // Check for specific tables we're trying to use
    const requiredTables = [
      'User',
      'TimeEntry', 
      'EmployeeSchedule',
      'PurchaseOrder',
      'ServiceCall',
      'POApprovalHistory',
      'POReceiving',
      'POApprovalRule'
    ]

    const existingTables = tablesResult.rows.map(row => row.table_name)
    const missingTables = requiredTables.filter(table => !existingTables.includes(table))

    return NextResponse.json({
      allTables: existingTables,
      requiredTables,
      missingTables,
      tableCount: existingTables.length
    })

  } catch (error) {
    console.error('Error checking tables:', error)
    return NextResponse.json(
      { error: 'Failed to check tables', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}