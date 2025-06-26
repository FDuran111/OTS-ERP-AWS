const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  // Read DATABASE_URL from .env.local
  const envPath = path.join(__dirname, '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const databaseUrl = envContent.split('\n')
    .find(line => line.startsWith('DATABASE_URL='))
    ?.split('=')[1]
    ?.replace(/"/g, '');

  if (!databaseUrl) {
    throw new Error('DATABASE_URL not found in .env.local');
  }

  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Read and execute migration
    const migrationPath = path.join(__dirname, 'src/lib/db-migrations/create-customer-portal-minimal.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running customer portal migration...');
    await client.query(migrationSQL);
    console.log('Migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();