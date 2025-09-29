import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    console.log('Creating compatibility tables and views...');
    
    // Create base tables if they don't exist
    await query(`
      CREATE TABLE IF NOT EXISTS public.jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_number VARCHAR(50),
        customer_id UUID,
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await query(`
      CREATE TABLE IF NOT EXISTS public.job_phases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID,
        name VARCHAR(100),
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await query(`
      CREATE TABLE IF NOT EXISTS public.customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_name VARCHAR(255),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        email VARCHAR(255),
        phone VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create PascalCase views
    await query(`
      CREATE OR REPLACE VIEW public."Job" AS 
      SELECT 
        id,
        job_number as "jobNumber",
        customer_id as "customerId",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM public.jobs
    `);
    
    await query(`
      CREATE OR REPLACE VIEW public."JobPhase" AS 
      SELECT 
        id,
        job_id as "jobId",
        name,
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM public.job_phases
    `);
    
    await query(`
      CREATE OR REPLACE VIEW public."Customer" AS 
      SELECT 
        id,
        company_name as "companyName",
        first_name as "firstName",
        last_name as "lastName",
        email,
        phone,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM public.customers
    `);
    
    // Check what we created
    const tables = await query(`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND (table_name IN ('jobs', 'job_phases', 'customers', 'Job', 'JobPhase', 'Customer'))
      ORDER BY table_name
    `);
    
    return NextResponse.json({
      success: true,
      message: 'Compatibility tables and views created successfully',
      created_tables: tables.rows
    });
    
  } catch (error: any) {
    console.error('Error creating compatibility tables:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      detail: error.detail || 'No details'
    }, { status: 500 });
  }
}