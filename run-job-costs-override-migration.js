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
    
    console.log('Reading job costs labor rate override migration file...');
    const migrationPath = path.join(__dirname, 'src/lib/db-migrations/update-job-costs-labor-rate-overrides.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running job costs labor rate override migration...');
    await client.query(migrationSQL);
    
    console.log('✅ Job costs labor rate override migration completed successfully!');
    console.log('Updated:');
    console.log('  - add_labor_cost_from_time_entry() function to use rate overrides');
    console.log('  - Labor cost calculations now consider job-specific overrides');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();