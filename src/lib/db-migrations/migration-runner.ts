import { query } from '@/lib/db'
import fs from 'fs/promises'
import path from 'path'

interface Migration {
  id: string
  name: string
  sql: string
  checksum: string
}

export async function initMigrationTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS "_migrations" (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      success BOOLEAN DEFAULT true,
      error_message TEXT
    )
  `)
}

export async function getMigrationStatus(migrationId: string): Promise<boolean> {
  const result = await query(
    'SELECT success FROM "_migrations" WHERE id = $1',
    [migrationId]
  )
  return result.rows.length > 0 && result.rows[0].success
}

export async function recordMigration(
  migration: Migration,
  success: boolean,
  errorMessage?: string
) {
  await query(
    `INSERT INTO "_migrations" (id, name, checksum, success, error_message) 
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE 
     SET applied_at = CURRENT_TIMESTAMP, 
         success = $4, 
         error_message = $5`,
    [migration.id, migration.name, migration.checksum, success, errorMessage]
  )
}

export async function runMigration(migration: Migration) {
  console.log(`Running migration: ${migration.name}`)
  
  try {
    // Check if already applied successfully
    if (await getMigrationStatus(migration.id)) {
      console.log(`Migration ${migration.name} already applied successfully`)
      return
    }

    // Begin transaction
    await query('BEGIN')
    
    try {
      // Execute migration SQL
      await query(migration.sql)
      
      // Record success
      await recordMigration(migration, true)
      
      // Commit transaction
      await query('COMMIT')
      
      console.log(`Migration ${migration.name} completed successfully`)
    } catch (error) {
      // Rollback on error
      await query('ROLLBACK')
      throw error
    }
  } catch (error: any) {
    console.error(`Migration ${migration.name} failed:`, error.message)
    
    // Record failure
    await recordMigration(migration, false, error.message)
    
    throw error
  }
}

export async function loadMigrationsFromDirectory(dir: string): Promise<Migration[]> {
  const files = await fs.readdir(dir)
  const sqlFiles = files.filter(f => f.endsWith('.sql')).sort()
  
  const migrations: Migration[] = []
  
  for (const file of sqlFiles) {
    const filePath = path.join(dir, file)
    const sql = await fs.readFile(filePath, 'utf-8')
    
    // Generate checksum for change detection
    const checksum = require('crypto')
      .createHash('md5')
      .update(sql)
      .digest('hex')
    
    migrations.push({
      id: file.replace('.sql', ''),
      name: file,
      sql,
      checksum
    })
  }
  
  return migrations
}

export async function runAllMigrations() {
  try {
    // Initialize migration table
    await initMigrationTable()
    
    // Load all migrations
    const migrationsDir = path.join(process.cwd(), 'src/lib/db-migrations')
    const migrations = await loadMigrationsFromDirectory(migrationsDir)
    
    console.log(`Found ${migrations.length} migration files`)
    
    // Run each migration
    for (const migration of migrations) {
      await runMigration(migration)
    }
    
    console.log('All migrations completed')
  } catch (error) {
    console.error('Migration runner failed:', error)
    throw error
  }
}