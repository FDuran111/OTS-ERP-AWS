import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xudcmdliqyarbfdqufbq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1ZGNtZGxpcXlhcmJmZHF1ZmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI4OTY4OTYsImV4cCI6MjA0ODQ3Mjg5Nn0.Vn6S3VY_gCQHnxC9kbbJYLpLGvGkjN-OJU7EjMzKaGk';

export async function GET() {
  try {
    console.log('Starting Supabase to RDS data migration...');
    
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const results: any = {
      customers: { migrated: 0, errors: 0 },
      jobs: { migrated: 0, errors: 0 },
      job_phases: { migrated: 0, errors: 0 }
    };
    
    // Migrate Customers
    console.log('Migrating customers...');
    const { data: customers, error: customersError } = await supabase
      .from('Customer')
      .select('*')
      .order('createdAt', { ascending: true });
    
    if (customersError) {
      console.error('Error fetching Supabase customers:', customersError);
      results.customers.error = customersError.message;
    } else if (customers && customers.length > 0) {
      for (const customer of customers) {
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
            customer.companyName || '',
            customer.firstName || '',
            customer.lastName || '',
            customer.email || '',
            customer.phone || '',
            customer.createdAt || new Date(),
            customer.updatedAt || new Date()
          ]);
          results.customers.migrated++;
        } catch (err: any) {
          console.error(`Error migrating customer ${customer.id}:`, err.message);
          results.customers.errors++;
        }
      }
    }
    
    // Migrate Jobs
    console.log('Migrating jobs...');
    const { data: jobs, error: jobsError } = await supabase
      .from('Job')
      .select('*')
      .order('createdAt', { ascending: true });
    
    if (jobsError) {
      console.error('Error fetching Supabase jobs:', jobsError);
      results.jobs.error = jobsError.message;
    } else if (jobs && jobs.length > 0) {
      for (const job of jobs) {
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
            job.jobNumber || job.id.substring(0, 8),
            job.customerId || null,
            job.status || 'pending',
            job.createdAt || new Date(),
            job.updatedAt || new Date()
          ]);
          results.jobs.migrated++;
        } catch (err: any) {
          console.error(`Error migrating job ${job.id}:`, err.message);
          results.jobs.errors++;
        }
      }
    }
    
    // Migrate Job Phases
    console.log('Migrating job phases...');
    const { data: phases, error: phasesError } = await supabase
      .from('JobPhase')
      .select('*')
      .order('createdAt', { ascending: true });
    
    if (phasesError) {
      console.error('Error fetching Supabase job phases:', phasesError);
      results.job_phases.error = phasesError.message;
    } else if (phases && phases.length > 0) {
      for (const phase of phases) {
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
            phase.jobId || null,
            phase.name || 'Unnamed Phase',
            phase.status || 'pending',
            phase.createdAt || new Date(),
            phase.updatedAt || new Date()
          ]);
          results.job_phases.migrated++;
        } catch (err: any) {
          console.error(`Error migrating phase ${phase.id}:`, err.message);
          results.job_phases.errors++;
        }
      }
    }
    
    // Get final counts
    const customerCount = await query('SELECT COUNT(*) FROM customers');
    const jobCount = await query('SELECT COUNT(*) FROM jobs');
    const phaseCount = await query('SELECT COUNT(*) FROM job_phases');
    
    return NextResponse.json({
      success: true,
      message: 'Data migration completed',
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