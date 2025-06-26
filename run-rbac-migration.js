const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Database configuration
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    console.log('Connecting to database...');
    await client.connect();
    
    console.log('Reading RBAC system migration file...');
    const migrationPath = path.join(__dirname, 'src/lib/db-migrations/create-rbac-system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running RBAC system migration...');
    await client.query(migrationSQL);
    
    console.log('✅ RBAC system migration completed successfully!');
    console.log('Created:');
    console.log('  - Updated User table with proper role field');
    console.log('  - UserPermissions table for fine-grained access control');
    console.log('  - RoleHierarchy table for role inheritance');
    console.log('  - UserAuditLog table for security audit trail');
    console.log('  - user_has_permission() function for permission checking');
    console.log('  - get_user_effective_role() function');
    console.log('  - log_user_action() function for audit logging');
    console.log('  - UserPermissionsView for easy permission queries');
    console.log('  - Role change audit triggers');
    console.log('  - Test users for each role type');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();