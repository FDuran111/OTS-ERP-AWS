import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    console.log('Starting user role migration...')
    
    // First, let's see what roles we currently have
    const currentRoles = await query(`
      SELECT DISTINCT role, COUNT(*) as count 
      FROM "User" 
      GROUP BY role 
      ORDER BY role
    `)
    
    const beforeMigration = currentRoles.rows
    console.log('Current roles:', beforeMigration)
    
    // Check if migration is needed
    const needsMigration = beforeMigration.some(r => 
      ['OWNER', 'ADMIN', 'OFFICE', 'TECHNICIAN', 'VIEWER'].includes(r.role)
    )
    
    if (!needsMigration) {
      return NextResponse.json({
        success: true,
        message: 'Migration already completed',
        currentRoles: beforeMigration
      })
    }
    
    // Update the roles one by one to better handle errors
    let ownerAdminCount = 0
    let foremanCount = 0
    let employeeCount = 0
    const errors: string[] = []
    
    // Get all users that need updating
    const usersToUpdate = await query(`
      SELECT id, email, role 
      FROM "User" 
      WHERE role IN ('OWNER', 'ADMIN', 'OFFICE', 'TECHNICIAN', 'VIEWER')
    `)
    
    // Update each user individually
    for (const user of usersToUpdate.rows) {
      try {
        let newRole = ''
        
        if (user.role === 'OWNER' || user.role === 'ADMIN') {
          newRole = 'OWNER_ADMIN'
          ownerAdminCount++
        } else if (user.role === 'OFFICE') {
          newRole = 'FOREMAN'
          foremanCount++
        } else if (user.role === 'TECHNICIAN' || user.role === 'VIEWER') {
          newRole = 'EMPLOYEE'
          employeeCount++
        }
        
        if (newRole) {
          // Try direct update without trigger
          await query(`
            UPDATE "User" 
            SET role = $1::user_role
            WHERE id = $2
          `, [newRole, user.id])
          
          console.log(`Updated ${user.email} from ${user.role} to ${newRole}`)
        }
      } catch (err) {
        const errorMsg = `Failed to update ${user.email}: ${err instanceof Error ? err.message : 'Unknown error'}`
        console.error(errorMsg)
        errors.push(errorMsg)
      }
    }
    
    // Verify the migration
    const newRoles = await query(`
      SELECT DISTINCT role, COUNT(*) as count 
      FROM "User" 
      GROUP BY role 
      ORDER BY role
    `)
    
    // Get updated users list
    const users = await query(`
      SELECT email, name, role 
      FROM "User" 
      WHERE active = true 
      ORDER BY role, name
    `)
    
    const success = errors.length === 0
    
    return NextResponse.json({
      success,
      message: success ? 'User roles migrated successfully' : 'Migration completed with errors',
      beforeMigration,
      afterMigration: newRoles.rows,
      updatedUsers: users.rows,
      updates: {
        ownerAdmin: ownerAdminCount,
        foreman: foremanCount,
        employee: employeeCount
      },
      errors: errors.length > 0 ? errors : undefined
    })
    
  } catch (error) {
    console.error('Migration failed:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Migration failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}