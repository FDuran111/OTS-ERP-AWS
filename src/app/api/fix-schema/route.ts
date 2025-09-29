import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    console.log('Fixing schema - dropping and recreating tables/views...');
    
    // First check what exists
    const existing = await query(`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('Job', 'JobPhase', 'Customer', 'jobs', 'job_phases', 'customers')
      ORDER BY table_name
    `);
    
    console.log('Existing objects:', existing.rows);
    
    // Drop existing views/tables if they exist
    const dropStatements = [
      'DROP VIEW IF EXISTS public."Job" CASCADE',
      'DROP VIEW IF EXISTS public."JobPhase" CASCADE',
      'DROP VIEW IF EXISTS public."Customer" CASCADE',
      'DROP TABLE IF EXISTS public."Job" CASCADE',
      'DROP TABLE IF EXISTS public."JobPhase" CASCADE',
      'DROP TABLE IF EXISTS public."Customer" CASCADE',
      'DROP TABLE IF EXISTS public.jobs CASCADE',
      'DROP TABLE IF EXISTS public.job_phases CASCADE',
      'DROP TABLE IF EXISTS public.customers CASCADE'
    ];
    
    for (const stmt of dropStatements) {
      try {
        await query(stmt);
        console.log(`Executed: ${stmt}`);
      } catch (e: any) {
        console.log(`Skipped: ${stmt} - ${e.message}`);
      }
    }
    
    // Create base tables
    await query(`
      CREATE TABLE public.jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_number VARCHAR(50),
        customer_id UUID,
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await query(`
      CREATE TABLE public.job_phases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID,
        name VARCHAR(100),
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await query(`
      CREATE TABLE public.customers (
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
      CREATE VIEW public."Job" AS 
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
      CREATE VIEW public."JobPhase" AS 
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
      CREATE VIEW public."Customer" AS 
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
    const finalCheck = await query(`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('Job', 'JobPhase', 'Customer', 'jobs', 'job_phases', 'customers')
      ORDER BY table_type, table_name
    `);
    
    return NextResponse.json({
      success: true,
      message: 'Schema fixed - tables and views created',
      before: existing.rows,
      after: finalCheck.rows
    });
    
  } catch (error: any) {
    console.error('Error fixing schema:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      detail: error.detail || 'No details'
    }, { status: 500 });
  }
}