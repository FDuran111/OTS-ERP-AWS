const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Read migration file
    const migrationPath = path.join(__dirname, 'src/lib/db-migrations/add-job-division.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Run migration
    await client.query(migrationSQL);
    console.log('Migration completed successfully');

    // Verify the column was added
    const result = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'Job' AND column_name = 'division'
    `);

    if (result.rows.length > 0) {
      console.log('Division column added successfully:', result.rows[0]);
    }

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

runMigration();