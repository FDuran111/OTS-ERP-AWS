import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Check current roles
    const currentRoles = await query(`
      SELECT DISTINCT role, COUNT(*) as count 
      FROM "User" 
      GROUP BY role 
      ORDER BY role
    `)
    
    // Check enum values
    const enumValues = await query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'user_role'
      )
      ORDER BY enumsortorder
    `)
    
    // Check a sample of users
    const users = await query(`
      SELECT email, name, role 
      FROM "User" 
      WHERE active = true 
      ORDER BY role, name
      LIMIT 20
    `)
    
    return NextResponse.json({
      currentRoleDistribution: currentRoles.rows,
      availableEnumValues: enumValues.rows.map(r => r.enumlabel),
      sampleUsers: users.rows
    })
    
  } catch (error) {
    console.error('Check failed:', error)
    
    return NextResponse.json(
      { 
        error: 'Check failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}