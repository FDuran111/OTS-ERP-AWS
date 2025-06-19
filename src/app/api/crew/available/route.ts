import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET available crew members for a date range
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate') || startDate

    if (!startDate) {
      return NextResponse.json(
        { error: 'Start date is required' },
        { status: 400 }
      )
    }

    // Use the database function to get available crew with conflict counts
    const result = await query(`
      SELECT * FROM get_available_crew($1::timestamp, $2::timestamp)
    `, [startDate, endDate])

    const availableCrew = result.rows.map(row => ({
      id: row.user_id,
      name: row.user_name,
      email: row.user_email,
      role: row.user_role,
      conflicts: parseInt(row.conflicts) || 0
    }))

    return NextResponse.json(availableCrew)
  } catch (error) {
    console.error('Error fetching available crew:', error)
    return NextResponse.json(
      { error: 'Failed to fetch available crew' },
      { status: 500 }
    )
  }
}