#!/usr/bin/env tsx
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// Parse CLI arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const shouldVerify = args.includes('--verify');
const shouldSeed = args.includes('--seed');

// Database connection configuration
function createPool(): Pool {
  const dbDriver = (process.env.DB_DRIVER || 'SUPABASE').toUpperCase();
  
  if (dbDriver === 'RDS') {
    const endpoint = process.env.RDS_PROXY_ENDPOINT;
    const database = process.env.RDS_DB || 'ortmeier';
    const user = process.env.RDS_USER || 'otsapp';
    const password = process.env.RDS_PASSWORD;
    
    if (!endpoint) {
      console.error('❌ RDS_PROXY_ENDPOINT is required when DB_DRIVER=RDS');
      process.exit(1);
    }
    
    console.log(`📡 Connecting to RDS via proxy: ${endpoint}`);
    return new Pool({
      host: endpoint,
      port: 5432,
      database,
      user,
      password,
      ssl: { rejectUnauthorized: false },
      max: 5,
      connectionTimeoutMillis: 10000,
    });
  } else {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.error('❌ DATABASE_URL is required when DB_DRIVER=SUPABASE');
      process.exit(1);
    }
    
    console.log('📡 Connecting via DATABASE_URL');
    return new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
      connectionTimeoutMillis: 10000,
    });
  }
}

// Get migration files
function getMigrationFiles(): string[] {
  const migrationsDir = path.join(process.cwd(), 'src/lib/db-migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.error(`❌ Migrations directory not found: ${migrationsDir}`);
    return [];
  }
  
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort(); // Lexicographic order
  
  return files.map(f => path.join(migrationsDir, f));
}

// Run a single migration file
async function runMigration(pool: Pool, filePath: string): Promise<boolean> {
  const fileName = path.basename(filePath);
  
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    
    if (isDryRun) {
      console.log(`[DRY] ${fileName} - Would execute ${sql.length} characters`);
      return true;
    }
    
    await pool.query(sql);
    console.log(`[OK] ${fileName}`);
    return true;
  } catch (error) {
    console.error(`[FAIL] ${fileName}: ${error.message}`);
    return false;
  }
}

// Run seed file
async function runSeed(pool: Pool): Promise<void> {
  const seedFile = path.join(process.cwd(), 'scripts/seed-db.sql');
  
  if (!fs.existsSync(seedFile)) {
    console.warn('⚠️  Seed file not found: scripts/seed-db.sql');
    return;
  }
  
  console.log('\n🌱 Running seed data...');
  const success = await runMigration(pool, seedFile);
  if (!success && !isDryRun) {
    console.error('❌ Seed failed');
    process.exit(1);
  }
}

// Verify table counts
async function verifyTables(pool: Pool): Promise<void> {
  console.log('\n📊 Verifying table counts...');
  
  const tables = [
    'User',
    'Customer', 
    'Job',
    'Material',
    'Invoice',
    'Settings',
    'Equipment',
    'TimeEntry',
    'FileAttachment'
  ];
  
  for (const table of tables) {
    try {
      const result = await pool.query(`SELECT COUNT(*) FROM "${table}"`);
      const count = result.rows[0].count;
      console.log(`  ${table}: ${count} rows`);
    } catch (error) {
      console.log(`  ${table}: ❌ Table not found`);
    }
  }
}

// Main execution
async function main() {
  console.log('🔧 Database Migration Runner');
  console.log('============================');
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  const pool = createPool();
  
  try {
    // Test connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful\n');
    
    // Get and run migrations
    const migrationFiles = getMigrationFiles();
    
    if (migrationFiles.length === 0) {
      console.warn('⚠️  No migration files found');
    } else {
      console.log(`📁 Found ${migrationFiles.length} migration files\n`);
      
      let failCount = 0;
      for (const file of migrationFiles) {
        const success = await runMigration(pool, file);
        if (!success) failCount++;
      }
      
      if (failCount > 0 && !isDryRun) {
        console.error(`\n❌ ${failCount} migrations failed`);
        process.exit(1);
      }
    }
    
    // Run seed if requested
    if (shouldSeed) {
      await runSeed(pool);
    }
    
    // Verify if requested
    if (shouldVerify && !isDryRun) {
      await verifyTables(pool);
    }
    
    console.log('\n✨ Migration complete');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run
main().catch(console.error);