import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xudcmdliqyarbfdqufbq.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1ZGNtZGxpcXlhcmJmZHF1ZmJxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjg5Njg5NiwiZXhwIjoyMDQ4NDcyODk2fQ.FLdvPmxq5Sx0p-q8NVywIu2ECRFYm7_YisYAflqSQlU';

export async function GET() {
  try {
    console.log('Starting real Supabase to RDS data migration...');
    
    // Use direct PostgreSQL connection for better compatibility
    const { Client } = require('pg');
    const sourceClient = new Client({
      connectionString: 'postgresql://postgres.xudcmdliqyarbfdqufbq:tucbE1-dumqap-cynpyx@aws-0-us-east-1.pooler.supabase.com:6543/postgres',
      ssl: { rejectUnauthorized: false }
    });
    
    await sourceClient.connect();
    
    const results: any = {
      customers: { migrated: 0, errors: 0, data: [] },
      jobs: { migrated: 0, errors: 0, data: [] },
      job_phases: { migrated: 0, errors: 0, data: [] }
    };
    
    // First, check what tables exist in Supabase
    const tablesResult = await sourceClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('Supabase tables:', tablesResult.rows.map((r: any) => r.table_name));
    results.supabase_tables = tablesResult.rows.map((r: any) => r.table_name);
    
    // Try to fetch Customer/customers data
    const customerTables = ['Customer', 'customer', 'customers'];
    for (const tableName of customerTables) {
      try {
        const customersResult = await sourceClient.query(`SELECT * FROM public."${tableName}" LIMIT 100`);
        if (customersResult.rows.length > 0) {
          console.log(`Found ${customersResult.rows.length} customers in ${tableName}`);
          results.customers.source_table = tableName;
          results.customers.data = customersResult.rows;
          
          // Migrate customers
          for (const customer of customersResult.rows) {
            try {
              await query(`
                INSERT INTO customers (
                  id, company_name, first_name, last_name, 
                  email, phone, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (id) DO UPDATE SET
                  company_name = EXCLUDED.company_name,
                  first_name = EXCLUDED.first_name,
                  last_name = EXCLUDED.last_name,
                  email = EXCLUDED.email,
                  phone = EXCLUDED.phone,
                  updated_at = EXCLUDED.updated_at
              `, [
                customer.id,
                customer.companyName || customer.company_name || '',
                customer.firstName || customer.first_name || '',
                customer.lastName || customer.last_name || '',
                customer.email || '',
                customer.phone || '',
                customer.createdAt || customer.created_at || new Date(),
                customer.updatedAt || customer.updated_at || new Date()
              ]);
              results.customers.migrated++;
            } catch (err: any) {
              console.error(`Error migrating customer:`, err.message);
              results.customers.errors++;
            }
          }
          break;
        }
      } catch (err) {
        // Table doesn't exist, try next
      }
    }
    
    // Try to fetch Job/jobs data
    const jobTables = ['Job', 'job', 'jobs'];
    for (const tableName of jobTables) {
      try {
        const jobsResult = await sourceClient.query(`SELECT * FROM public."${tableName}" LIMIT 100`);
        if (jobsResult.rows.length > 0) {
          console.log(`Found ${jobsResult.rows.length} jobs in ${tableName}`);
          results.jobs.source_table = tableName;
          results.jobs.data = jobsResult.rows;
          
          // Migrate jobs
          for (const job of jobsResult.rows) {
            try {
              await query(`
                INSERT INTO jobs (
                  id, job_number, customer_id, status, 
                  created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (id) DO UPDATE SET
                  job_number = EXCLUDED.job_number,
                  customer_id = EXCLUDED.customer_id,
                  status = EXCLUDED.status,
                  updated_at = EXCLUDED.updated_at
              `, [
                job.id,
                job.jobNumber || job.job_number || job.id.substring(0, 8),
                job.customerId || job.customer_id || null,
                job.status || 'pending',
                job.createdAt || job.created_at || new Date(),
                job.updatedAt || job.updated_at || new Date()
              ]);
              results.jobs.migrated++;
            } catch (err: any) {
              console.error(`Error migrating job:`, err.message);
              results.jobs.errors++;
            }
          }
          break;
        }
      } catch (err) {
        // Table doesn't exist, try next
      }
    }
    
    // Try to fetch JobPhase/job_phases data
    const phaseTables = ['JobPhase', 'job_phase', 'job_phases'];
    for (const tableName of phaseTables) {
      try {
        const phasesResult = await sourceClient.query(`SELECT * FROM public."${tableName}" LIMIT 200`);
        if (phasesResult.rows.length > 0) {
          console.log(`Found ${phasesResult.rows.length} phases in ${tableName}`);
          results.job_phases.source_table = tableName;
          results.job_phases.data = phasesResult.rows;
          
          // Migrate phases
          for (const phase of phasesResult.rows) {
            try {
              await query(`
                INSERT INTO job_phases (
                  id, job_id, name, status,
                  created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (id) DO UPDATE SET
                  job_id = EXCLUDED.job_id,
                  name = EXCLUDED.name,
                  status = EXCLUDED.status,
                  updated_at = EXCLUDED.updated_at
              `, [
                phase.id,
                phase.jobId || phase.job_id || null,
                phase.name || 'Unnamed Phase',
                phase.status || 'pending',
                phase.createdAt || phase.created_at || new Date(),
                phase.updatedAt || phase.updated_at || new Date()
              ]);
              results.job_phases.migrated++;
            } catch (err: any) {
              console.error(`Error migrating phase:`, err.message);
              results.job_phases.errors++;
            }
          }
          break;
        }
      } catch (err) {
        // Table doesn't exist, try next
      }
    }
    
    await sourceClient.end();
    
    // Get final counts
    const customerCount = await query('SELECT COUNT(*) FROM customers');
    const jobCount = await query('SELECT COUNT(*) FROM jobs');
    const phaseCount = await query('SELECT COUNT(*) FROM job_phases');
    
    return NextResponse.json({
      success: true,
      message: 'Real data migration completed',
      results,
      finalCounts: {
        customers: customerCount.rows[0].count,
        jobs: jobCount.rows[0].count,
        job_phases: phaseCount.rows[0].count
      }
    });
    
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      detail: error.detail || 'No details'
    }, { status: 500 });
  }
}