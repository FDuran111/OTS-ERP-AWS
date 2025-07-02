import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get column information for PurchaseOrder table
    const columnsResult = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'PurchaseOrder'
      ORDER BY ordinal_position
    `)

    return NextResponse.json({
      tableName: 'PurchaseOrder',
      columns: columnsResult.rows
    })

  } catch (error) {
    console.error('Error checking columns:', error)
    return NextResponse.json(
      { error: 'Failed to check columns', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}