#!/usr/bin/env npx tsx

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { query } from './db'
import { readFileSync } from 'fs'
import { join } from 'path'

async function runMigration() {
  try {
    console.log('Running QuickBooks integration migration...')
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set')
    
    const migrationPath = join(process.cwd(), 'src', 'lib', 'db-migrations', 'create-quickbooks-integration.sql')
    const sql = readFileSync(migrationPath, 'utf8')
    
    // Execute the entire migration as one statement
    console.log('Executing QuickBooks integration migration...')
    await query(sql)
    
    console.log('✅ QuickBooks integration migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

runMigration().then(() => process.exit(0))