#!/usr/bin/env node

/**
 * Database Seed Script - Test Users for RBAC System
 * Creates 5 test users with different roles for the Ortmeier job management system
 * 
 * Usage: node create-test-users.js
 * 
 * Test Users:
 * - Tim Ortmeier (OWNER): tim@ortmeier.com
 * - Tim's Son (ADMIN): son@ortmeier.com  
 * - Rachel (OFFICE): rachel@ortmeier.com
 * - Mike (TECHNICIAN): mike@ortmeier.com
 * - Viewer Joe (VIEWER): viewer@ortmeier.com
 * 
 * All users have password: Test1234!
 */

const bcrypt = require('bcryptjs')
const { Client } = require('pg')
const fs = require('fs')

// Test users configuration
const TEST_USERS = [
  {
    id: 'tim-ortmeier-owner',
    email: 'tim@ortmeier.com',
    name: 'Tim Ortmeier',
    role: 'OWNER',
    phone: '(555) 123-4567'
  },
  {
    id: 'tim-son-admin', 
    email: 'son@ortmeier.com',
    name: "Tim's Son",
    role: 'ADMIN',
    phone: '(555) 123-4568'
  },
  {
    id: 'rachel-office',
    email: 'rachel@ortmeier.com', 
    name: 'Rachel',
    role: 'OFFICE',
    phone: '(555) 123-4569'
  },
  {
    id: 'mike-technician',
    email: 'mike@ortmeier.com',
    name: 'Mike', 
    role: 'TECHNICIAN',
    phone: '(555) 123-4570'
  },
  {
    id: 'viewer-joe',
    email: 'viewer@ortmeier.com',
    name: 'Viewer Joe',
    role: 'VIEWER', 
    phone: '(555) 123-4571'
  }
]

const DEFAULT_PASSWORD = 'Test1234!'

/**
 * Get database URL from environment
 */
function getDatabaseUrl() {
  // Try from environment variable first
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL
  }
  
  // Try from .env.local file
  try {
    const envContent = fs.readFileSync('.env.local', 'utf8')
    const databaseUrl = envContent.split('\n')
      .find(line => line.startsWith('DATABASE_URL='))
      ?.split('=')[1]
      ?.replace(/"/g, '')
    
    if (databaseUrl) {
      return databaseUrl
    }
  } catch (error) {
    // .env.local doesn't exist or can't be read
  }
  
  throw new Error('DATABASE_URL not found in environment variables or .env.local')
}

/**
 * Hash password using bcrypt with same settings as auth system
 */
async function hashPassword(password) {
  return await bcrypt.hash(password, 12)
}

/**
 * Check if user already exists by email
 */
async function userExists(client, email) {
  try {
    const result = await client.query(
      'SELECT id FROM "User" WHERE email = $1',
      [email]
    )
    return result.rows.length > 0
  } catch (error) {
    console.error(`Error checking if user exists for ${email}:`, error)
    return false
  }
}

/**
 * Insert a single user into the database
 */
async function insertUser(client, user, hashedPassword) {
  try {
    const result = await client.query(
      `INSERT INTO "User" (
        id, email, name, password, role, phone, active, 
        "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      ) RETURNING id, email, name, role`,
      [
        user.id,
        user.email,
        user.name,
        hashedPassword,
        user.role,
        user.phone || null,
        true, // active
        new Date(),
        new Date()
      ]
    )
    
    console.log(`✅ Created user: ${result.rows[0].name} (${result.rows[0].email}) - Role: ${result.rows[0].role}`)
    return result.rows[0]
  } catch (error) {
    console.error(`❌ Failed to create user ${user.name} (${user.email}):`, error.message)
    throw error
  }
}

/**
 * Log user creation in audit log (if table exists)
 */
async function logUserCreation(client, user, createdBy = 'system') {
  try {
    await client.query(
      `INSERT INTO "UserAuditLog" (
        user_id, performed_by, action, resource, new_value, 
        ip_address, user_agent, timestamp, metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      )`,
      [
        user.id,
        createdBy,
        'user_created',
        'user_management',
        `Created test user with role ${user.role}`,
        '127.0.0.1', // localhost
        'Test User Seed Script',
        new Date(),
        JSON.stringify({
          source: 'seed_script',
          test_user: true,
          email: user.email,
          role: user.role
        })
      ]
    )
  } catch (error) {
    console.warn(`⚠️  Could not log user creation for ${user.email}:`, error.message)
    // Don't fail the whole process if audit logging fails
  }
}

/**
 * Verify database connection and required tables
 */
async function verifyDatabase(client) {
  try {
    // Check if User table exists with role column
    const tableCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name IN ('id', 'email', 'name', 'password', 'role', 'active')
      ORDER BY column_name
    `)
    
    if (tableCheck.rows.length < 6) {
      throw new Error('User table missing required columns. Please run RBAC migration first.')
    }
    
    // Check if user_role_new enum exists
    const enumCheck = await client.query(`
      SELECT enumlabel 
      FROM pg_enum e 
      JOIN pg_type t ON e.enumtypid = t.oid 
      WHERE t.typname = 'user_role_new'
    `)
    
    if (enumCheck.rows.length === 0) {
      throw new Error('user_role_new enum not found. Please run RBAC migration first.')
    }
    
    console.log('✅ Database schema verification passed')
    return true
    
  } catch (error) {
    console.error('❌ Database schema verification failed:', error.message)
    console.error('\n💡 Please ensure the RBAC migration has been run first:')
    console.error('   node run-migration.js')
    throw error
  }
}

/**
 * Main function to create all test users
 */
async function createTestUsers() {
  console.log('🚀 Starting test user creation for Ortmeier RBAC system...\n')
  
  const databaseUrl = getDatabaseUrl()
  const client = new Client({ 
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  })
  
  try {
    // Connect to database
    await client.connect()
    console.log('📊 Connected to database')
    
    // Verify database schema
    await verifyDatabase(client)
    
    // Hash the default password once
    console.log('🔐 Hashing default password...')
    const hashedPassword = await hashPassword(DEFAULT_PASSWORD)
    
    let created = 0
    let skipped = 0
    
    // Process each user
    for (const user of TEST_USERS) {
      console.log(`\n👤 Processing user: ${user.name} (${user.email})`)
      
      // Check if user already exists
      if (await userExists(client, user.email)) {
        console.log(`⏭️  User already exists, skipping...`)
        skipped++
        continue
      }
      
      // Create user
      const createdUser = await insertUser(client, user, hashedPassword)
      
      // Log creation in audit trail
      await logUserCreation(client, createdUser)
      
      created++
    }
    
    console.log('\n🎉 Test user creation completed!')
    console.log(`📈 Summary: ${created} users created, ${skipped} users skipped (already existed)`)
    
    if (created > 0) {
      console.log('\n🔑 Login Information:')
      console.log('Password for all test users: Test1234!')
      console.log('\n👥 Available test users:')
      TEST_USERS.forEach(user => {
        console.log(`  • ${user.name} (${user.role}): ${user.email}`)
      })
      
      console.log('\n📋 Role Permissions:')
      console.log('  • OWNER: Full system access, all operations')
      console.log('  • ADMIN: Operational control, can delete jobs/customers') 
      console.log('  • OFFICE: Customer/job management, reporting, settings')
      console.log('  • TECHNICIAN: Limited job access, time tracking, material viewing')
      console.log('  • VIEWER: Read-only access to jobs and dashboard')
      
      console.log('\n🌐 You can now test the RBAC system by logging in with any of these users!')
    }
    
  } catch (error) {
    console.error('\n❌ Error creating test users:', error)
    process.exit(1)
  } finally {
    await client.end()
    console.log('\n📊 Database connection closed')
  }
}

// Execute if run directly
if (require.main === module) {
  createTestUsers()
}

module.exports = { createTestUsers, TEST_USERS, DEFAULT_PASSWORD }