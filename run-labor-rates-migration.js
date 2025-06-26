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
    
    console.log('Reading job labor rates migration file...');
    const migrationPath = path.join(__dirname, 'src/lib/db-migrations/create-job-labor-rates.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running job labor rates migration...');
    await client.query(migrationSQL);
    
    console.log('✅ Job labor rates migration completed successfully!');
    console.log('Created:');
    console.log('  - JobLaborRates table');
    console.log('  - JobLaborRatesWithDetails view');
    console.log('  - get_effective_labor_rate() function');
    console.log('  - calculate_job_labor_cost_with_overrides() function');
    console.log('  - Indexes and triggers');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();