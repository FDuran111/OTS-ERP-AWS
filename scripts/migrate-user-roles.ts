import { query } from '../src/lib/db'

/**
 * Migration script to update user roles from the old 5-role system to the new 3-role system
 * 
 * Old roles -> New roles mapping:
 * - OWNER -> OWNER_ADMIN
 * - ADMIN -> OWNER_ADMIN
 * - OFFICE -> FOREMAN
 * - TECHNICIAN -> EMPLOYEE
 * - VIEWER -> EMPLOYEE
 */

async function migrateUserRoles() {
  console.log('Starting user role migration...')
  
  try {
    // Start transaction
    await query('BEGIN')
    
    // First, let's see what roles we currently have
    const currentRoles = await query(`
      SELECT DISTINCT role, COUNT(*) as count 
      FROM "User" 
      GROUP BY role 
      ORDER BY role
    `)
    
    console.log('Current role distribution:')
    currentRoles.rows.forEach(row => {
      console.log(`  ${row.role}: ${row.count} users`)
    })
    
    // Update OWNER and ADMIN to OWNER_ADMIN
    const ownerAdminUpdate = await query(`
      UPDATE "User" 
      SET role = 'OWNER_ADMIN' 
      WHERE role IN ('OWNER', 'ADMIN')
    `)
    console.log(`Updated ${ownerAdminUpdate.rowCount} users to OWNER_ADMIN`)
    
    // Update OFFICE to FOREMAN
    const foremanUpdate = await query(`
      UPDATE "User" 
      SET role = 'FOREMAN' 
      WHERE role = 'OFFICE'
    `)
    console.log(`Updated ${foremanUpdate.rowCount} users to FOREMAN`)
    
    // Update TECHNICIAN and VIEWER to EMPLOYEE
    const employeeUpdate = await query(`
      UPDATE "User" 
      SET role = 'EMPLOYEE' 
      WHERE role IN ('TECHNICIAN', 'VIEWER')
    `)
    console.log(`Updated ${employeeUpdate.rowCount} users to EMPLOYEE`)
    
    // Verify the migration
    const newRoles = await query(`
      SELECT DISTINCT role, COUNT(*) as count 
      FROM "User" 
      GROUP BY role 
      ORDER BY role
    `)
    
    console.log('\nNew role distribution:')
    newRoles.rows.forEach(row => {
      console.log(`  ${row.role}: ${row.count} users`)
    })
    
    // Show specific users and their new roles
    const users = await query(`
      SELECT email, name, role 
      FROM "User" 
      WHERE active = true 
      ORDER BY role, name
    `)
    
    console.log('\nUpdated user roles:')
    users.rows.forEach(user => {
      console.log(`  ${user.email} (${user.name}): ${user.role}`)
    })
    
    // Commit transaction
    await query('COMMIT')
    console.log('\nMigration completed successfully!')
    
  } catch (error) {
    // Rollback on error
    await query('ROLLBACK')
    console.error('Migration failed:', error)
    throw error
  }
}

// Run the migration
migrateUserRoles()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })