#!/usr/bin/env tsx
import { Pool } from 'pg';

// Tables to validate
const TABLES_TO_CHECK = [
  'User',
  'Customer',
  'Job',
  'Material',
  'Invoice',
  'TimeEntry',
  'Equipment',
  'FileAttachment',
  'Settings'
];

// Create connection pools
function createSupabasePool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL is required for Supabase connection');
    process.exit(1);
  }
  
  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 5,
    connectionTimeoutMillis: 10000,
  });
}

function createRDSPool(): Pool {
  const endpoint = process.env.RDS_PROXY_ENDPOINT;
  const database = process.env.RDS_DB || 'ortmeier';
  const user = process.env.RDS_USER || 'otsapp';
  const password = process.env.RDS_PASSWORD;
  
  if (!endpoint) {
    console.error('❌ RDS_PROXY_ENDPOINT is required for RDS connection');
    process.exit(1);
  }
  
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
}

// Get row count for a table
async function getTableCount(pool: Pool, tableName: string): Promise<number | null> {
  try {
    const result = await pool.query(`SELECT COUNT(*) FROM "${tableName}"`);
    return parseInt(result.rows[0].count);
  } catch (error) {
    // Table might not exist
    return null;
  }
}

// Calculate discrepancy percentage
function calculateDiscrepancy(supabaseCount: number, rdsCount: number): number {
  if (supabaseCount === 0 && rdsCount === 0) return 0;
  if (supabaseCount === 0) return 100;
  return Math.abs((rdsCount - supabaseCount) / supabaseCount * 100);
}

// Main validation
async function validateData() {
  console.log('🔍 Data Validation: Supabase → RDS');
  console.log('=====================================\n');
  
  const supabasePool = createSupabasePool();
  const rdsPool = createRDSPool();
  
  let hasDiscrepancy = false;
  const results: Array<{
    table: string;
    supabase: number | null;
    rds: number | null;
    discrepancy: number;
    status: string;
  }> = [];
  
  try {
    // Test connections
    console.log('📡 Testing connections...');
    await supabasePool.query('SELECT 1');
    console.log('✅ Supabase connection successful');
    
    await rdsPool.query('SELECT 1');
    console.log('✅ RDS connection successful\n');
    
    // Check each table
    console.log('📊 Comparing table row counts:\n');
    console.log('Table               | Supabase | RDS      | Status');
    console.log('--------------------|----------|----------|----------');
    
    for (const table of TABLES_TO_CHECK) {
      const supabaseCount = await getTableCount(supabasePool, table);
      const rdsCount = await getTableCount(rdsPool, table);
      
      let status = '✅ Match';
      let discrepancy = 0;
      
      if (supabaseCount === null && rdsCount === null) {
        status = '⚠️  Missing';
      } else if (supabaseCount === null) {
        status = '❌ Not in Supabase';
        hasDiscrepancy = true;
      } else if (rdsCount === null) {
        status = '❌ Not in RDS';
        hasDiscrepancy = true;
      } else {
        discrepancy = calculateDiscrepancy(supabaseCount, rdsCount);
        if (discrepancy > 2) {
          status = `❌ ${discrepancy.toFixed(1)}% diff`;
          hasDiscrepancy = true;
        } else if (discrepancy > 0) {
          status = `⚠️  ${discrepancy.toFixed(1)}% diff`;
        }
      }
      
      const supabaseStr = supabaseCount !== null ? supabaseCount.toString() : 'N/A';
      const rdsStr = rdsCount !== null ? rdsCount.toString() : 'N/A';
      
      console.log(
        `${table.padEnd(19)} | ${supabaseStr.padEnd(8)} | ${rdsStr.padEnd(8)} | ${status}`
      );
      
      results.push({
        table,
        supabase: supabaseCount,
        rds: rdsCount,
        discrepancy,
        status
      });
    }
    
    console.log('\n=====================================');
    
    // Summary
    const totalSupabase = results.reduce((sum, r) => sum + (r.supabase || 0), 0);
    const totalRDS = results.reduce((sum, r) => sum + (r.rds || 0), 0);
    const totalDiscrepancy = calculateDiscrepancy(totalSupabase, totalRDS);
    
    console.log('📈 Summary:');
    console.log(`  Total Supabase rows: ${totalSupabase.toLocaleString()}`);
    console.log(`  Total RDS rows: ${totalRDS.toLocaleString()}`);
    console.log(`  Overall discrepancy: ${totalDiscrepancy.toFixed(2)}%`);
    
    if (hasDiscrepancy) {
      console.log('\n❌ Validation FAILED - Significant discrepancies detected');
      console.log('   Review the differences and investigate missing data');
      process.exit(1);
    } else {
      console.log('\n✅ Validation PASSED - Data migration successful');
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await supabasePool.end();
    await rdsPool.end();
  }
}

// Run validation
validateData().catch(console.error);