const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Running settings tables migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../src/lib/db-migrations/create-settings.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('Settings tables created successfully!');
    console.log('Tables created:');
    console.log('- CompanySettings');
    console.log('- UserNotificationSettings');
    console.log('- UserSecuritySettings');
    console.log('- UserAppearanceSettings');
    
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration();